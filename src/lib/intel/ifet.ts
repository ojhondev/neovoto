/**
 * IFET — Índice de Força Eleitoral Territorial (v2)
 * ================================================
 * Motor proprietário da NeoVoto. Antes: um score único, dominado por população —
 * o que fazia toda campanha sem histórico ser mandada para as maiores cidades do
 * estado. Agora o índice tem DOIS eixos:
 *
 *   pesoTerritorial  — quanto voto está em jogo no município (contexto: população,
 *                      renda, disputabilidade). Não depende do candidato.
 *   alcance          — o quanto ESTE candidato, especificamente, consegue tirar voto
 *                      ali (Base do Candidato: histórico próprio, âncora geográfica,
 *                      rede do partido, apoios). 0..1.
 *
 * A PRIORIDADE (o score exibido) exige os dois: a agregação por média geométrica
 * ponderada é não-compensatória, então alcance ≈ 0 derruba a prioridade por mais
 * populoso que o município seja. Quadrantes:
 *
 *   prioridade — muito voto E você tem base → concentrar tudo aqui
 *   expansão   — muito voto, sem pé → só com estrutura/aliado/tempo, não verba solta
 *   reduto     — sua base → defender e mobilizar
 *   fora       — pouco voto ou fora do raio → presença mínima
 *
 * Quando não há NENHUM sinal do candidato (`modo: "contexto"`), o índice mostra só
 * o peso do território e diz isso — não inventa um ranking de prioridade.
 *
 * Método: normalização por percentil-rank robusto (winsor. 2%), agregação por
 * média geométrica ponderada, decomposição aditiva para explicar. A especificação
 * fina (curvas, priors) vive na ficha metodológica interna.
 *
 * Backtest (docs/BACKTEST-METODOS.md §C): o eixo de alcance prevê ONDE o candidato
 * performa acima da média (share) com precisão@10 ~4–6× a do ranking por
 * população. NÃO prevê contagem bruta de votos (essa segue a população) — por isso
 * o alcance é o eixo dominante da PRIORIDADE e a população fica só no PESO.
 */
import type { Confianca } from "@/lib/intel/base-candidato";

export const IFET_VERSION = "v2.0-alcance";
export const IFET_VERSION_CONTEXTO = "v2.0-contexto";

type Pesos = {
  pesoEleitoral: number;
  perfilEconomico: number;
  disputabilidade: number;
  alcance: number;
};

/** modo candidato — o alcance domina e é não-compensatório. Soma 1. */
const PESOS_CANDIDATO: Pesos = {
  pesoEleitoral: 0.3,
  perfilEconomico: 0,
  disputabilidade: 0.18,
  alcance: 0.52,
};

/** modo contexto — sem sinal do candidato, só o peso do território. Soma 1. */
const PESOS_CONTEXTO: Pesos = {
  pesoEleitoral: 0.56,
  perfilEconomico: 0.16,
  disputabilidade: 0.28,
  alcance: 0,
};

export type MunicipioEntrada = {
  code: string;
  nome: string;
  populacao: number;
  pibTotal: number; // R$
  /** votos do próprio candidato no município na última eleição (compat). */
  votosCandidato?: number;
  /** alcance 0..1 vindo da Base do Candidato. */
  alcance?: number;
  confianca?: Confianca;
};

export type Quadrante = "prioridade" | "expansao" | "reduto" | "fora";

export type IfetMunicipio = {
  code: string;
  nome: string;
  score: number; // 0–100 — PRIORIDADE
  pesoTerritorial: number; // 0–1
  alcance: number; // 0–1
  confianca: Confianca;
  pilares: {
    pesoEleitoral: number; // 0–1
    perfilEconomico: number; // 0–1
    disputabilidade: number; // 0–1
    alcance: number; // 0–1
  };
  quadrante: Quadrante;
  pibPerCapita: number;
  populacao: number;
  votosCandidato?: number;
};

