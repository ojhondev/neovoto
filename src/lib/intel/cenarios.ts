/**
 * Cenários v2 — projeção probabilística por simulação de Monte Carlo.
 * =================================================================
 * NÃO é previsão de intenção de voto (Lei 9.504 — uso interno). É: "dadas estas
 * premissas, e com a incerteza que elas carregam, o resultado tende a cair nesta
 * DISTRIBUIÇÃO". A saída é uma faixa (p10…p90) e uma probabilidade de eleger
 * CONDICIONADA às premissas do modelo — não uma pesquisa.
 *
 * Base da projeção, em ordem de confiança:
 *   1. Votação própria por município (histórico real do candidato).
 *   2. Alcance da Base do Candidato × captação amostrada × votos válidos do
 *      município — para quem não tem histórico próprio mas tem âncora/rede/apoios.
 *   3. Fração do voto do partido (último recurso).
 *
 * Cada rodada amostra: maré nacional, comparecimento, taxa de captação (quando a
 * base é sintética), fração de conversão das lacunas territoriais e um choque
 * agregado de execução. N rodadas → distribuição do total.
 *
 * `cenarios-v2-montecarlo`. Ainda SEM backtesting — ver scripts/backtest.ts.
 */
import { eixoDoPartido } from "@/lib/intel/partidos";
import type { Cargo } from "@/lib/cargos";

export const CENARIOS_VERSION = "cenarios-v3-mc-calibrado";

const N_SIMS = 4000;
const MAJORITARIOS: Cargo[] = ["presidente", "governador", "senador", "prefeito"];

/**
 * CALIBRAÇÃO (docs/BACKTEST-METODOS.md §D). O voto de um candidato proporcional
 * uma eleição à frente é quase imprevisível em NÍVEL — o que se calibra é a
 * distribuição do "crescimento" `voto_alvo / referência`. Medido em SP
 * (dep. estadual 2018→2022, 215 candidatos, casados por nome+nascimento EXATO):
 *   ratio v2022/v2018 → p10 0,29 · p25 0,53 · p50 0,92 · p75 1,39 · p90 1,79
 *   → lognormal: drift (mediana) ≈ 0,90, sd(log) ≈ 0,62.
 * Sem histórico no cargo (base sintética): sem dado limpo — distribuição bem mais
 * larga e viés para baixo (drift 0,5, sigma 1,0), projeção de baixa confiança.
 * Maré nacional e comparecimento entram como fatores menores em cima disso.
 */
const CRESC = {
  proprio: { drift: 0.9, sigma: 0.62 },
  sintetico: { drift: 0.5, sigma: 1.0 },
};

export type ResultadoCenario = "vitoria" | "disputa" | "derrota";

export type Cenario = {
  chave: "base" | "favoravel" | "adverso";
  nome: string;
  premissas: string[];
  votos: number;
  faixa: [number, number];
  resultado: ResultadoCenario;
};

export type MunicipioAlvo = {
  code: string;
  nome: string;
  ganhoPotencial: number;
  ifet: number;
};

export type PontoDispersao = {
  code: string;
  nome: string;
  share: number;
  ifet: number;
  gap: number;
  alvo: boolean;
};

export type Distribuicao = { p10: number; p25: number; p50: number; p75: number; p90: number };

export type CenariosResultado = {
  version: string;
  tipoDisputa: "majoritaria" | "proporcional";
  baseProjecao: "votacao-propria" | "alcance-candidato" | "votacao-do-partido";
  votosBase: number;
  votosNecessarios: number;
  faltam: number;
  distribuicao: Distribuicao;
  probVitoria: number; // 0..1 — condicional às premissas do modelo
  sims: number;
  cenarios: Cenario[];
  municipiosAlvo: MunicipioAlvo[];
  dispersao: PontoDispersao[];
  sensibilidade: { fator: string; impacto: number }[];
  fontes: string[];
};

function campoDe(sigla: string): number {
  const e = eixoDoPartido(sigla);
  return e ? (e.eco + e.soc) / 2 : 0;
}

