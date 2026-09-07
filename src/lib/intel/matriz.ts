/**
 * Matriz Ideológica por Região (Fase 1).
 * Posiciona cada município nos eixos econômico e de costumes a partir da
 * votação agregada POR PARTIDO no último pleito presidencial (o termômetro
 * ideológico mais comparável do país), ajustada levemente pelo contexto
 * de renda (IBGE). Sem qualquer inferência sobre indivíduos.
 *
 * Método explicável: posição do município = média das posições dos partidos
 * ponderada pelo voto. A escala de partido é transparente e editável
 * (src/lib/intel/partidos.ts).
 */
import { eixoDoPartido, PARTIDOS_VERSION } from "@/lib/intel/partidos";

export const MATRIZ_VERSION = `matriz-v1 · ${PARTIDOS_VERSION}`;

/**
 * Pleito usado como pano de fundo ideológico. Deputado federal (proporcional)
 * espalha os municípios muito melhor que o presidencial — 30+ partidos em vez
 * de uma disputa bipolar que vira só um eixo esquerda-direita.
 */
export const MATRIZ_PLEITO = { ano: 2022, turno: 1, cargo: "deputado federal" };

export type MunicipioMatriz = {
  code: string;
  nome: string;
  eco: number; // -1..1
  soc: number; // -1..1
  populacao: number;
  votos: number;
  distancia: number; // ao candidato (0 = idêntico)
};

export type MatrizResultado = {
  version: string;
  pleito: string;
  candidato: { eco: number; soc: number; partido: string; conhecido: boolean };
  municipios: MunicipioMatriz[];
  ufMedia: { eco: number; soc: number };
  maisAfins: MunicipioMatriz[];
  maisDistantes: MunicipioMatriz[];
  cobertura: number; // 0..1 — fração do voto classificável
  fontes: string[];
};

function percentRank(values: number[]): (v: number) => number {
  const s = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  if (s.length === 0) return () => 0.5;
  const lo = s[Math.floor(s.length * 0.05)] ?? s[0];
  const hi = s[Math.ceil(s.length * 0.95) - 1] ?? s[s.length - 1];
  return (v: number) => (hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 0.5);
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export function computeMatriz(
  votacao: { idMunicipio: string; sigla: string; votos: number }[],
  ibge: { nomeByCode: Record<string, string>; populacaoByCode: Record<string, number>; pibByCode: Record<string, number> },
  partidoCandidato: string,
): MatrizResultado {
  // agrupa voto por município
  const porMun = new Map<string, Map<string, number>>();
  for (const r of votacao) {
    if (!porMun.has(r.idMunicipio)) porMun.set(r.idMunicipio, new Map());
    const m = porMun.get(r.idMunicipio)!;
    m.set(r.sigla, (m.get(r.sigla) ?? 0) + r.votos);
  }

  // rank de PIB per capita para o ajuste de contexto
  const pibPc: Record<string, number> = {};
  for (const [code, pib] of Object.entries(ibge.pibByCode)) {
    const pop = ibge.populacaoByCode[code] ?? 0;
    pibPc[code] = pop > 0 ? pib / pop : 0;
  }
  const rankPib = percentRank(Object.values(pibPc));

  let votosTotais = 0;
  let votosClassificados = 0;
  const municipios: MunicipioMatriz[] = [];

  for (const [code, votosPartido] of porMun) {
    let somaClass = 0;
    let somaTodos = 0;
    let ecoAcc = 0;
    let socAcc = 0;
    for (const [sigla, v] of votosPartido) {
      somaTodos += v;
      const eixo = eixoDoPartido(sigla);
      if (eixo) {
        somaClass += v;
        ecoAcc += v * eixo.eco;
        socAcc += v * eixo.soc;
      }
    }
    votosTotais += somaTodos;
    votosClassificados += somaClass;
    if (somaClass < 50) continue;

    let eco = ecoAcc / somaClass;
    const soc = socAcc / somaClass;
    // ajuste leve de contexto: renda mais alta empurra o eixo econômico
    // em direção ao mercado (no máx. ±0,12).
    eco = clamp(eco + 0.12 * (rankPib(pibPc[code] ?? 0) - 0.5) * 2);

    municipios.push({
      code,
      nome: ibge.nomeByCode[code] ?? code,
      eco: Math.round(eco * 100) / 100,
      soc: Math.round(soc * 100) / 100,
      populacao: ibge.populacaoByCode[code] ?? 0,
      votos: somaTodos,
      distancia: 0,
    });
  }

  const eixoCand = eixoDoPartido(partidoCandidato);
  const candidato = {
    eco: eixoCand?.eco ?? 0,
    soc: eixoCand?.soc ?? 0,
    partido: (partidoCandidato || "").toUpperCase(),
    conhecido: !!eixoCand,
  };

  for (const m of municipios) {
    m.distancia =
      Math.round(Math.hypot(m.eco - candidato.eco, m.soc - candidato.soc) * 100) / 100;
  }

  // média da UF ponderada por população
  let we = 0;
  let ws = 0;
  let wp = 0;
  for (const m of municipios) {
    we += m.eco * m.populacao;
    ws += m.soc * m.populacao;
    wp += m.populacao;
  }
  const ufMedia = {
    eco: Math.round((wp ? we / wp : 0) * 100) / 100,
    soc: Math.round((wp ? ws / wp : 0) * 100) / 100,
  };

  const popMediana = mediana(municipios.map((m) => m.populacao));
  const relevantes = municipios.filter((m) => m.populacao >= popMediana);
  const maisAfins = [...relevantes].sort((a, b) => a.distancia - b.distancia).slice(0, 6);
  const maisDistantes = [...relevantes].sort((a, b) => b.distancia - a.distancia).slice(0, 6);

  return {
    version: MATRIZ_VERSION,
    pleito: `${MATRIZ_PLEITO.cargo} ${MATRIZ_PLEITO.ano} · ${MATRIZ_PLEITO.turno}º turno`,
    candidato,
    municipios: municipios.sort((a, b) => b.populacao - a.populacao),
    ufMedia,
    maisAfins,
    maisDistantes,
    cobertura: votosTotais ? votosClassificados / votosTotais : 0,
    fontes: [
      "TSE / Base dos Dados — votação por partido e município",
      "IBGE — PIB dos Municípios (ajuste de contexto)",
      "NeoVoto — escala ideológica de partido (editável)",
    ],
  };
}

function mediana(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
