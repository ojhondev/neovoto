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
export const PARTIDOS_VERSION = "partidos-v1-2026";

export type EixoIdeologico = { eco: number; soc: number };

const ESCALA: Record<string, EixoIdeologico> = {
  // esquerda
  PT: { eco: -0.8, soc: -0.4 },
  PSOL: { eco: -0.9, soc: -0.9 },
  PCDOB: { eco: -0.8, soc: -0.3 },
  PV: { eco: -0.3, soc: -0.6 },
  REDE: { eco: -0.2, soc: -0.5 },
  PSB: { eco: -0.4, soc: -0.3 },
  PDT: { eco: -0.5, soc: -0.3 },
  // centro
  MDB: { eco: 0.2, soc: 0.2 },
  PSD: { eco: 0.3, soc: 0.2 },
  PSDB: { eco: 0.4, soc: 0.1 },
  PODE: { eco: 0.3, soc: 0.3 },
  PODEMOS: { eco: 0.3, soc: 0.3 },
  CIDADANIA: { eco: 0.1, soc: -0.1 },
  SOLIDARIEDADE: { eco: 0.0, soc: 0.2 },
  AVANTE: { eco: 0.2, soc: 0.4 },
  PROS: { eco: 0.0, soc: 0.3 },
  PMN: { eco: 0.1, soc: 0.2 },
  MOBILIZA: { eco: 0.2, soc: 0.3 },
  // direita
  PL: { eco: 0.6, soc: 0.9 },
  PP: { eco: 0.6, soc: 0.6 },
  REPUBLICANOS: { eco: 0.5, soc: 0.8 },
  UNIAO: { eco: 0.5, soc: 0.4 },
  "UNIÃO": { eco: 0.5, soc: 0.4 },
  "UNIÃO BRASIL": { eco: 0.5, soc: 0.4 },
  NOVO: { eco: 0.95, soc: 0.3 },
  PRD: { eco: 0.5, soc: 0.4 },
  PATRIOTA: { eco: 0.5, soc: 0.9 },
  PRTB: { eco: 0.4, soc: 0.9 },
  DC: { eco: 0.4, soc: 0.95 },
  AGIR: { eco: 0.4, soc: 0.7 },
  PMB: { eco: 0.3, soc: 0.6 },
  PTB: { eco: 0.3, soc: 0.6 },
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
