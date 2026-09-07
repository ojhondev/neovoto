/**
 * Comparação de candidatos (Concorrentes).
 * Para cada candidatura na arena, deriva métricas comparáveis a partir da
 * votação real por município, da ideologia do partido e da atividade legislativa.
 * O radar é normalizado (min–max) DENTRO da arena — comparação relativa entre os
 * selecionados, não percentil de liga.
 */
import type { Candidacy } from "@/db/schema";
import { perfilFrom } from "@/lib/candidacy";
import { getVotosByIbge } from "@/lib/data-sources/eleitoral";
import { eixoDoPartido } from "@/lib/intel/partidos";
import { getPopulacaoMunicipiosUF, getEstadoPorSigla } from "@/lib/data-sources/ibge";

export const COMPARAR_VERSION = "comparar-v1";

export type EixoRadar = "votos" | "alcance" | "concentracao" | "penetracao" | "legislativo";

export type CandidatoComparado = {
  id: string;
  nome: string;
  partido: string;
  uf: string;
  cargo: string | null;
  ano: number | null;
  cor: string; // token var()
  // métricas cruas
  votos: number;
  municipios: number;
  concentracaoTop5: number; // 0–1
  penetracao: number; // votos por habitante (médio ponderado)
  proposicoes: number;
  eco: number;
  soc: number;
  temVoto: boolean;
  // radar 0–100 (min–max na arena)
  radar: Record<EixoRadar, number>;
};

export type CompararResultado = {
  version: string;
  candidatos: CandidatoComparado[];
  eixos: EixoRadar[];
  fontes: string[];
};

const CORES = ["var(--color-cmp-self)", "var(--color-cmp-other)", "var(--color-cmp-third)", "var(--color-cat-4)"];

export async function compararCandidatos(rows: Candidacy[]): Promise<CompararResultado> {
  // população por UF (para penetração), carregada uma vez por UF
  const ufs = [...new Set(rows.map((r) => r.uf).filter(Boolean))] as string[];
  const popPorUf = new Map<string, Record<string, number>>();
  await Promise.all(
    ufs.map(async (uf) => {
      const est = await getEstadoPorSigla(uf).catch(() => null);
      if (!est) return;
      const pops = await getPopulacaoMunicipiosUF(est.id).catch(() => ({}));
      const map: Record<string, number> = {};
      for (const [code, v] of Object.entries(pops)) map[code] = (v as { populacao: number }).populacao;
      popPorUf.set(uf, map);
    }),
  );

  const base: Omit<CandidatoComparado, "cor" | "radar">[] = [];
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    const perfil = perfilFrom(c);
    const v = await getVotosByIbge(c.id).catch(() => null);
    const votosByCode = v?.byCode ?? {};
    const totals = Object.values(votosByCode).sort((a, b) => b - a);
    const votos = totals.reduce((s, x) => s + x, 0);
    const top5 = totals.slice(0, 5).reduce((s, x) => s + x, 0);
    const pop = popPorUf.get(c.uf ?? "") ?? {};
    let popCobertaVotos = 0;
    for (const [code, vt] of Object.entries(votosByCode)) {
      if (pop[code]) popCobertaVotos += pop[code];
      void vt;
    }
    const eixo = eixoDoPartido(c.party ?? perfil?.partido ?? "") ?? { eco: 0, soc: 0 };
    base.push({
      id: c.id,
      nome: c.name,
      partido: c.party ?? perfil?.partido ?? "—",
      uf: c.uf ?? "—",
      cargo: c.cargo ?? perfil?.cargo ?? null,
      ano: v?.ano ?? c.electionYear ?? null,
      votos,
      municipios: totals.length,
      concentracaoTop5: votos > 0 ? top5 / votos : 0,
      penetracao: popCobertaVotos > 0 ? votos / popCobertaVotos : 0,
      proposicoes: perfil?.proposicoes?.total ?? 0,
      eco: eixo.eco,
      soc: eixo.soc,
      temVoto: totals.length > 0,
    });
  }

  const eixos: EixoRadar[] = ["votos", "alcance", "concentracao", "penetracao", "legislativo"];
  const valorEixo = (b: (typeof base)[number], e: EixoRadar) =>
    e === "votos"
      ? b.votos
      : e === "alcance"
        ? b.municipios
        : e === "concentracao"
          ? b.concentracaoTop5
          : e === "penetracao"
            ? b.penetracao
            : b.proposicoes;

  const norm = (e: EixoRadar) => {
    const vals = base.map((b) => valorEixo(b, e));
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return (x: number) => (hi > lo ? Math.round(((x - lo) / (hi - lo)) * 100) : 50);
  };
  const normers = Object.fromEntries(eixos.map((e) => [e, norm(e)])) as Record<
    EixoRadar,
    (x: number) => number
  >;

  const candidatos: CandidatoComparado[] = base.map((b, i) => ({
    ...b,
    cor: CORES[i % CORES.length],
    radar: Object.fromEntries(
      eixos.map((e) => [e, normers[e](valorEixo(b, e))]),
    ) as Record<EixoRadar, number>,
  }));

  return {
    version: COMPARAR_VERSION,
    candidatos,
    eixos,
    fontes: [
      "TSE / Base dos Dados — votação por município",
      "IBGE — população",
      "NeoVoto — escala ideológica de partido",
    ],
  };
}
