/**
 * Cenários (Fase 1 — heurístico, sem simulação estocástica).
 * Projeta o resultado da candidatura a partir de PREMISSAS EXPLÍCITAS
 * (maré nacional, comparecimento, conversão das lacunas territoriais) sobre a
 * votação real por município e o IFET. NÃO é previsão: é "se estas premissas
 * valerem, o resultado tende a ficar nesta faixa". Uso interno (Lei 9.504).
 *
 * A versão estatística (Monte Carlo / bayesiano + backtesting) fica no serviço
 * Python — ver docs.
 */
import { eixoDoPartido } from "@/lib/intel/partidos";
import type { Cargo } from "@/lib/cargos";

export const CENARIOS_VERSION = "cenarios-v1-heuristico";

const MAJORITARIOS: Cargo[] = ["presidente", "governador", "senador", "prefeito"];

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
  share: number; // 0–1 — voto do candidato / total do município
  ifet: number; // 0–100
  gap: number; // votos a capturar
  alvo: boolean;
};

export type CenariosResultado = {
  version: string;
  tipoDisputa: "majoritaria" | "proporcional";
  baseProjecao: "votacao-propria" | "votacao-do-partido";
  votosBase: number;
  votosNecessarios: number;
  faltam: number; // >0 falta, <0 folga (no cenário base)
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
    votacaoPartido: { idMunicipio: string; sigla: string; votos: number }[];
    ifetByCode: Record<string, number>;
    populacaoByCode: Record<string, number>;
    nomeByCode: Record<string, string>;
    corteEleito: number | null;
  },
  txt: Textos,
): CenariosResultado {
  const tipoDisputa =
    args.cargo && MAJORITARIOS.includes(args.cargo) ? "majoritaria" : "proporcional";
  const campoBase = campoDe(args.partido);
  const mesmoCampo = (sigla: string) => Math.abs(campoDe(sigla) - campoBase) <= 0.45;

  // agrega por município
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
  const baseProjecao = temVotoProprio ? "votacao-propria" : "votacao-do-partido";

  const candVotos = (code: string) =>
    temVotoProprio ? args.votosCandidatoByCode![code] ?? 0 : partidoMun.get(code) ?? 0;

  // teto realista por município:
  //  - com voto próprio: "se performasse em todo lugar como no seu melhor município"
  //    (limitado ainda pelo tamanho do campo — não passa da soma dos aliados).
  //  - só partido (majoritária): o campo inteiro é capturável.
  let melhorShare = 0;
  if (temVotoProprio) {
    for (const code of totalMun.keys()) {
      const tot = totalMun.get(code) ?? 0;
      if (tot > 500) melhorShare = Math.max(melhorShare, candVotos(code) / tot);
    }
    melhorShare = Math.min(0.6, melhorShare * 1.1); // folga de 10%, teto absoluto 60%
  }
  const tetoDe = (code: string) => {
    const tot = totalMun.get(code) ?? 0;
    const campo = campoMun.get(code) ?? 0;
    if (temVotoProprio) return Math.min(campo, melhorShare * tot);
    return campo;
  };

  let votosBase = 0;
  let ganhoLacunas = 0; // Σ gap × ifet (potencial ponderado)
  const alvos: MunicipioAlvo[] = [];
  const dispersao: PontoDispersao[] = [];
  for (const code of totalMun.keys()) {
    const atual = candVotos(code);
    votosBase += atual;
    const teto = tetoDe(code);
    const gap = Math.max(0, teto - atual);
    const ifet = args.ifetByCode[code] ?? 0;
    const ponderado = gap * (ifet / 100);
    ganhoLacunas += ponderado;
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
  alvos.sort((a, b) => b.ganhoPotencial * (b.ifet / 100) - a.ganhoPotencial * (a.ifet / 100));
  const alvoSet = new Set(alvos.slice(0, 6).map((a) => a.code));
  for (const p of dispersao) p.alvo = alvoSet.has(p.code);

  const totalValidos = [...totalMun.values()].reduce((s, v) => s + v, 0);
  const eleitoradoAprox =
    [...Object.values(args.populacaoByCode)].reduce((s, v) => s + v, 0) * 0.72;

  const votosNecessarios =
    tipoDisputa === "majoritaria"
      ? Math.round(totalValidos * 0.5)
      : (args.corteEleito ?? Math.round(votosBase * 0.9 + 20000));

  const capturaLacunas = Math.round(ganhoLacunas * 0.3);

  const cenBase = Math.round(votosBase);
  const cenFav = Math.round(votosBase * 1.1 + capturaLacunas);
  const cenAdv = Math.round(votosBase * 0.88);

  const classificar = (v: number): ResultadoCenario => {
    if (v >= votosNecessarios) return "vitoria";
    if (v >= votosNecessarios * 0.85) return "disputa";
    return "derrota";
  };
  const faixa = (v: number, pct: number): [number, number] => [
    Math.round(v * (1 - pct)),
    Math.round(v * (1 + pct)),
  ];

  const cenarios: Cenario[] = [
    {
      chave: "base",
      nome: txt.base,
      premissas: [txt.premissaBase],
      votos: cenBase,
      faixa: faixa(cenBase, 0.07),
      resultado: classificar(cenBase),
    },
    {
      chave: "favoravel",
      nome: txt.favoravel,
      premissas: [txt.premissaMareBoa, txt.premissaLacunas],
      votos: cenFav,
      faixa: faixa(cenFav, 0.08),
      resultado: classificar(cenFav),
    },
    {
      chave: "adverso",
      nome: txt.adverso,
      premissas: [txt.premissaCompBaixo, txt.premissaMareRuim, txt.premissaAdvConsolida],
      votos: cenAdv,
      faixa: faixa(cenAdv, 0.08),
      resultado: classificar(cenAdv),
    },
  ];

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
    votosBase: cenBase,
    votosNecessarios,
    faltam: votosNecessarios - cenBase,
    cenarios,
    municipiosAlvo: alvos.slice(0, 6),
    dispersao: dispersao.sort((a, b) => b.gap - a.gap).slice(0, 120),
    sensibilidade,
    fontes: [
      temVotoProprio
        ? "TSE / Base dos Dados — votação do candidato por município"
        : "TSE / Base dos Dados — votação do partido por município",
      "NeoVoto — IFET (prioridade territorial)",
      "IBGE — população (estimativa de eleitorado)",
    ],
  };
}
