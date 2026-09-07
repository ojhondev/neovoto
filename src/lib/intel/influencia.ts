/**
 * Mapa de Influência (Fase 1 — real).
 * Rede de partidos no estado da candidatura: tamanho = voto no último pleito
 * proporcional, posição = eixo ideológico, arestas = sobreposição de base
 * geográfica (disputam os mesmos eleitores nos mesmos municípios).
 * Deriva os blocos aliado / adversário / neutro e mostra onde a estrutura do
 * adversário é frágil e de quem o seu voto depende no território.
 */
import { eixoDoPartido, PARTIDOS_VERSION } from "@/lib/intel/partidos";

export const INFLUENCIA_VERSION = `influencia-v1 · ${PARTIDOS_VERSION}`;
export const INFLUENCIA_PLEITO = { ano: 2022, turno: 1, cargo: "deputado federal" };

export type Campo = "aliado" | "adversario" | "neutro";

export type NoInfluencia = {
  sigla: string;
  votos: number;
  share: number;
  bancada: number;
  eco: number;
  soc: number;
  campo: Campo;
};

export type ArestaInfluencia = { a: string; b: string; forca: number };

export type Bloco = { partidos: string[]; votos: number; share: number; bancada: number };

export type Fragilidade = {
  code: string;
  nome: string;
  advShare: number;
  seuShare: number;
};

export type Dependencia = {
  code: string;
  nome: string;
  seuShare: number;
  principal: string;
  principalShare: number;
};

export type InfluenciaResultado = {
  version: string;
  partidoBase: string;
  pleito: string;
  nos: NoInfluencia[];
  arestas: ArestaInfluencia[];
  aliado: Bloco;
  adversario: Bloco;
  neutro: Bloco;
  fragilidades: Fragilidade[];
  dependencias: Dependencia[];
  fontes: string[];
};

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (w) dot += v * w;
  }
  return na > 0 && nb > 0 ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function campoDe(base: string, outro: string): Campo {
  const a = eixoDoPartido(base);
  const b = eixoDoPartido(outro);
  if (!a || !b) return "neutro";
  const d = Math.hypot(a.eco - b.eco, a.soc - b.soc);
  if (d <= 0.5) return "aliado";
  if (d >= 1.1) return "adversario";
  return "neutro";
}

export function computeInfluencia(
  votacao: { idMunicipio: string; sigla: string; votos: number }[],
  partidoBase: string,
  bancada: Record<string, number>,
  nomeByCode: Record<string, string>,
): InfluenciaResultado {
  const base = (partidoBase || "").toUpperCase();

  const porPartido = new Map<string, Map<string, number>>();
  const totalMun = new Map<string, number>();
  let totalGeral = 0;
  for (const r of votacao) {
    if (!porPartido.has(r.sigla)) porPartido.set(r.sigla, new Map());
    porPartido.get(r.sigla)!.set(r.idMunicipio, (porPartido.get(r.sigla)!.get(r.idMunicipio) ?? 0) + r.votos);
    totalMun.set(r.idMunicipio, (totalMun.get(r.idMunicipio) ?? 0) + r.votos);
    totalGeral += r.votos;
  }

  // perfil geográfico = share do partido dentro de cada município
  const perfil = (v: Map<string, number>) => {
    const out = new Map<string, number>();
    for (const [code, votos] of v) {
      const tot = totalMun.get(code) ?? 0;
      if (tot > 0) out.set(code, votos / tot);
    }
    return out;
  };

  const nos: NoInfluencia[] = [];
  const perfis = new Map<string, Map<string, number>>();
  for (const [sigla, vetor] of porPartido) {
    const votos = [...vetor.values()].reduce((s, v) => s + v, 0);
    if (votos < totalGeral * 0.003) continue; // ignora nanicos
    const eixo = eixoDoPartido(sigla) ?? { eco: 0, soc: 0 };
    nos.push({
      sigla,
      votos,
      share: totalGeral ? votos / totalGeral : 0,
      bancada: bancada[sigla] ?? 0,
      eco: eixo.eco,
      soc: eixo.soc,
      campo: sigla === base ? "aliado" : campoDe(base, sigla),
    });
    perfis.set(sigla, perfil(vetor));
  }
  nos.sort((a, b) => b.votos - a.votos);

  // arestas entre os maiores
  const top = nos.slice(0, 12).map((n) => n.sigla);
  const arestas: ArestaInfluencia[] = [];
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const f = cosine(perfis.get(top[i])!, perfis.get(top[j])!);
      if (f >= 0.55) arestas.push({ a: top[i], b: top[j], forca: Math.round(f * 100) / 100 });
    }
  }

  const bloco = (campo: Campo): Bloco => {
    const ps = nos.filter((n) => n.campo === campo);
    const votos = ps.reduce((s, n) => s + n.votos, 0);
    return {
      partidos: ps.map((n) => n.sigla),
      votos,
      share: totalGeral ? votos / totalGeral : 0,
      bancada: ps.reduce((s, n) => s + n.bancada, 0),
    };
  };
  const aliado = bloco("aliado");
  const adversario = bloco("adversario");
  const neutro = bloco("neutro");

  // por município: share do bloco aliado e do adversário
  const advSet = new Set(adversario.partidos);
  const aliSet = new Set(aliado.partidos);
  const fragilidades: Fragilidade[] = [];
  const dependencias: Dependencia[] = [];
  for (const [code, tot] of totalMun) {
    if (tot < 1000) continue;
    let adv = 0;
    let ali = 0;
    let principal = "";
    let principalV = 0;
    for (const [sigla, vetor] of porPartido) {
      const v = vetor.get(code) ?? 0;
      if (advSet.has(sigla)) adv += v;
      if (aliSet.has(sigla)) ali += v;
      if (v > principalV) {
        principalV = v;
        principal = sigla;
      }
    }
    const advShare = adv / tot;
    const aliShare = ali / tot;
    if (advShare >= 0.28 && advShare <= 0.5 && aliShare >= 0.2) {
      fragilidades.push({ code, nome: nomeByCode[code] ?? code, advShare: r2(advShare), seuShare: r2(aliShare) });
    }
    if (aliShare >= 0.45 && aliSet.has(principal)) {
      dependencias.push({
        code,
        nome: nomeByCode[code] ?? code,
        seuShare: r2(aliShare),
        principal,
        principalShare: r2(principalV / tot),
      });
    }
  }
  fragilidades.sort((a, b) => b.seuShare - a.seuShare);
  dependencias.sort((a, b) => b.principalShare - a.principalShare);

  return {
    version: INFLUENCIA_VERSION,
    partidoBase: base,
    pleito: `${INFLUENCIA_PLEITO.cargo} ${INFLUENCIA_PLEITO.ano}`,
    nos,
    arestas,
    aliado,
    adversario,
    neutro,
    fragilidades: fragilidades.slice(0, 6),
    dependencias: dependencias.slice(0, 6),
    fontes: [
      "TSE / Base dos Dados — votação por partido e município",
      "Câmara dos Deputados — composição das bancadas",
      "NeoVoto — escala ideológica de partido (editável)",
    ],
  };
}

const r2 = (v: number) => Math.round(v * 100) / 100;
