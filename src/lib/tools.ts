import type { Dictionary } from "@/lib/i18n";
import {
  Network,
  LayoutGrid,
  Flame,
  MessageSquareText,
  Sigma,
  Handshake,
  type LucideIcon,
} from "lucide-react";

export type ToolId =
  | "mapa-de-influencia"
  | "matriz-ideologica"
  | "mapa-de-calor"
  | "mapa-de-propostas"
  | "cenarios"
  | "coligacoes";

export type ToolMeta = {
  id: ToolId;
  icon: LucideIcon;
  /** chave dentro de dict.tools */
  key: keyof Dictionary["tools"];
  /** fontes oficiais que alimentam a ferramenta (ver docs/FONTES-DE-DADOS.md) */
  sources: string[];
};

export const TOOLS: ToolMeta[] = [
  {
    id: "mapa-de-influencia",
    icon: Network,
    key: "influenceMap",
    sources: ["TSE — Resultados", "TSE — Candidatos e coligações", "Câmara/Senado — mandatos"],
  },
  {
    id: "matriz-ideologica",
    icon: LayoutGrid,
    key: "ideologicalMatrix",
    sources: ["TSE — Resultados por partido", "IBGE — indicadores socioeconômicos"],
  },
  {
    id: "mapa-de-calor",
    icon: Flame,
    key: "influenceHeatmap",
    sources: ["TSE — Resultados por zona e município", "IBGE — malhas territoriais"],
  },
  {
    id: "mapa-de-propostas",
    icon: MessageSquareText,
    key: "proposalMap",
    sources: [
      "TSE — Propostas de governo",
      "Câmara — Proposições e temas",
      "Senado — Matérias legislativas",
    ],
  },
  {
    id: "cenarios",
    icon: Sigma,
    key: "scenarios",
    sources: [
      "TSE — Séries históricas",
      "IBGE — projeções e indicadores",
      "TSE — Prestação de contas (fundo e tempo)",
    ],
  },
  {
    id: "coligacoes",
    icon: Handshake,
    key: "coalitions",
    sources: [
      "TSE — Coligações e federações",
      "TSE — Votação histórica por partido",
      "TSE — Fundo partidário e tempo de propaganda",
    ],
  },
];

export function toolPath(id: ToolId): string {
  return `/painel/${id}`;
}

export function buildToolNames(
  t: Dictionary,
): Record<ToolId, string> {
  const out = {} as Record<ToolId, string>;
  for (const tool of TOOLS) out[tool.id] = t.tools[tool.key].name;
  return out;
}

export function getTool(id: ToolId): ToolMeta {
  const tool = TOOLS.find((x) => x.id === id);
  if (!tool) throw new Error(`Ferramenta desconhecida: ${id}`);
  return tool;
}
