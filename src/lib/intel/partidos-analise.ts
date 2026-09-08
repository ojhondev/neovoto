/**
 * Análise de Partidos — correlações no estado.
 * Para cada par de partidos, a CORRELAÇÃO (Pearson) entre os perfis geográficos
 * de voto: quando um vai bem num município, o outro tende a ir bem (+) ou mal (−).
 * Positivo = disputam a mesma base; negativo = bases opostas.
 */
import { eixoDoPartido, PARTIDOS_VERSION } from "@/lib/intel/partidos";

export const PARTIDOS_ANALISE_VERSION = `partidos-analise-v1 · ${PARTIDOS_VERSION}`;
// Presidencial: correlações de base ideológica muito mais nítidas que o
// proporcional (onde o candidato pesa mais que o partido).
export const PARTIDOS_PLEITO = { ano: 2022, turno: 1, cargo: "presidente" };

export type NoPartidoAnalise = {
  sigla: string;
  votos: number;
  share: number;
  bancada: number;
  eco: number;
  soc: number;
  maisAfim: { sigla: string; forca: number } | null;
  maisOposto: { sigla: string; forca: number } | null;
};

export type PartidosResultado = {
  version: string;
  pleito: string;
  ordem: string[];
  matriz: number[][]; // Pearson −1..1, mesma ordem de `ordem`
  nos: NoPartidoAnalise[];
  fontes: string[];
};

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0) return 0;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    sa += a[i];
    sb += b[i];
  }
  const ma = sa / n;
  const mb = sb / n;
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0;
}

export function analisarPartidos(
  votacao: { idMunicipio: string; sigla: string; votos: number }[],
  bancada: Record<string, number>,
  limite = 14,
): PartidosResultado {
  const totalMun = new Map<string, number>();
  const porPartido = new Map<string, Map<string, number>>();
  let total = 0;
  for (const r of votacao) {
    totalMun.set(r.idMunicipio, (totalMun.get(r.idMunicipio) ?? 0) + r.votos);
    if (!porPartido.has(r.sigla)) porPartido.set(r.sigla, new Map());
    porPartido.get(r.sigla)!.set(r.idMunicipio, (porPartido.get(r.sigla)!.get(r.idMunicipio) ?? 0) + r.votos);
    total += r.votos;
  }
  const codes = [...totalMun.keys()];

  const tudo = [...porPartido.entries()]
    .map(([sigla, v]) => ({ sigla, votos: [...v.values()].reduce((s, x) => s + x, 0), v }))
    .sort((a, b) => b.votos - a.votos)
    .slice(0, limite);

  // vetor de share por município (na ordem de `codes`)
  const perfil = (v: Map<string, number>) =>
    codes.map((c) => {
      const tot = totalMun.get(c) ?? 0;
      return tot > 0 ? (v.get(c) ?? 0) / tot : 0;
    });
  const perfis = tudo.map((p) => perfil(p.v));

  const ordem = tudo.map((p) => p.sigla);
  const matriz: number[][] = tudo.map((_, i) =>
    tudo.map((__, j) => (i === j ? 1 : Math.round(pearson(perfis[i], perfis[j]) * 100) / 100)),
  );

  const nos: NoPartidoAnalise[] = tudo.map((p, i) => {
    const eixo = eixoDoPartido(p.sigla) ?? { eco: 0, soc: 0 };
    let maisAfim: { sigla: string; forca: number } | null = null;
    let maisOposto: { sigla: string; forca: number } | null = null;
    for (let j = 0; j < tudo.length; j++) {
      if (j === i) continue;
      const f = matriz[i][j];
      if (f >= 0.25 && (!maisAfim || f > maisAfim.forca)) maisAfim = { sigla: ordem[j], forca: f };
      if (f <= -0.25 && (!maisOposto || f < maisOposto.forca)) maisOposto = { sigla: ordem[j], forca: f };
    }
    return {
      sigla: p.sigla,
      votos: p.votos,
      share: total ? p.votos / total : 0,
      bancada: bancada[p.sigla] ?? 0,
      eco: eixo.eco,
      soc: eixo.soc,
      maisAfim,
      maisOposto,
    };
  });

  return {
    version: PARTIDOS_ANALISE_VERSION,
    pleito: `${PARTIDOS_PLEITO.cargo} ${PARTIDOS_PLEITO.ano}`,
    ordem,
    matriz,
    nos,
    fontes: [
      "TSE / Base dos Dados — votação por partido e município",
      "Câmara dos Deputados — bancadas",
      "NeoVoto — escala ideológica de partido",
    ],
  };
}
