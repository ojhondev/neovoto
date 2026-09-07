/**
 * Dados ILUSTRATIVOS para o Mapa de Influência.
 * Formato aproxima o que virá do TSE (resultados + coligações) e das casas legislativas.
 * Nenhum dado real de pessoa natural. Ver docs/FONTES-DE-DADOS.md.
 */
export type InfluenceNode = {
  id: string;
  label: string;
  kind: "lideranca" | "mandato" | "partido" | "coligacao";
  x: number; // 0..1
  y: number; // 0..1
  weight: number; // 0..1 — peso eleitoral relativo
  heat: number; // 0..1 — contestação/risco
};

export type InfluenceEdge = {
  from: string;
  to: string;
  intensity: number; // 0..1 — força do vínculo / transferência de voto observada
  kind: "coligacao" | "historico" | "territorial";
};

export const influenceMapMock: {
  region: string;
  updatedAt: string;
  nodes: InfluenceNode[];
  edges: InfluenceEdge[];
  callouts: { x: number; y: number; label: string; metric: string }[];
} = {
  region: "Exemplo — capital + região metropolitana",
  updatedAt: "2024-10-06",
  nodes: [
    { id: "a", label: "Bloco A", kind: "coligacao", x: 0.22, y: 0.28, weight: 0.95, heat: 0.4 },
    { id: "b", label: "Liderança regional", kind: "lideranca", x: 0.44, y: 0.18, weight: 0.6, heat: 0.68 },
    { id: "c", label: "Mandato estadual", kind: "mandato", x: 0.63, y: 0.3, weight: 0.7, heat: 0.52 },
    { id: "d", label: "Partido X", kind: "partido", x: 0.5, y: 0.52, weight: 0.8, heat: 0.3 },
    { id: "e", label: "Prefeitura vizinha", kind: "mandato", x: 0.78, y: 0.6, weight: 0.55, heat: 0.75 },
    { id: "f", label: "Bloco B", kind: "coligacao", x: 0.3, y: 0.66, weight: 0.85, heat: 0.58 },
    { id: "g", label: "Liderança comunitária", kind: "lideranca", x: 0.16, y: 0.82, weight: 0.35, heat: 0.24 },
    { id: "h", label: "Federação Y", kind: "partido", x: 0.68, y: 0.82, weight: 0.65, heat: 0.44 },
  ],
  edges: [
    { from: "a", to: "b", intensity: 0.55, kind: "territorial" },
    { from: "a", to: "d", intensity: 0.8, kind: "coligacao" },
    { from: "b", to: "c", intensity: 0.7, kind: "historico" },
    { from: "c", to: "d", intensity: 0.42, kind: "historico" },
    { from: "d", to: "f", intensity: 0.6, kind: "coligacao" },
    { from: "c", to: "e", intensity: 0.78, kind: "territorial" },
    { from: "f", to: "g", intensity: 0.35, kind: "territorial" },
    { from: "d", to: "h", intensity: 0.5, kind: "historico" },
    { from: "e", to: "h", intensity: 0.66, kind: "territorial" },
  ],
  callouts: [
    { x: 0.44, y: 0.18, label: "Reforçar aliança", metric: "68% risco" },
    { x: 0.78, y: 0.6, label: "Base a disputar", metric: "75% risco" },
    { x: 0.3, y: 0.66, label: "Ponte entre blocos", metric: "peso 0,85" },
  ],
};