export type IfetResultado = {
  version: string;
  modo: "candidato" | "contexto";
  municipios: IfetMunicipio[];
  byCode: Record<string, number>; // code → prioridade (choropleth)
  pesoByCode: Record<string, number>; // code → pesoTerritorial × 100
  alcanceByCode: Record<string, number>; // code → alcance × 100
  pesos: Pesos;
  cobertura: number; // fração de municípios com alcance ≥ 0.2
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

export function computeIFET(
  entradas: MunicipioEntrada[],
  opts: { modo?: "candidato" | "contexto" } = {},
): IfetResultado {
  const temAlcance = entradas.some((m) => (m.alcance ?? 0) > 0);
  const modo: "candidato" | "contexto" = opts.modo ?? (temAlcance ? "candidato" : "contexto");
  const PESOS = modo === "candidato" ? PESOS_CANDIDATO : PESOS_CONTEXTO;

  const comPib = entradas.map((m) => ({
    ...m,
    pibPerCapita: m.populacao > 0 ? m.pibTotal / m.populacao : 0,
    alc: Math.max(0, Math.min(1, m.alcance ?? 0)),
  }));

  const rankPop = percentRank(comPib.map((m) => Math.log(m.populacao + 1)));
  const rankPib = percentRank(comPib.map((m) => m.pibPerCapita));

  const parciais = comPib.map((m) => {
    const p1 = rankPop(Math.log(m.populacao + 1));
    const p2 = rankPib(m.pibPerCapita);
    // disputabilidade: sino sobre o perfil econômico — renda média = voto menos cristalizado
    const p3 = Math.max(0.15, 1 - Math.abs(p2 - 0.5) * 2);
    const alc = m.alc;

    const pesoTerritorial = geomWeighted([
      { x: p1, w: 0.62 },
      { x: p2 * 0.5 + 0.5, w: 0.12 },
      { x: p3, w: 0.26 },
    ]);

    let score: number;
    if (modo === "candidato") {
      const reach = 0.12 + 0.88 * alc; // piso: alcance 0 não zera, mas quase
      score =
        100 *
        geomWeighted([
          { x: p1, w: PESOS.pesoEleitoral },
          { x: p3, w: PESOS.disputabilidade },
          { x: reach, w: PESOS.alcance },
        ]);
    } else {
      score = 100 * pesoTerritorial;
    }

    let quadrante: Quadrante;
    if (modo === "candidato") {
      const temPe = alc >= 0.33;
      const muitoVoto = p1 >= 0.45;
      quadrante = temPe
        ? muitoVoto
          ? "prioridade"
          : "reduto"
        : p1 >= 0.55
          ? "expansao"
          : "fora";
    } else {
      quadrante = p1 >= 0.55 ? "expansao" : "fora";
    }

    const confianca: Confianca =
      m.confianca ?? (alc >= 0.4 ? "media" : alc > 0 ? "baixa" : "nenhuma");

    return {
      code: m.code,
      nome: m.nome,
      score: Math.round(score * 10) / 10,
      pesoTerritorial: Math.round(pesoTerritorial * 100) / 100,
      alcance: Math.round(alc * 100) / 100,
      confianca,
      pilares: {
        pesoEleitoral: Math.round(p1 * 100) / 100,
        perfilEconomico: Math.round(p2 * 100) / 100,
        disputabilidade: Math.round(p3 * 100) / 100,
        alcance: Math.round(alc * 100) / 100,
      },
      quadrante,
      pibPerCapita: Math.round(m.pibPerCapita),
      populacao: m.populacao,
      ...(modo === "candidato" ? { votosCandidato: m.votosCandidato ?? 0 } : {}),
    };
  });

  parciais.sort((a, b) => b.score - a.score);

  const byCode: Record<string, number> = {};
  const pesoByCode: Record<string, number> = {};
  const alcanceByCode: Record<string, number> = {};
  for (const p of parciais) {
    byCode[p.code] = p.score;
    pesoByCode[p.code] = Math.round(p.pesoTerritorial * 100);
    alcanceByCode[p.code] = Math.round(p.alcance * 100);
  }

  const cobertura = parciais.filter((p) => p.alcance >= 0.2).length / (parciais.length || 1);

  return {
    version: modo === "candidato" ? IFET_VERSION : IFET_VERSION_CONTEXTO,
    modo,
    municipios: parciais,
    byCode,
    pesoByCode,
    alcanceByCode,
    pesos: PESOS,
    cobertura,
    fontes: [
      "IBGE — Censo 2022 (população)",
      "IBGE — PIB dos Municípios (renda territorial)",
      ...(modo === "candidato"
        ? ["NeoVoto — Base do Candidato (histórico próprio, âncora, rede do partido, apoios)"]
        : []),
    ],
    pendencias:
      modo === "contexto"
        ? [
            "Sem sinal territorial do candidato — o índice mostra só o peso do território.",
            "Informe o município-base (domicílio eleitoral) e os apoios para calibrar a prioridade.",
          ]
        : [
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
  prioridade: {
    pt: { label: "Prioridade", acao: "Muito voto em jogo e você tem base aqui — concentre agenda, tempo do candidato e verba." },
    en: { label: "Priority", acao: "Lots of votes at stake and you have a base here — concentrate agenda, candidate time and budget." },
  },
  expansao: {
    pt: { label: "Expansão", acao: "Muito voto, mas você não tem pé aqui. Só entra com estrutura, aliado local ou tempo — não com verba solta." },
    en: { label: "Expansion", acao: "Lots of votes, but no foothold. Only enter with structure, a local ally or time — not loose budget." },
  },
  reduto: {
    pt: { label: "Reduto", acao: "Sua base. Defender e mobilizar — o voto aqui é seu para perder." },
    en: { label: "Stronghold", acao: "Your base. Defend and turn out the vote — this is yours to lose." },
  },
  fora: {
    pt: { label: "Fora do alcance", acao: "Pouco voto ou fora do seu raio — presença institucional mínima." },
    en: { label: "Out of reach", acao: "Few votes or outside your radius — minimal institutional presence." },
  },
};
