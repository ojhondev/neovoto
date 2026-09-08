/**
 * Coligações / alianças (Fase 1).
 * Mede, para a candidatura ativa, o que cada partido adicionaria: voto novo no
 * território (descontada a sobreposição de base), bancada federal (proxy de
 * fundo partidário e tempo de propaganda) e afinidade ideológica.
 *
 * Coligação proporcional é proibida desde 2020 (EC 97/2017) — o cálculo vale
 * para a majoritária e para federações partidárias. Base: votação por partido
 * e município no último pleito proporcional (Base dos Dados) + bancada da Câmara.
 */
import { eixoDoPartido, PARTIDOS_VERSION } from "@/lib/intel/partidos";

export const COLIGACOES_VERSION = `coligacoes-v1 · ${PARTIDOS_VERSION}`;
export const COLIGACOES_PLEITO = { ano: 2022, turno: 1, cargo: "deputado federal" };

export type Afinidade = "afim" | "neutro" | "tensao";

export type Parceiro = {
  sigla: string;
  ganhoBruto: number;
  sobreposicao: number; // 0..1
  ganhoLiquido: number; // ponto central (desconto de sobreposição = 0,7)
  ganhoLiquidoMin: number; // cenário de forte redundância (desconto 0,9)
  ganhoLiquidoMax: number; // cenário sem perda — traz o voto inteiro (backtest §F: acontece)
  bancada: number;
  afinidade: Afinidade;
};

export type ColigacoesResultado = {
  version: string;
  pleito: string;
  partidoBase: string;
  baseVotos: number;
  parceiros: Parceiro[];
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

function afinidadeEntre(base: string, outro: string): Afinidade {
  const a = eixoDoPartido(base);
  const b = eixoDoPartido(outro);
  if (!a || !b) return "neutro";
  const d = Math.hypot(a.eco - b.eco, a.soc - b.soc);
  if (d <= 0.5) return "afim";
  if (d <= 1.1) return "neutro";
  return "tensao";
}

export function computeColigacoes(
  votacao: { idMunicipio: string; sigla: string; votos: number }[],
  partidoBase: string,
  bancada: Record<string, number>,
): ColigacoesResultado {
  const base = (partidoBase || "").toUpperCase();

  // voto absoluto por partido×município + total por município
  const porPartido = new Map<string, Map<string, number>>();
  const totalMun = new Map<string, number>();
  for (const r of votacao) {
    if (!porPartido.has(r.sigla)) porPartido.set(r.sigla, new Map());
    const m = porPartido.get(r.sigla)!;
    m.set(r.idMunicipio, (m.get(r.idMunicipio) ?? 0) + r.votos);
    totalMun.set(r.idMunicipio, (totalMun.get(r.idMunicipio) ?? 0) + r.votos);
  }

  // vetor de PERFIL GEOGRÁFICO = share do partido dentro de cada município
  // (tira o efeito população: mede se disputam os mesmos eleitores, não o tamanho)
  const perfil = (v: Map<string, number>) => {
    const out = new Map<string, number>();
    for (const [code, votos] of v) {
      const tot = totalMun.get(code) ?? 0;
      if (tot > 0) out.set(code, votos / tot);
    }
    return out;
  };

  const vetorBase = porPartido.get(base) ?? new Map<string, number>();
  const perfilBase = perfil(vetorBase);
  const baseVotos = [...vetorBase.values()].reduce((s, v) => s + v, 0);

  const parceiros: Parceiro[] = [];
  for (const [sigla, vetor] of porPartido) {
    if (sigla === base) continue;
    const bruto = [...vetor.values()].reduce((s, v) => s + v, 0);
    if (bruto < 500) continue;
    const overlap = baseVotos > 0 ? cosine(perfil(vetor), perfilBase) : 0;
    parceiros.push({
      sigla,
      ganhoBruto: bruto,
      sobreposicao: Math.round(overlap * 100) / 100,
      ganhoLiquido: Math.round(bruto * (1 - overlap * 0.7)),
      ganhoLiquidoMin: Math.round(bruto * (1 - overlap * 0.9)),
      ganhoLiquidoMax: bruto,
      bancada: bancada[sigla] ?? 0,
      afinidade: afinidadeEntre(base, sigla),
    });
  }

  parceiros.sort((a, b) => b.ganhoLiquido - a.ganhoLiquido);

  return {
    version: COLIGACOES_VERSION,
    pleito: `${COLIGACOES_PLEITO.cargo} ${COLIGACOES_PLEITO.ano}`,
    partidoBase: base,
    baseVotos,
    parceiros,
    fontes: [
      "TSE / Base dos Dados — votação por partido e município",
      "Câmara dos Deputados — composição das bancadas",
      "NeoVoto — escala ideológica de partido (editável)",
    ],
  };
}
