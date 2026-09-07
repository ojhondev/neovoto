/**
 * IFET — Índice de Força Eleitoral Territorial (v1)
 * =================================================
 * Motor proprietário da NeoVoto. Atribui a cada município um score 0–100 de
 * prioridade estratégica para a candidatura, decomposto em pilares explicáveis.
 *
 * v1.0 ("contexto territorial") usa só o que temos hoje de dado oficial:
 *   - População (Censo 2022, IBGE) — peso eleitoral
 *   - PIB per capita (IBGE, PIB dos Municípios) — perfil econômico do território
 *
 * A CAMADA DE HISTÓRICO ELEITORAL (votação do campo político por município) entra
 * na v1.1 quando a Base dos Dados estiver conectada — o pilar já existe aqui com
 * peso 0 e é mostrado como "pendente" na ficha técnica.
 *
 * Método (padrão OECD/JRC de indicadores compostos): normalização robusta,
 * agregação por MÉDIA GEOMÉTRICA PONDERADA (penaliza compensação entre pilares),
 * decomposição aditiva para explicar. Pesos abaixo são revisáveis (Delphi interno).
 *
 * Segredo de negócio: a especificação exata (pesos finais, curvas, priors) vive
 * na ficha metodológica interna. O que a UI mostra é score + pilares + fontes.
 */

export const IFET_VERSION = "v1.0-contexto";
export const IFET_VERSION_DESEMPENHO = "v1.1-desempenho";

type Pesos = {
  pesoEleitoral: number;
  perfilEconomico: number;
  disputabilidade: number;
  desempenhoHistorico: number;
};

/** v1.0 — só contexto territorial (sem votação do candidato). Soma 1. */
const PESOS_BASE: Pesos = {
  pesoEleitoral: 0.46,
  perfilEconomico: 0.18,
  disputabilidade: 0.36,
  desempenhoHistorico: 0,
};

/**
 * v1.1 — com o histórico de votação do próprio candidato. Entra com PESO MENOR
 * (puxa a prioridade para cima onde ele já teve voto, sem dominar o índice);
 * os outros pilares são reduzidos proporcionalmente. Soma 1.
 */
const PESOS_DESEMPENHO: Pesos = {
  pesoEleitoral: 0.4,
  perfilEconomico: 0.16,
  disputabilidade: 0.32,
  desempenhoHistorico: 0.12,
};

export type MunicipioEntrada = {
  code: string;
  nome: string;
  populacao: number;
  pibTotal: number; // R$
  /** votos do próprio candidato no município na última eleição (Base dos Dados). */
  votosCandidato?: number;
};

export type Quadrante =
  | "prioridade-maxima"
  | "consolidar"
  | "oportunidade-dispersa"
  | "baixa-prioridade";

export type IfetMunicipio = {
  code: string;
  nome: string;
  score: number; // 0–100
  pilares: {
    pesoEleitoral: number; // 0–1
    perfilEconomico: number; // 0–1
    disputabilidade: number; // 0–1
    desempenhoHistorico?: number; // 0–1 — só quando há votação do candidato
  };
  quadrante: Quadrante;
  pibPerCapita: number;
  populacao: number;
  votosCandidato?: number;
};

export type IfetResultado = {
  version: string;
  municipios: IfetMunicipio[];
  byCode: Record<string, number>; // code → score (para o choropleth)
  pesos: Pesos;
  fontes: string[];
  pendencias: string[];
};

/** percentil-rank robusto (0..1), com winsorização suave nos extremos */
function percentRank(values: number[]): (v: number) => number {
  const sorted = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return () => 0.5;
  const lo = sorted[Math.floor(sorted.length * 0.02)] ?? sorted[0];
  const hi = sorted[Math.ceil(sorted.length * 0.98) - 1] ?? sorted[sorted.length - 1];
  return (v: number) => {
    if (v <= 0) return 0;
    const c = Math.min(hi, Math.max(lo, v));
    return hi > lo ? (c - lo) / (hi - lo) : 0.5;
  };
}

function geomWeighted(parts: { x: number; w: number }[]): number {
  let num = 0;
  let den = 0;
  for (const { x, w } of parts) {
    if (w <= 0) continue;
    num += w * Math.log(Math.max(0.02, Math.min(1, x)));
    den += w;
  }
  return den > 0 ? Math.exp(num / den) : 0;
}

