/**
 * Sistema de cor da plataforma além da paleta da marca.
 * Componentes usam `var(--color-*)` (definidos em globals.css) para respeitar
 * o tema; aqui ficam só os mapeamentos de lógica → token e a paleta de partido.
 */

export type Urgencia = "crit" | "high" | "med" | "low" | "none";

export const urgVar = (u: Urgencia) => `var(--color-urg-${u})`;
export const catVar = (i: number) => `var(--color-cat-${(i % 10) + 1})`;
export const cmpVar = (k: "self" | "other" | "third") => `var(--color-cmp-${k})`;

/** score 0–100 onde MAIOR = mais urgente (ex.: IFET, saliência de tema) */
export function urgenciaDeScore(v: number): Urgencia {
  if (v >= 80) return "crit";
  if (v >= 60) return "high";
  if (v >= 40) return "med";
  if (v >= 20) return "low";
  return "none";
}

/** quadrante do IFET → urgência (prioridade máxima = agir agora) */
export const URGENCIA_QUADRANTE: Record<string, Urgencia> = {
  "prioridade-maxima": "crit",
  consolidar: "low",
  "oportunidade-dispersa": "high",
  "baixa-prioridade": "none",
};

/** tipo do Radar → urgência */
export const URGENCIA_RADAR: Record<string, Urgencia> = {
  exposicao: "crit",
  lacuna: "high",
  monitorar: "med",
  consolidar: "low",
};

/** resultado de cenário → urgência (derrota = crítico) */
export const URGENCIA_RESULTADO: Record<string, Urgencia> = {
  derrota: "crit",
  disputa: "high",
  vitoria: "low",
};

/** afinidade de aliança → urgência-ish (tensão = alerta) */
export const URGENCIA_AFINIDADE: Record<string, Urgencia> = {
  tensao: "crit",
  neutro: "med",
  afim: "low",
};

/**
 * Cor aproximada de cada partido (baseada na identidade visual conhecida).
 * Só para gráficos/legendas.
 */
const PARTY_COLOR: Record<string, string> = {
  PT: "#c4122e",
  PSOL: "#c0006f",
  PCDOB: "#a50021",
  PSB: "#e8b000",
  PDT: "#e2001a",
  PV: "#2e9e3f",
  REDE: "#00a19a",
  MDB: "#1f9e4b",
  PSD: "#1b75bb",
  PSDB: "#0072c6",
  PODE: "#0a5c8a",
  PODEMOS: "#0a5c8a",
  CIDADANIA: "#e94e1b",
  SOLIDARIEDADE: "#f47920",
  AVANTE: "#00539f",
  PROS: "#f58220",
  PMN: "#e6007e",
  MOBILIZA: "#f5a623",
  PL: "#1f3a93",
  PP: "#2b5aa8",
  REPUBLICANOS: "#1e6fb8",
  UNIAO: "#0a3d91",
  "UNIÃO": "#0a3d91",
  NOVO: "#f58220",
  PRD: "#3a4a9f",
  PATRIOTA: "#0f6b3f",
  PRTB: "#009e49",
  DC: "#1d6f42",
  AGIR: "#8dc63f",
  PTB: "#e30613",
  PMB: "#7a4fa3",
};

export function partidoColor(sigla: string): string {
  return PARTY_COLOR[(sigla || "").toUpperCase().trim()] ?? "#8b93a1";
}

/** interpola dois hex (#rrggbb) */
export function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const p = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))));
  return `#${p.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
