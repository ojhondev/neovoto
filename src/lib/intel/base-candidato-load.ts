/**
 * Monta a Base do Candidato (alcance territorial real) a partir do banco + fontes
 * oficiais e cacheia por candidatura. Ver base-candidato.ts para o método.
 */
import { unstable_cache } from "next/cache";
import type { Candidacy } from "@/db/schema";
import type { PerfilPolitico } from "@/lib/politico";
import type { Cargo } from "@/lib/cargos";
import { getGeoUF, codeFromNome } from "@/lib/data-sources/geo";
import {
  basedosdadosDisponivel,
  historicoDoCandidato,
  votacaoDeSequenciais,
  eleitosDoPartidoUF,
  apoiadoresNaRegiao,
  type ApoiadorSugerido,
} from "@/lib/data-sources/basedosdados";
import { basePorApoios, type Apoio } from "@/lib/intel/apoios";
import {
  computeBaseCandidato,
  type BaseCandidato,
  type CampanhaPropria,
} from "@/lib/intel/base-candidato";

/**
 * Só cargos MUNICIPAIS entram na "rede de mandatos local": um deputado estadual/
 * federal é eleito pelo estado inteiro (proporcional), então "eleito" aparece em
 * TODOS os municípios onde teve voto — não é presença local. Vereador e prefeito
 * são mandatos genuinamente municipais.
 */
const CARGO_LOCAL: Partial<Record<Cargo, { cargo: string; ano: number }[]>> = {
  "deputado-estadual": [{ cargo: "vereador", ano: 2024 }, { cargo: "prefeito", ano: 2024 }],
  "deputado-distrital": [{ cargo: "vereador", ano: 2024 }],
  "deputado-federal": [{ cargo: "vereador", ano: 2024 }, { cargo: "prefeito", ano: 2024 }],
  senador: [{ cargo: "vereador", ano: 2024 }, { cargo: "prefeito", ano: 2024 }],
  governador: [{ cargo: "vereador", ano: 2024 }, { cargo: "prefeito", ano: 2024 }],
  prefeito: [{ cargo: "prefeito", ano: 2024 }, { cargo: "vereador", ano: 2024 }],
  vereador: [{ cargo: "vereador", ano: 2024 }],
};

const eleito = (r: string | null) =>
  !!r && /eleito/i.test(r) && !/n[ãa]o/i.test(r);

async function build(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
): Promise<BaseCandidato | null> {
  const uf = (perfil.uf || candidacy.uf || "").toUpperCase();
  if (!uf) return null;

  const geo = await getGeoUF(uf).catch(() => []);
  if (geo.length === 0) return null;

  const anoAlvo = candidacy.electionYear ?? 2026;
  const partido = (perfil.partido || candidacy.party || "").toUpperCase();
  const cargoAlvo = (candidacy.cargo as Cargo | null) ?? perfil.cargo ?? "deputado-estadual";

  // ---- campanhas próprias (todas as eleições da pessoa) ----
  const campanhas: CampanhaPropria[] = [];
  let birthMun = candidacy.birthMunicipio ?? null;
  let birthUf = candidacy.birthUf ?? null;

  if (basedosdadosDisponivel()) {
    try {
      const rawNasc = (candidacy.raw as { nascimento?: string | null })?.nascimento ?? null;
      const hist = await historicoDoCandidato(perfil.nome, {
        dataNascimento: rawNasc,
        municipioNascimento: birthMun,
        ufNascimento: birthUf,
      });
      // âncora de identidade: prioriza a linha da eleição-alvo; senão a mais recente na UF
      const idRow =
        hist.find((h) => h.ano === anoAlvo && h.siglaUf === uf) ??
        hist.filter((h) => h.siglaUf === uf).sort((a, b) => b.ano - a.ano)[0] ??
        hist[0];
      if (idRow) {
        birthMun = birthMun ?? idRow.municipioNascimento;
        birthUf = birthUf ?? idRow.ufNascimento;
      }
      // filtra homônimos: mesma data de nascimento (se houver) OU mesmo nascimento OU mesma UF
      const key = idRow?.dataNascimento?.slice(0, 10) ?? null;
      const mine = hist.filter((h) => {
        if (h.ano >= anoAlvo) return false; // eleição futura não tem resultado
        if (key && h.dataNascimento) return h.dataNascimento.slice(0, 10) === key;
        if (birthMun && h.municipioNascimento) {
          return h.municipioNascimento.toLowerCase() === birthMun.toLowerCase();
        }
        return h.siglaUf === uf;
      });
      const seqs = mine.map((h) => h.sequencial).filter(Boolean);
      const votos = seqs.length ? await votacaoDeSequenciais(seqs) : [];
      const bySeq = new Map<string, { ano: number; byCode: Record<string, number>; total: number; res: string | null }>();
      for (const v of votos) {
        const cur = bySeq.get(v.sequencial) ?? { ano: v.ano, byCode: {}, total: 0, res: v.resultado };
        cur.byCode[v.idMunicipio] = (cur.byCode[v.idMunicipio] ?? 0) + v.votos;
        cur.total += v.votos;
        bySeq.set(v.sequencial, cur);
      }
      for (const [seq, agg] of bySeq) {
        const h = mine.find((x) => x.sequencial === seq);
        campanhas.push({
          ano: agg.ano,
          cargo: h?.cargo ?? "",
          byCode: agg.byCode,
          totalVotos: agg.total,
          eleito: eleito(agg.res) || eleito(h?.situacao ?? null),
        });
      }
    } catch {
      /* segue sem campanhas próprias */
    }
  }

  // ---- âncora ----
  let ancoraCode = candidacy.anchorIbge ?? null;
  let ancoraVia: "declarado" | "nascimento" | "ultima-campanha" | null = ancoraCode ? "declarado" : null;
  if (!ancoraCode && birthMun && (!birthUf || birthUf.toUpperCase() === uf)) {
    ancoraCode = codeFromNome(geo, birthMun);
    if (ancoraCode) ancoraVia = "nascimento";
  }
  if (!ancoraCode && campanhas.length > 0) {
    const recente = [...campanhas].sort((a, b) => b.ano - a.ano)[0];
    const dom = Object.entries(recente.byCode).sort((a, b) => b[1] - a[1])[0];
    if (dom) {
      ancoraCode = dom[0];
      ancoraVia = "ultima-campanha";
    }
  }

  // ---- rede partidária local ----
  const eleitosPartido: Record<string, number> = {};
  if (basedosdadosDisponivel() && partido) {
    const alvos = CARGO_LOCAL[cargoAlvo] ?? [{ cargo: "deputado estadual", ano: 2022 }];
    const listas = await Promise.all(
      alvos.map((a) => eleitosDoPartidoUF({ uf, partido, cargo: a.cargo, ano: a.ano }).catch(() => [])),
    );
    for (const lista of listas) {
      for (const r of lista) eleitosPartido[r.idMunicipio] = (eleitosPartido[r.idMunicipio] ?? 0) + r.votos;
    }
  }

  // ---- apoios declarados ----
  const apoios = (candidacy.apoios as Apoio[] | null) ?? [];
  const baseApoios = apoios.length ? await basePorApoios(apoios).catch(() => null) : null;

  return computeBaseCandidato({
    anoAlvo,
    geo,
    campanhas,
    ancoraCode,
    ancoraVia,
    baseDeclarada: ((candidacy.baseIbge as string[] | null) ?? []).filter(Boolean),
    eleitosPartido,
    apoiosByCode: baseApoios?.byCode ?? {},
    apoiosNomes: (baseApoios?.detalhe ?? []).map((d) => d.nome),
  });
}