// ---------- amostradores ----------
// Box–Muller
function randn(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function normal(mean: number, sd: number): number {
  return mean + sd * randn();
}
function quantil(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[i];
}

type Textos = {
  base: string;
  favoravel: string;
  adverso: string;
  premissaBase: string;
  premissaMareBoa: string;
  premissaLacunas: string;
  premissaCompBaixo: string;
  premissaMareRuim: string;
  premissaAdvConsolida: string;
  fatorMare: string;
  fatorComparecimento: string;
  fatorLacunas: string;
};

export function computeCenarios(
  args: {
    cargo: Cargo | null;
    partido: string;
    votosCandidatoByCode: Record<string, number> | null;
    /** alcance 0..1 por município (Base do Candidato) — projeta a base quando não há histórico */
    alcanceByCode?: Record<string, number> | null;
    votacaoPartido: { idMunicipio: string; sigla: string; votos: number }[];
    ifetByCode: Record<string, number>;
    populacaoByCode: Record<string, number>;
    nomeByCode: Record<string, string>;
    corteEleito: number | null;
    fracaoPartido?: number;
  },
  txt: Textos,
  opts: { sims?: number } = {},
): CenariosResultado {
  const nSims = Math.max(200, opts.sims ?? N_SIMS);
  const tipoDisputa =
    args.cargo && MAJORITARIOS.includes(args.cargo) ? "majoritaria" : "proporcional";
  const campoBase = campoDe(args.partido);
  const mesmoCampo = (sigla: string) => Math.abs(campoDe(sigla) - campoBase) <= 0.45;

  const totalMun = new Map<string, number>();
  const campoMun = new Map<string, number>();
  const partidoMun = new Map<string, number>();
  for (const r of args.votacaoPartido) {
    totalMun.set(r.idMunicipio, (totalMun.get(r.idMunicipio) ?? 0) + r.votos);
    if (mesmoCampo(r.sigla)) campoMun.set(r.idMunicipio, (campoMun.get(r.idMunicipio) ?? 0) + r.votos);
    if (r.sigla === args.partido.toUpperCase())
      partidoMun.set(r.idMunicipio, (partidoMun.get(r.idMunicipio) ?? 0) + r.votos);
  }

  const temVotoProprio =
    !!args.votosCandidatoByCode && Object.keys(args.votosCandidatoByCode).length > 0;
  const alc = args.alcanceByCode ?? {};
  const temAlcance = !temVotoProprio && Object.values(alc).some((v) => v > 0.05);
  const baseProjecao: CenariosResultado["baseProjecao"] = temVotoProprio
    ? "votacao-propria"
    : temAlcance
      ? "alcance-candidato"
      : "votacao-do-partido";

  const fp = temVotoProprio ? 1 : (args.fracaoPartido ?? 1);
  // captação central: fração dos votos válidos do município que um candidato com
  // alcance pleno (=1) tende a captar. Amostrada na simulação (0,02 … 0,09).
  const CAPT_MODE = 0.045;
  const candVotos = (code: string, capt: number): number => {
    if (temVotoProprio) return args.votosCandidatoByCode![code] ?? 0;
    if (temAlcance) return (alc[code] ?? 0) * capt * (totalMun.get(code) ?? 0);
    return (partidoMun.get(code) ?? 0) * fp;
  };

  // teto por município
  let melhorShare = 0;
  if (temVotoProprio) {
    for (const code of totalMun.keys()) {
      const tot = totalMun.get(code) ?? 0;
      if (tot > 500) melhorShare = Math.max(melhorShare, candVotos(code, CAPT_MODE) / tot);
    }
    melhorShare = Math.min(0.6, melhorShare * 1.1);
  }
  const tetoDe = (code: string, capt: number) => {
    const tot = totalMun.get(code) ?? 0;
    const campo = campoMun.get(code) ?? 0;
    if (temVotoProprio) return Math.min(campo, melhorShare * tot);
    if (temAlcance) {
      // teto = projeção atual × (1 + 1,5·alcance): só há espaço real onde o
      // candidato TEM pé. Alcance 0,9 → teto ~2,4× o atual; alcance 0,05 → ~1,1×.
      const a = alc[code] ?? 0;
      return Math.min(campo, candVotos(code, capt) * (1 + 1.5 * a));
    }
    return Math.min(campo, candVotos(code, capt) * 2.5);
  };

  // valores centrais (captação = modo) para os painéis determinísticos
  let votosBaseCentral = 0;
  let ganhoLacunasCentral = 0;
  const alvos: MunicipioAlvo[] = [];
  const dispersao: PontoDispersao[] = [];
  for (const code of totalMun.keys()) {
    const atual = candVotos(code, CAPT_MODE);
    votosBaseCentral += atual;
    const teto = tetoDe(code, CAPT_MODE);
    const gap = Math.max(0, teto - atual);
    const ifet = args.ifetByCode[code] ?? 0;
    ganhoLacunasCentral += gap * (ifet / 100);
    const tot = totalMun.get(code) ?? 0;
    if (tot > 800) {
      dispersao.push({
        code,
        nome: args.nomeByCode[code] ?? code,
        share: tot > 0 ? atual / tot : 0,
        ifet: Math.round(ifet),
        gap: Math.round(gap),
        alvo: false,
      });
    }
    if (gap > 30) {
      alvos.push({
        code,
        nome: args.nomeByCode[code] ?? code,
        ganhoPotencial: Math.round(gap * 0.4),
        ifet: Math.round(ifet),
      });
    }
  }
  // ordena por ganho × prioridade × alcance — não manda para a maior cidade
  // só porque a lacuna nominal lá é grande.
  const alcOf = (code: string) => (temAlcance ? 0.25 + 0.75 * (alc[code] ?? 0) : 1);
  alvos.sort(
    (a, b) =>
      b.ganhoPotencial * (b.ifet / 100) * alcOf(b.code) -
      a.ganhoPotencial * (a.ifet / 100) * alcOf(a.code),
  );
  const alvoSet = new Set(alvos.slice(0, 6).map((a) => a.code));
  for (const p of dispersao) p.alvo = alvoSet.has(p.code);

  const totalValidos = [...totalMun.values()].reduce((s, v) => s + v, 0);
  const eleitoradoAprox =
    [...Object.values(args.populacaoByCode)].reduce((s, v) => s + v, 0) * 0.72;

  const votosNecessarios =
    tipoDisputa === "majoritaria"
      ? Math.round(totalValidos * 0.5)
      : (args.corteEleito ?? Math.round(votosBaseCentral * 0.9 + 20000));

  // ---------- Monte Carlo (modelo de crescimento calibrado) ----------
  // referência = nível do candidato hoje (voto próprio, base sintética ou partido).
  const codes = [...totalMun.keys()];
  const ref = codes.reduce((s, code) => s + candVotos(code, CAPT_MODE), 0);
  const cr = temVotoProprio ? CRESC.proprio : CRESC.sintetico;
  // mediana do lognormal = drift → mu = ln(drift)
  const muG = Math.log(Math.max(1e-6, cr.drift));

  const totais: number[] = [];
  for (let s = 0; s < nSims; s++) {
    // crescimento individual do candidato entre eleições (o termo dominante)
    const growth = Math.exp(muG + normal(0, cr.sigma));
    // fatores de contexto, menores, centrados em 1
    const mare = normal(1, 0.05);
    const comp = normal(1, 0.03);
    const exec = normal(1, 0.06); // execução de campanha / erro do modelo
    const total = Math.max(0, ref * growth * mare * comp * exec);
    totais.push(total);
  }
  totais.sort((a, b) => a - b);
  const distribuicao: Distribuicao = {
    p10: Math.round(quantil(totais, 0.1)),
    p25: Math.round(quantil(totais, 0.25)),
    p50: Math.round(quantil(totais, 0.5)),
    p75: Math.round(quantil(totais, 0.75)),
    p90: Math.round(quantil(totais, 0.9)),
  };
  const probVitoria =
    totais.filter((v) => v >= votosNecessarios).length / (totais.length || 1);

  const votosBase = distribuicao.p50;

  const classificar = (v: number): ResultadoCenario => {
    if (v >= votosNecessarios) return "vitoria";
    if (v >= votosNecessarios * 0.85) return "disputa";
    return "derrota";
  };

  const cenarios: Cenario[] = [
    {
      chave: "adverso",
      nome: txt.adverso,
      premissas: [txt.premissaCompBaixo, txt.premissaMareRuim, txt.premissaAdvConsolida],
      votos: distribuicao.p10,
      faixa: [distribuicao.p10, distribuicao.p25],
      resultado: classificar(distribuicao.p10),
    },
    {
      chave: "base",
      nome: txt.base,
      premissas: [txt.premissaBase],
      votos: distribuicao.p50,
      faixa: [distribuicao.p25, distribuicao.p75],
      resultado: classificar(distribuicao.p50),
    },
    {
      chave: "favoravel",
      nome: txt.favoravel,
      premissas: [txt.premissaMareBoa, txt.premissaLacunas],
      votos: distribuicao.p90,
      faixa: [distribuicao.p75, distribuicao.p90],
      resultado: classificar(distribuicao.p90),
    },
  ];

  const capturaLacunas = Math.round(ganhoLacunasCentral * 0.3);
  const sensibilidade = [
    { fator: txt.fatorLacunas, impacto: capturaLacunas },
    { fator: txt.fatorMare, impacto: Math.round(votosBase * 0.1) },
    {
      fator: txt.fatorComparecimento,
      impacto: Math.round(
        0.05 * eleitoradoAprox * (totalValidos > 0 ? votosBase / totalValidos : 0),
      ),
    },
  ].sort((a, b) => b.impacto - a.impacto);

  return {
    version: CENARIOS_VERSION,
    tipoDisputa,
    baseProjecao,
    votosBase,
    votosNecessarios,
    faltam: votosNecessarios - votosBase,
    distribuicao,
    probVitoria,
    sims: nSims,
    cenarios,
    municipiosAlvo: alvos.slice(0, 6),
    dispersao: dispersao.sort((a, b) => b.gap - a.gap).slice(0, 120),
    sensibilidade,
    fontes: [
      temVotoProprio
        ? "TSE / Base dos Dados — votação do candidato por município"
        : temAlcance
          ? "NeoVoto — Base do Candidato (alcance territorial)"
          : "TSE / Base dos Dados — votação do partido por município",
      "NeoVoto — IFET (prioridade territorial)",
      "IBGE — população (estimativa de eleitorado)",
    ],
  };
}
