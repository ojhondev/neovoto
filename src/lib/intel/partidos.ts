/**
 * Escala ideológica de partido — 2 eixos, transparente e editável.
 *   eco: -1 = Estado/redistribuição   ·   +1 = mercado/liberalismo econômico
 *   soc: -1 = liberal em costumes      ·   +1 = conservador em costumes
 *
 * CALIBRAÇÃO (v3): o eixo esquerda-direita implícito da nossa escala —
 * (eco + soc) / 2 — foi ancorado no survey de especialistas de
 *   Bolognesi, Ribeiro & Codato, "O desaparecimento do centro ideológico
 *   no sistema partidário brasileiro" (Opinião Pública / Dados), rodada 2022,
 *   escala 0 (extrema esquerda) a 10 (extrema direita).
 * Regra aplicada: onde |nossa posição − Bolognesi| passava de 2 pontos (na
 * escala 0–10), os valores eco/soc foram revistos até fechar a diferença.
 * O eixo de costumes (soc) permanece um placement próprio (o survey é
 * unidimensional) mas consistente com a literatura de comportamento legislativo.
 *
 * É uma SIMPLIFICAÇÃO deliberada e um ponto de calibração — não um dado do TSE.
 */
export const PARTIDOS_VERSION = "partidos-v3-2026-bolognesi";

export type EixoIdeologico = { eco: number; soc: number };

/**
 * Posição esquerda-direita no survey de especialistas (Bolognesi et al., rodada
 * 2022), escala 0–10. Usada para calibrar e para o teste de divergência exibido
 * na ficha metodológica. Partidos sem entrada não estavam no survey.
 */
export const BOLOGNESI_2022: Record<string, number> = {
  PSTU: 0.51,
  PCO: 0.55,
  PCB: 0.69,
  PSOL: 1.41,
  UP: 1.63,
  PCDOB: 1.78,
  "PC DO B": 1.78,
  PT: 2.68,
  PSB: 3.59,
  REDE: 3.69,
  PDT: 3.86,
  PV: 4.12,
  SOLIDARIEDADE: 6.01,
  CIDADANIA: 6.17,
  AVANTE: 6.47,
  MDB: 6.5,
  PMN: 6.74,
  PSDB: 6.76,
  PSD: 6.94,
  PMB: 7.29,
  PODE: 7.44,
  PODEMOS: 7.44,
  PROS: 7.45,
  PRTB: 7.49,
  AGIR: 7.55,
  PTB: 7.72,
  PP: 8.15,
  DC: 8.21,
  REPUBLICANOS: 8.33,
  "UNIÃO": 8.49,
  "UNIÃO BRASIL": 8.49,
  UNIAO: 8.49,
  PATRIOTA: 8.6,
  NOVO: 8.67,
  PL: 8.8,
};

