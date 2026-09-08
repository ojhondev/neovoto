/**
 * Escala ideológica de partido — 2 eixos, transparente e editável.
 *   eco: -1 = Estado/redistribuição   ·   +1 = mercado/liberalismo econômico
 *   soc: -1 = liberal em costumes      ·   +1 = conservador em costumes
 *
 * Valores de partida a partir da literatura de ciência política (surveys de
 * elite parlamentar, placements acadêmicos e do jornalismo especializado).
 * É uma SIMPLIFICAÇÃO deliberada e um ponto de calibração — não um dado do TSE.
 * Ajustável na ficha metodológica interna.
 */
export const PARTIDOS_VERSION = "partidos-v2-2026";

export type EixoIdeologico = { eco: number; soc: number };

const ESCALA: Record<string, EixoIdeologico> = {
  // esquerda / centro-esquerda
  PT: { eco: -0.75, soc: -0.35 },
  PSOL: { eco: -0.9, soc: -0.85 },
  PCDOB: { eco: -0.8, soc: -0.35 },
  "PC DO B": { eco: -0.8, soc: -0.35 },
  PV: { eco: -0.25, soc: -0.45 },
  REDE: { eco: -0.15, soc: -0.4 },
  PSB: { eco: -0.35, soc: -0.2 },
  PDT: { eco: -0.55, soc: -0.25 },
  UP: { eco: -0.95, soc: -0.6 },
  PCB: { eco: -0.95, soc: -0.4 },
  PSTU: { eco: -0.98, soc: -0.5 },
  PCO: { eco: -0.98, soc: -0.55 },
  // centro
  SOLIDARIEDADE: { eco: -0.15, soc: 0.15 },
  CIDADANIA: { eco: 0.15, soc: -0.15 },
  MDB: { eco: 0.15, soc: 0.15 },
  PSD: { eco: 0.35, soc: 0.2 },
  PSDB: { eco: 0.45, soc: 0.1 },
  PODE: { eco: 0.3, soc: 0.35 },
  PODEMOS: { eco: 0.3, soc: 0.35 },
  PROS: { eco: 0.0, soc: 0.3 },
  PMN: { eco: 0.1, soc: 0.25 },
  MOBILIZA: { eco: 0.25, soc: 0.4 },
  AVANTE: { eco: 0.2, soc: 0.5 },
  // direita / centro-direita
  "UNIÃO": { eco: 0.5, soc: 0.45 },
  "UNIÃO BRASIL": { eco: 0.5, soc: 0.45 },
  UNIAO: { eco: 0.5, soc: 0.45 },
  PP: { eco: 0.55, soc: 0.55 },
  PL: { eco: 0.55, soc: 0.9 },
  REPUBLICANOS: { eco: 0.45, soc: 0.85 },
  NOVO: { eco: 0.95, soc: 0.25 },
  PRD: { eco: 0.5, soc: 0.55 },
  PTB: { eco: 0.35, soc: 0.6 },
  PATRIOTA: { eco: 0.5, soc: 0.85 },
  PRTB: { eco: 0.35, soc: 0.9 },
  DC: { eco: 0.35, soc: 0.95 },
  AGIR: { eco: 0.4, soc: 0.65 },
  PMB: { eco: 0.3, soc: 0.6 },
};

export function eixoDoPartido(sigla: string): EixoIdeologico | null {
  const s = (sigla || "").toUpperCase().trim();
  return ESCALA[s] ?? null;
}

/** rótulo simples do campo, para exibição */
export function campoLabel(eco: number, soc: number, locale: string): string {
  const media = (eco + soc) / 2;
  if (locale === "pt") {
    if (media <= -0.35) return "campo progressista";
    if (media >= 0.35) return "campo conservador";
    return "campo de centro";
  }
  if (media <= -0.35) return "progressive field";
  if (media >= 0.35) return "conservative field";
  return "centre field";
}

/** todos os partidos com escala conhecida */
export function partidosConhecidos(): string[] {
  return [...new Set(Object.keys(ESCALA))];
}
