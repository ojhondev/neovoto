/**
 * Rede de pessoas — a bancada federal da UF como uma REDE DE MANDATOS, não de
 * partidos. A copy promete "rede de lideranças e mandatos, arestas por votação
 * nominal conjunta". Aqui:
 *
 *   nós    = deputados federais da UF (+ o candidato, se conhecido)
 *   posição = ponto ideal da votação nominal (1º componente da matriz de
 *             concordância) — quem vota parecido fica perto
 *   arestas = concordância de voto ≥ limiar entre dois deputados
 *   blocos  = aliado / adversário / neutro, pela distância ao candidato
 *
 * Federações de 2022 entram como marcador de nó. Deputado sem votos suficientes
 * fica de fora (não dá pra posicionar).
 */
import { eixoDoPartido } from "@/lib/intel/partidos";
import { FEDERACOES_2022, type RollCall } from "@/lib/data-sources/camara";

export const REDE_PESSOAS_VERSION = "rede-pessoas-v1";

export type Campo = "aliado" | "adversario" | "neutro";

export type NoPessoa = {
  id: string;
  nome: string;
  partido: string;
  federacao: string | null;
  x: number; // ponto ideal (−1..1)
  concordanciaComCampo: number; // 0..1 — média de concordância com a bancada do campo do candidato
  presenca: number; // 0..1 — fração das votações em que votou sim/não
  campo: Campo;
};

export type ArestaPessoa = { a: string; b: string; forca: number };

export type RedePessoasResultado = {
  version: string;
  uf: string;
  partidoBase: string;
  candidatoConhecido: boolean;
  nVotacoes: number;
  nos: NoPessoa[];
  arestas: ArestaPessoa[];
  aliadosSolidos: NoPessoa[]; // campo afim E votam junto
  aliadosPorCortesia: NoPessoa[]; // partido afim mas votam pouco com o campo
  adversarios: NoPessoa[];
  coesaoAdversario: number; // 0..1 — o quão unido o bloco adversário vota
  fontes: string[];
};

/** concordância entre dois vetores de voto (só onde ambos votaram sim/não). */
function concordancia(a: number[], b: number[]): { c: number; n: number } {
  let iguais = 0;
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== 0 && b[i] !== 0) {
      n++;
      if (a[i] === b[i]) iguais++;
    }
  }
  return { c: n > 0 ? iguais / n : 0.5, n };
}

