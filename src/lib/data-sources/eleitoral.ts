/**
 * Camada eleitoral unificada. Fonte: brasil.io (espelho do TSE, todos os cargos).
 * Tudo que vem do brasil.io é cacheado no Neon — o request path do usuário só lê do banco.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { candidacies, electoralResults, candidateSearchCache } from "@/db/schema";
import {
  hasBrasilioToken,
  buscarCandidatosPorNome,
  votacaoDoCandidato,
  BrasilioThrottled,
  type BioCandidato,
} from "@/lib/data-sources/brasilio";
import { cargoFromBio, anoEleicao, type Cargo } from "@/lib/cargos";
import { getEstadoPorSigla, getPopulacaoMunicipiosUF } from "@/lib/data-sources/ibge";
import { basedosdadosDisponivel } from "@/lib/data-sources/basedosdados";

export { BrasilioThrottled };

export function eleitoralDisponivel(): boolean {
  return hasBrasilioToken() || basedosdadosDisponivel();
}

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['´`^~.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type CandidatoEleitoral = {
  fonte: "tse";
  externalId: string; // sequencial_candidato
  cargo: Cargo;
  ano: number;
  turno: number;
  nome: string;
  nomeUrna: string;
  partido: string;
  uf: string;
  unidadeEleitoral: string;
  situacao: string;
  nascimento: string | null;
  escolaridade: string | null;
  ocupacao: string | null;
};

function toCandidato(c: BioCandidato): CandidatoEleitoral | null {
  const cargo = cargoFromBio(c.cargoCodigo, c.cargoDesc);
  if (!cargo || !c.sequencial) return null;
  return {
    fonte: "tse",
    externalId: c.sequencial,
    cargo,
    ano: c.ano,
    turno: c.turno,
    nome: c.nome || c.nomeUrna,
    nomeUrna: c.nomeUrna || c.nome,
    partido: c.partido,
    uf: c.uf,
    unidadeEleitoral: c.unidadeEleitoral,
    situacao: c.situacao,
    nascimento: c.nascimento,
    escolaridade: c.escolaridade,
    ocupacao: c.ocupacao,
  };
}

const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 dias

/**
 * Busca candidatos por nome em todos os cargos (eleições geral 2022 + municipal 2020).
 * Lê do cache do Neon; só chama o brasil.io no miss. Pode lançar BrasilioThrottled.
 */
export async function buscarCandidatosTSE(nome: string): Promise<CandidatoEleitoral[]> {
  if (!hasBrasilioToken() && !basedosdadosDisponivel()) return [];
  const term = norm(nome);
  if (term.length < 3) return [];

  try {
    const cached = await db
      .select()
      .from(candidateSearchCache)
      .where(eq(candidateSearchCache.term, term))
      .limit(1);
    const hit = cached[0];
    if (
      hit &&
      (hit.results as unknown[]).length > 0 &&
      Date.now() - new Date(hit.fetchedAt).getTime() < CACHE_TTL
    ) {
      return hit.results as CandidatoEleitoral[];
    }
  } catch {
    /* segue para a fonte */
  }

  const out: CandidatoEleitoral[] = [];
  const seen = new Set<string>();

  // 1) Base dos Dados (busca por LIKE, mais completa)
  if (basedosdadosDisponivel()) {
    try {
      const bdd = await import("@/lib/data-sources/basedosdados");
      for (const b of await bdd.buscarCandidatos(nome)) {
        const cargo = cargoFromBio(0, b.cargo);
        if (!cargo || !b.sequencial || seen.has(b.sequencial)) continue;
        seen.add(b.sequencial);
        out.push({
          fonte: "tse",
          externalId: b.sequencial,
          cargo,
          ano: b.ano,
          turno: 1,
          nome: b.nome || b.nomeUrna,
          nomeUrna: b.nomeUrna || b.nome,
          partido: b.siglaPartido,
          uf: b.siglaUf,
          unidadeEleitoral: b.idMunicipio ?? b.siglaUf,
          situacao: b.situacao ?? "",
          nascimento: null,
          escolaridade: null,
          ocupacao: null,
        });
      }
    } catch {
      /* cai para o brasil.io */
    }
  }

  // 2) brasil.io (fallback)
  if (out.length === 0 && hasBrasilioToken()) {
    const raw: BioCandidato[] = await buscarCandidatosPorNome(nome, []);
    for (const r of raw) {
      const c = toCandidato(r);
      if (!c || seen.has(c.externalId)) continue;
      seen.add(c.externalId);
      out.push(c);
    }
  }

  // mais recente + eleito/2º turno primeiro
  out.sort((a, b) => b.ano - a.ano || rank(b.situacao) - rank(a.situacao));

  // só cacheia resultado não-vazio (evita "gravar" uma falha transitória)
  if (out.length > 0) {
    try {
      await db
        .insert(candidateSearchCache)
        .values({ term, results: out, fetchedAt: new Date() })
        .onConflictDoUpdate({
          target: candidateSearchCache.term,
          set: { results: out, fetchedAt: new Date() },
        });
    } catch {
      /* cache best-effort */
    }
  }
  return out;
}

function rank(sit: string): number {
  const s = sit.toUpperCase();
  if (s.includes("ELEITO") && !s.includes("NÃO") && !s.includes("NAO")) return 3;
  if (s.includes("2") && s.includes("TURNO")) return 2;
  if (s.includes("SUPLENTE")) return 1;
  return 0;
}

/**
 * Puxa a votação por município da candidatura e grava em `electoral_results`.
 * Prioriza a **Base dos Dados / BigQuery** (id_municipio = código IBGE, join direto);
 * cai para o brasil.io se aquela não estiver configurada. Idempotente.
 */