const ESCALA: Record<string, EixoIdeologico> = {
  // ---- esquerda / centro-esquerda (calibrado: campo ≈ Bolognesi) ----
  PT: { eco: -0.58, soc: -0.35 }, // Bolognesi 2,68 → −0,46
  PSOL: { eco: -0.74, soc: -0.7 }, // 1,41 → −0,72
  PCDOB: { eco: -0.85, soc: -0.4 }, // 1,78 → −0,64
  "PC DO B": { eco: -0.85, soc: -0.4 },
  PV: { eco: -0.15, soc: -0.2 }, // 4,12 → −0,18
  REDE: { eco: -0.15, soc: -0.38 }, // 3,69 → −0,26
  PSB: { eco: -0.35, soc: -0.22 }, // 3,59 → −0,28
  PDT: { eco: -0.35, soc: -0.12 }, // 3,86 → −0,23
  UP: { eco: -0.83, soc: -0.52 }, // 1,63 → −0,67
  PCB: { eco: -1.0, soc: -0.72 }, // 0,69 → −0,86
  PSTU: { eco: -1.0, soc: -0.8 }, // 0,51 → −0,90
  PCO: { eco: -1.0, soc: -0.78 }, // 0,55 → −0,89
  // ---- centro / centro-direita ----
  SOLIDARIEDADE: { eco: 0.25, soc: 0.15 }, // 6,01 → +0,20
  CIDADANIA: { eco: 0.38, soc: 0.1 }, // 6,17 → +0,23
  MDB: { eco: 0.35, soc: 0.25 }, // 6,50 → +0,30
  PSD: { eco: 0.45, soc: 0.3 }, // 6,94 → +0,39
  PSDB: { eco: 0.5, soc: 0.2 }, // 6,76 → +0,35
  PODE: { eco: 0.42, soc: 0.55 }, // 7,44 → +0,49
  PODEMOS: { eco: 0.42, soc: 0.55 },
  PROS: { eco: 0.5, soc: 0.48 }, // 7,45 → +0,49 (era +0,15 — revisto)
  PMN: { eco: 0.3, soc: 0.4 }, // 6,74 → +0,35
  MOBILIZA: { eco: 0.2, soc: 0.35 }, // sem survey
  AVANTE: { eco: 0.15, soc: 0.45 }, // 6,47 → +0,29
  // ---- direita / centro-direita ----
  "UNIÃO": { eco: 0.72, soc: 0.68 }, // 8,49 → +0,70 (era +0,48 — revisto)
  "UNIÃO BRASIL": { eco: 0.72, soc: 0.68 },
  UNIAO: { eco: 0.72, soc: 0.68 },
  PP: { eco: 0.6, soc: 0.66 }, // 8,15 → +0,63
  PL: { eco: 0.6, soc: 0.92 }, // 8,80 → +0,76
  REPUBLICANOS: { eco: 0.48, soc: 0.85 }, // 8,33 → +0,67
  NOVO: { eco: 1.0, soc: 0.45 }, // 8,67 → +0,73 (ultraliberal, não conservador)
  PRD: { eco: 0.5, soc: 0.6 }, // sem survey (sucessor Patriota+PTB)
  PTB: { eco: 0.4, soc: 0.68 }, // 7,72 → +0,54
  PATRIOTA: { eco: 0.55, soc: 0.9 }, // 8,60 → +0,72
  PRTB: { eco: 0.3, soc: 0.7 }, // 7,49 → +0,50 (era +0,63 — revisto)
  DC: { eco: 0.35, soc: 0.93 }, // 8,21 → +0,64
  AGIR: { eco: 0.4, soc: 0.62 }, // 7,55 → +0,51
  PMB: { eco: 0.3, soc: 0.62 }, // 7,29 → +0,46
};

export function eixoDoPartido(sigla: string): EixoIdeologico | null {
  const s = (sigla || "").toUpperCase().trim();
  return ESCALA[s] ?? null;
}

/**
 * Posição esquerda-direita do partido em −1..+1 (calibrada por Bolognesi 2022
 * quando disponível; senão o eixo médio da nossa escala). null se desconhecido.
 */
export function lrDoPartido(sigla: string): number | null {
  const s = (sigla || "").toUpperCase().trim();
  const bol = BOLOGNESI_2022[s];
  if (bol != null) return (bol - 5) / 5;
  const e = ESCALA[s];
  return e ? (e.eco + e.soc) / 2 : null;
}

/**
 * Diferença |nossa escala − Bolognesi 2022| na escala 0–10, por partido.
 * Para a ficha metodológica: nada deve passar de 2,0.
 */
export function divergenciaEscala(): { sigla: string; nossa: number; bolognesi: number; diff: number }[] {
  const out: { sigla: string; nossa: number; bolognesi: number; diff: number }[] = [];
  for (const [sigla, bol] of Object.entries(BOLOGNESI_2022)) {
    const e = ESCALA[sigla];
    if (!e) continue;
    const nossa = ((e.eco + e.soc) / 2) * 5 + 5;
    out.push({
      sigla,
      nossa: Math.round(nossa * 100) / 100,
      bolognesi: bol,
      diff: Math.round(Math.abs(nossa - bol) * 100) / 100,
    });
  }
  return out.sort((a, b) => b.diff - a.diff);
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