/** 1º componente principal de uma matriz simétrica (power iteration). */
function pc1(M: number[][]): number[] {
  const n = M.length;
  if (n === 0) return [];
  let v = new Array(n).fill(0).map(() => Math.random() - 0.5);
  for (let it = 0; it < 150; it++) {
    const nv = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nv[i] += M[i][j] * v[j];
    const norm = Math.hypot(...nv) || 1;
    v = nv.map((x) => x / norm);
  }
  return v;
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

export function computeRedePessoas(
  rollCall: RollCall,
  uf: string,
  partidoBase: string,
): RedePessoasResultado {
  const base = (partidoBase || "").toUpperCase();
  const nVot = rollCall.votacoes.length;

  // deputados da UF com votos suficientes
  const deps = Object.entries(rollCall.byDeputado)
    .filter(([, d]) => d.uf === uf.toUpperCase())
    .map(([id, d]) => ({
      id,
      ...d,
      presenca: d.votos.filter((v) => v !== 0).length / Math.max(1, nVot),
    }))
    .filter((d) => d.presenca >= 0.3);

  const candidatoConhecido = !!eixoDoPartido(base);

  if (deps.length < 3) {
    return {
      version: REDE_PESSOAS_VERSION,
      uf: uf.toUpperCase(),
      partidoBase: base,
      candidatoConhecido,
      nVotacoes: nVot,
      nos: [],
      arestas: [],
      aliadosSolidos: [],
      aliadosPorCortesia: [],
      adversarios: [],
      coesaoAdversario: 0,
      fontes: ["Câmara dos Deputados — votações nominais do plenário"],
    };
  }

  // matriz de concordância
  const K = deps.length;
  const C: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));
  for (let i = 0; i < K; i++) {
    C[i][i] = 1;
    for (let j = i + 1; j < K; j++) {
      const { c, n } = concordancia(deps[i].votos, deps[j].votos);
      const val = n >= 5 ? c : 0.5;
      C[i][j] = val;
      C[j][i] = val;
    }
  }

  // ponto ideal = pc1 da matriz centrada (concordância − 0,5)
  const M = C.map((row) => row.map((x) => x - 0.5));
  let axis = pc1(M);
  // orienta: o campo do candidato fica do lado negativo se for esquerda, senão positivo
  const eixoBase = eixoDoPartido(base);
  const lrBase = eixoBase ? (eixoBase.eco + eixoBase.soc) / 2 : 0;
  const somaCampo = deps.reduce((s, d, i) => (campoDe(base, d.partido) === "aliado" ? s + axis[i] : s), 0);
  if ((lrBase < 0 && somaCampo > 0) || (lrBase >= 0 && somaCampo < 0)) axis = axis.map((x) => -x);
  // normaliza para −1..1
  const maxAbs = Math.max(...axis.map((x) => Math.abs(x)), 1e-6);
  axis = axis.map((x) => x / maxAbs);

  // bancada do campo do candidato (para "concordância com o campo")
  const idxCampo = deps.map((d, i) => (campoDe(base, d.partido) === "aliado" ? i : -1)).filter((i) => i >= 0);

  const nos: NoPessoa[] = deps.map((d, i) => {
    const conc =
      idxCampo.length > 0
        ? idxCampo.reduce((s, j) => s + (i === j ? 1 : C[i][j]), 0) / idxCampo.length
        : 0.5;
    return {
      id: d.id,
      nome: d.nome,
      partido: d.partido,
      federacao: FEDERACOES_2022[d.partido] ?? null,
      x: Math.round(axis[i] * 100) / 100,
      concordanciaComCampo: Math.round(conc * 100) / 100,
      presenca: Math.round(d.presenca * 100) / 100,
      campo: campoDe(base, d.partido),
    };
  });

  // arestas — concordância alta
  const arestas: ArestaPessoa[] = [];
  for (let i = 0; i < K; i++) {
    for (let j = i + 1; j < K; j++) {
      if (C[i][j] >= 0.75) arestas.push({ a: deps[i].id, b: deps[j].id, forca: Math.round(C[i][j] * 100) / 100 });
    }
  }

  const aliados = nos.filter((n) => n.campo === "aliado");
  const aliadosSolidos = aliados
    .filter((n) => n.concordanciaComCampo >= 0.8)
    .sort((a, b) => b.concordanciaComCampo - a.concordanciaComCampo);
  const aliadosPorCortesia = aliados
    .filter((n) => n.concordanciaComCampo < 0.8)
    .sort((a, b) => a.concordanciaComCampo - b.concordanciaComCampo);
  const adversarios = nos.filter((n) => n.campo === "adversario").sort((a, b) => b.presenca - a.presenca);

  // coesão do bloco adversário = concordância média entre seus membros
  const idxAdv = deps.map((d, i) => (nos[i].campo === "adversario" ? i : -1)).filter((i) => i >= 0);
  let somaAdv = 0;
  let paresAdv = 0;
  for (let a = 0; a < idxAdv.length; a++)
    for (let b = a + 1; b < idxAdv.length; b++) {
      somaAdv += C[idxAdv[a]][idxAdv[b]];
      paresAdv++;
    }
  const coesaoAdversario = paresAdv > 0 ? Math.round((somaAdv / paresAdv) * 100) / 100 : 0;

  return {
    version: REDE_PESSOAS_VERSION,
    uf: uf.toUpperCase(),
    partidoBase: base,
    candidatoConhecido,
    nVotacoes: nVot,
    nos: nos.sort((a, b) => a.x - b.x),
    arestas,
    aliadosSolidos: aliadosSolidos.slice(0, 8),
    aliadosPorCortesia: aliadosPorCortesia.slice(0, 6),
    adversarios: adversarios.slice(0, 8),
    coesaoAdversario,
    fontes: [
      "Câmara dos Deputados — votações nominais do plenário (últimos ~6 meses)",
      "NeoVoto — escala ideológica de partido (Bolognesi 2022)",
    ],
  };
}