export async function ingestVotacao(candidacyId: string): Promise<"ok" | "indisponivel" | "vazio"> {
  const rows = await db
    .select()
    .from(candidacies)
    .where(eq(candidacies.id, candidacyId))
    .limit(1);
  const c = rows[0];
  if (!c || !c.uf) return "vazio";

  const raw = (c.raw ?? {}) as { externalId?: string; ano?: number; turno?: number };
  const cargo = (c.cargo as Cargo | null) ?? null;
  const ano = raw.ano ?? c.electionYear ?? (cargo ? anoEleicao(cargo) : 2022);
  const turno = raw.turno ?? 1;

  // 1) Base dos Dados (preferencial)
  if (basedosdadosDisponivel()) {
    try {
      const rowsBdd = await ingestFromBdd(c, { ano, turno, cargo });
      if (rowsBdd > 0) return "ok";
    } catch {
      /* cai para o brasil.io */
    }
  }

  // 2) brasil.io (tabela `votacao` está desativada hoje — mantido para caso reativem)
  if (c.source !== "tse") return "vazio";
  const sequencial = raw.externalId ?? c.externalId;
  if (!sequencial) return "vazio";
  let votos;
  try {
    votos = await votacaoDoCandidato({ sequencial, ano, uf: c.uf, turno });
  } catch (e) {
    return e instanceof BrasilioThrottled ? "indisponivel" : "indisponivel";
  }
  if (votos.length === 0) return "vazio";

  const estado = await getEstadoPorSigla(c.uf);
  const nameToIbge = new Map<string, string>();
  if (estado) {
    const pops = await getPopulacaoMunicipiosUF(estado.id).catch(() => ({}));
    for (const [code, v] of Object.entries(pops)) nameToIbge.set(norm(v.nome), code);
  }
  await db.delete(electoralResults).where(eq(electoralResults.candidacyId, candidacyId));
  await db.insert(electoralResults).values(
    votos.map((v) => ({
      candidacyId,
      ano,
      turno,
      ufSigla: c.uf!,
      ibgeCode: nameToIbge.get(norm(v.municipio)) ?? null,
      tseCode: v.tseCode || null,
      municipio: v.municipio,
      votos: v.votos,
    })),
  );
  return "ok";
}

const CARGO_BDD: Record<Cargo, string> = {
  presidente: "presidente",
  governador: "governador",
  senador: "senador",
  "deputado-federal": "deputado federal",
  "deputado-estadual": "deputado estadual",
  "deputado-distrital": "deputado distrital",
  prefeito: "prefeito",
  vereador: "vereador",
};

async function ingestFromBdd(
  c: typeof candidacies.$inferSelect,
  opts: { ano: number; turno: number; cargo: Cargo | null },
): Promise<number> {
  const bdd = await import("@/lib/data-sources/basedosdados");
  let sequencial =
    c.source === "tse" ? ((c.raw as { externalId?: string }).externalId ?? c.externalId) : "";

  // Câmara/Senado: descobre o sequencial na Base dos Dados por nome + UF + cargo
  if (!sequencial) {
    const cargoStr = opts.cargo ? CARGO_BDD[opts.cargo] : "";
    const cands = await bdd.buscarCandidatos(c.name);
    const hit = cands.find(
      (x) =>
        x.siglaUf === c.uf &&
        (!cargoStr || x.cargo.includes(cargoStr.split(" ")[1] ?? cargoStr)) &&
        x.ano === opts.ano,
    );
    sequencial = hit?.sequencial ?? "";
  }
  if (!sequencial || !c.uf) return 0;

  const votos = await bdd.votacaoPorMunicipio({
    sequencial,
    ano: opts.ano,
    turno: opts.turno,
    uf: c.uf,
  });
  if (votos.length === 0) return 0;

  await db.delete(electoralResults).where(eq(electoralResults.candidacyId, c.id));
  await db.insert(electoralResults).values(
    votos.map((v) => ({
      candidacyId: c.id,
      ano: opts.ano,
      turno: opts.turno,
      ufSigla: c.uf!,
      ibgeCode: v.idMunicipio, // já é código IBGE
      municipio: v.idMunicipio,
      votos: v.votos,
    })),
  );
  return votos.length;
}

/** Votos por código IBGE (lê só do Neon). */
export async function getVotosByIbge(
  candidacyId: string,
): Promise<{ byCode: Record<string, number>; ano: number; total: number } | null> {
  const rows = await db
    .select()
    .from(electoralResults)
    .where(eq(electoralResults.candidacyId, candidacyId));
  if (rows.length === 0) return null;
  const byCode: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    total += r.votos;
    if (r.ibgeCode) byCode[r.ibgeCode] = (byCode[r.ibgeCode] ?? 0) + r.votos;
  }
  return { byCode, ano: rows[0].ano, total };
}

/** Votos agregados por sigla de UF (lê só do Neon). Para a análise nacional. */
export async function getVotosByUF(
  candidacyId: string,
): Promise<{ byUF: Record<string, number>; ano: number; total: number } | null> {
  const rows = await db
    .select()
    .from(electoralResults)
    .where(eq(electoralResults.candidacyId, candidacyId));
  if (rows.length === 0) return null;
  const byUF: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    total += r.votos;
    const uf = (r.ufSigla ?? "").toUpperCase();
    if (uf) byUF[uf] = (byUF[uf] ?? 0) + r.votos;
  }
  return { byUF, ano: rows[0].ano, total };
}

/** Marca o estado da ingestão na candidatura. */
export async function setEleitoralStatus(candidacyId: string, status: string) {
  await db
    .update(candidacies)
    .set({ electoralStatus: status })
    .where(eq(candidacies.id, candidacyId));
}

export { inArray };