export function computeIFET(entradas: MunicipioEntrada[]): IfetResultado {
  const comPib = entradas.map((m) => ({
    ...m,
    pibPerCapita: m.populacao > 0 ? m.pibTotal / m.populacao : 0,
    // penetração: votos do candidato por habitante (proxy de força territorial
    // que não é só população). Upgrade futuro: share sobre votos válidos do cargo.
    penetracao: m.populacao > 0 ? (m.votosCandidato ?? 0) / m.populacao : 0,
  }));

  const temDesempenho = comPib.some((m) => (m.votosCandidato ?? 0) > 0);
  const PESOS = temDesempenho ? PESOS_DESEMPENHO : PESOS_BASE;

  const rankPop = percentRank(comPib.map((m) => Math.log(m.populacao + 1)));
  const rankPib = percentRank(comPib.map((m) => m.pibPerCapita));
  const rankPen = percentRank(comPib.map((m) => m.penetracao));

  const parciais = comPib.map((m) => {
    const p1 = rankPop(Math.log(m.populacao + 1));
    const p2 = rankPib(m.pibPerCapita);
    // disputabilidade: curva de sino sobre o perfil econômico — municípios de
    // renda média tendem a ter voto menos cristalizado / mais conquistável.
    const p3 = 1 - Math.abs(p2 - 0.5) * 2;
    // desempenho histórico do candidato (0..1). Sem dado → não pontua.
    const p4 = temDesempenho ? rankPen(m.penetracao) : 0;

    const score =
      100 *
      geomWeighted([
        { x: p1, w: PESOS.pesoEleitoral },
        { x: p2 * 0.5 + 0.5, w: PESOS.perfilEconomico }, // achata p2 (não é "melhor" ter renda alta)
        { x: Math.max(0.15, p3), w: PESOS.disputabilidade },
        // achatado: mesmo sem histórico não zera; histórico alto puxa pra cima.
        { x: 0.35 + 0.65 * p4, w: PESOS.desempenhoHistorico },
      ]);

    const quadrante: Quadrante =
      p1 >= 0.5 && p3 >= 0.5
        ? "prioridade-maxima"
        : p1 >= 0.5
          ? "consolidar"
          : p3 >= 0.5
            ? "oportunidade-dispersa"
            : "baixa-prioridade";

    return {
      code: m.code,
      nome: m.nome,
      score: Math.round(score * 10) / 10,
      pilares: {
        pesoEleitoral: Math.round(p1 * 100) / 100,
        perfilEconomico: Math.round(p2 * 100) / 100,
        disputabilidade: Math.round(p3 * 100) / 100,
        ...(temDesempenho ? { desempenhoHistorico: Math.round(p4 * 100) / 100 } : {}),
      },
      quadrante,
      pibPerCapita: Math.round(m.pibPerCapita),
      populacao: m.populacao,
      ...(temDesempenho ? { votosCandidato: m.votosCandidato ?? 0 } : {}),
    };
  });

  parciais.sort((a, b) => b.score - a.score);

  const byCode: Record<string, number> = {};
  for (const p of parciais) byCode[p.code] = p.score;

  return {
    version: temDesempenho ? IFET_VERSION_DESEMPENHO : IFET_VERSION,
    municipios: parciais,
    byCode,
    pesos: PESOS,
    fontes: [
      "IBGE — Censo 2022 (população)",
      "IBGE — PIB dos Municípios (renda territorial)",
      ...(temDesempenho
        ? ["TSE / Base dos Dados — votação do candidato por município"]
        : []),
    ],
    pendencias: [
      ...(temDesempenho
        ? []
        : ["Histórico eleitoral do candidato por município — entra com a Base dos Dados."]),
      "Densidade de rede local (saída do Mapa de Influência).",
      "Emendas e transferências ao município (Portal da Transparência).",
      "Contexto em tempo real e enquadramento ideológico por região.",
    ],
  };
}

export const QUADRANTE_INFO: Record<
  Quadrante,
  { pt: { label: string; acao: string }; en: { label: string; acao: string } }
> = {
  "prioridade-maxima": {
    pt: { label: "Prioridade máxima", acao: "Muito voto em jogo e eleitorado conquistável — concentrar agenda e recurso." },
    en: { label: "Top priority", acao: "Lots of votes at stake and a persuadable electorate — concentrate agenda and budget." },
  },
  consolidar: {
    pt: { label: "Consolidar", acao: "Grande peso eleitoral, voto mais cristalizado — defender a base, não desperdiçar palanque." },
    en: { label: "Consolidate", acao: "High electoral weight, more crystallised vote — defend the base, don't waste rallies." },
  },
  "oportunidade-dispersa": {
    pt: { label: "Oportunidade dispersa", acao: "Eleitorado volátil em municípios menores — ações de baixo custo e articulação local." },
    en: { label: "Scattered opportunity", acao: "Volatile electorate in smaller municipalities — low-cost actions and local outreach." },
  },
  "baixa-prioridade": {
    pt: { label: "Baixa prioridade", acao: "Pouco voto e voto cristalizado — presença institucional mínima." },
    en: { label: "Low priority", acao: "Few votes and crystallised vote — minimal institutional presence." },
  },
};