export async function getBaseCandidato(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
): Promise<BaseCandidato | null> {
  const cached = unstable_cache(
    () => build(candidacy, perfil),
    ["base-candidato-v1", candidacy.id, String(candidacy.refreshedAt ?? "")],
    { revalidate: 60 * 60 * 24 * 7 },
  );
  return cached().catch(() => null);
}

export type ApoiadorSugestao = ApoiadorSugerido & { jaEApoio: boolean; cargoLabel: string };

const CARGO_PT: Record<string, string> = {
  "deputado estadual": "Deputado estadual",
  "deputado federal": "Deputado federal",
  "deputado distrital": "Deputado distrital",
  vereador: "Vereador",
  prefeito: "Prefeito",
  "vice-prefeito": "Vice-prefeito",
  senador: "Senador",
  governador: "Governador",
};

async function buildApoiadores(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
): Promise<ApoiadorSugestao[]> {
  const uf = (perfil.uf || candidacy.uf || "").toUpperCase();
  const partido = (perfil.partido || candidacy.party || "").toUpperCase();
  if (!uf || !partido || !basedosdadosDisponivel()) return [];
  const base = await build(candidacy, perfil).catch(() => null);
  const codes = [...new Set([...(base?.regImediataCodes ?? []), ...(base?.regIntermediariaCodes ?? [])])];
  if (codes.length === 0) return [];

  const lista = await apoiadoresNaRegiao({ uf, partido, codes }).catch(() => []);
  const jaTem = new Set(
    ((candidacy.apoios as { externalId?: string; nome?: string }[] | null) ?? []).flatMap((a) =>
      [a.externalId, (a.nome ?? "").toUpperCase()].filter(Boolean) as string[],
    ),
  );
  const eu = perfil.nome.toUpperCase();
  const seen = new Set<string>();
  const out: ApoiadorSugestao[] = [];
  for (const a of lista) {
    if (a.nome.toUpperCase() === eu) continue;
    if (seen.has(a.nome.toUpperCase())) continue;
    seen.add(a.nome.toUpperCase());
    out.push({
      ...a,
      jaEApoio: jaTem.has(a.sequencial) || jaTem.has(a.nome.toUpperCase()),
      cargoLabel: CARGO_PT[a.cargo] ?? a.cargo,
    });
  }
  return out.slice(0, 8);
}

export async function getApoiadoresSugeridos(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
): Promise<ApoiadorSugestao[]> {
  const cached = unstable_cache(
    () => buildApoiadores(candidacy, perfil),
    ["apoiadores-sugeridos-v1", candidacy.id, String(candidacy.refreshedAt ?? "")],
    { revalidate: 60 * 60 * 24 * 7 },
  );
  return cached().catch(() => []);
}
