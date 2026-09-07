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

export { BrasilioThrottled };

export function eleitoralDisponivel(): boolean {
  return hasBrasilioToken();
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
  if (!hasBrasilioToken()) return [];
  const term = norm(nome);
  if (term.length < 3) return [];

  try {
    const cached = await db
      .select()
      .from(candidateSearchCache)
      .where(eq(candidateSearchCache.term, term))
      .limit(1);
    if (cached[0] && Date.now() - new Date(cached[0].fetchedAt).getTime() < CACHE_TTL) {
      return cached[0].results as CandidatoEleitoral[];
    }
  } catch {
    /* segue para a fonte */
  }

  // UMA requisição só (search), cobrindo as duas últimas eleições
  let raw: BioCandidato[] = [];
  try {
    raw = await buscarCandidatosPorNome(nome, [2022, 2020, 2018]);
  } catch (e) {
    if (e instanceof BrasilioThrottled) throw e;
    throw e;
  }

  const seen = new Set<string>();
  const out: CandidatoEleitoral[] = [];
  for (const r of raw) {
    const c = toCandidato(r);
    if (!c) continue;
    if (seen.has(c.externalId)) continue;
    seen.add(c.externalId);
    out.push(c);
  }
  // eleitos / 2º turno primeiro
  out.sort((a, b) => rank(b.situacao) - rank(a.situacao));

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
 * Puxa a votação por município de uma candidatura do brasil.io, faz o join com o
 * código IBGE e grava em `electoral_results`. Idempotente (limpa antes de gravar).
 * Retorna o estado final para `candidacies.electoralStatus`.
 */
export async function ingestVotacao(candidacyId: string): Promise<"ok" | "indisponivel" | "vazio"> {
  const rows = await db
    .select()
    .from(candidacies)
    .where(eq(candidacies.id, candidacyId))
    .limit(1);
  const c = rows[0];
  if (!c || c.source !== "tse" || !c.uf) return "vazio";

  const raw = (c.raw ?? {}) as { externalId?: string; ano?: number; turno?: number };
  const sequencial = raw.externalId ?? c.externalId;
  const cargo = (c.cargo as Cargo | null) ?? null;
  const ano = raw.ano ?? (cargo ? anoEleicao(cargo) : 2022);
  const turno = raw.turno ?? 1;
  if (!sequencial) return "vazio";

  let votos;
  try {
    votos = await votacaoDoCandidato({ sequencial, ano, uf: c.uf, turno });
  } catch (e) {
    if (e instanceof BrasilioThrottled) return "indisponivel";
    return "indisponivel";
  }
  if (votos.length === 0) return "vazio";

  // TSE → IBGE por nome de município na UF
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

/** Marca o estado da ingestão na candidatura. */
export async function setEleitoralStatus(candidacyId: string, status: string) {
  await db
    .update(candidacies)
    .set({ electoralStatus: status })
    .where(eq(candidacies.id, candidacyId));
}

export { inArray };
