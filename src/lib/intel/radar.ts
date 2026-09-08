/**
 * Radar de Posicionamento — Fase 1 (institucional, sem LLM).
 * Cruza a agenda legislativa recente (Câmara) com a taxonomia de temas e o
 * perfil da candidatura para dizer: o que está quente, onde ele tem/não tem
 * posição, e se o tema é terreno afim ou de tensão para o campo dele.
 *
 * Saída QUALITATIVA e de uso interno (Lei 9.504): nenhuma estimativa numérica
 * de intenção de voto ou de percepção. Só saliência de tema + recomendação de
 * direção. Ver docs/RADAR-POSICIONAMENTO.md.
 */
import type { ItemAgenda } from "@/lib/data-sources/agenda";
import {
  TEMAS,
  TEMAS_VERSION,
  classificarTexto,
  getTema,
  type Campo,
} from "@/lib/intel/temas";

export const RADAR_VERSION = `radar-${TEMAS_VERSION}`;

export type Alinhamento = "afim" | "tensao" | "neutro";
export type TipoRadar = "lacuna" | "consolidar" | "exposicao" | "monitorar";

export type TemaRadar = {
  id: string;
  label: string;
  eixo: string;
  heat: number; // 0–100 (saliência relativa na agenda)
  mencoes: number; // itens da agenda no tema
  candidatoAtivo: boolean;
  iniciativasCandidato: number;
  alinhamento: Alinhamento;
  tipo: TipoRadar;
  recomendacao: string;
  naImprensa: number; // menções na camada de imprensa/tendências (0 = só no Congresso)
};

export type RadarResultado = {
  version: string;
  janelaDias: number;
  itensAnalisados: number;
  campoCandidato: Campo;
  temas: TemaRadar[];
  fontes: string[];
};

/** Campo político do partido (simplificado, editável — não é juízo de valor). */
const CAMPO_PARTIDO: Record<string, Campo> = {
  PT: "progressista", PSOL: "progressista", PCDOB: "progressista", PV: "progressista",
  REDE: "progressista", PSB: "progressista",
  MDB: "conservador", PSD: "conservador", PODE: "conservador", PODEMOS: "conservador",
  CIDADANIA: "conservador", SOLIDARIEDADE: "conservador", AVANTE: "conservador",
  PDT: "progressista", PSDB: "conservador", PMN: "conservador", PRD: "conservador",
  PL: "conservador", PP: "conservador", REPUBLICANOS: "conservador",
  UNIAO: "conservador", "UNIÃO": "conservador", NOVO: "conservador",
  PATRIOTA: "conservador", PRTB: "conservador", DC: "conservador", AGIR: "conservador",
  PMB: "conservador", PROS: "conservador",
};

// MDB/PSD/PODE etc. são de centro na prática — trata como "neutro" em tudo.
const CENTRO = new Set(["MDB", "PSD", "PODE", "PODEMOS", "CIDADANIA", "SOLIDARIEDADE", "AVANTE", "PMN", "PROS"]);

function campoDoPartido(sigla: string): Campo {
  const s = (sigla || "").toUpperCase().trim();
  if (CENTRO.has(s)) return "transversal"; // usamos "transversal" como marcador de centro/flexível
  return CAMPO_PARTIDO[s] ?? "transversal";
}

function alinhar(campoTema: Campo, campoCand: Campo): Alinhamento {
  if (campoTema === "transversal" || campoCand === "transversal") return "neutro";
  return campoTema === campoCand ? "afim" : "tensao";
}

type Textos = {
  janela: string; // "os últimos 4 meses"
  lacuna: (t: { tema: string; n: number; janela: string }) => string;
  consolidar: (t: { tema: string; n: number }) => string;
  exposicao: (t: { tema: string; n: number }) => string;
  monitorar: (t: { tema: string; n: number }) => string;
};

export type ItemContexto = { texto: string; data: string; peso: number };

export function computeRadar(
  agenda: ItemAgenda[],
  perfil: {
    partido: string;
    proposicoes: { recentes: { ementa: string }[] } | null;
    frentes: { titulo: string }[];
  },
  textos: Textos,
  janelaDias: number,
  locale: "pt" | "en",
  contexto: ItemContexto[] = [],
): RadarResultado {
  const campoCandidato = campoDoPartido(perfil.partido);

  // 1) classifica a agenda + a camada de imprensa/tendências, com decaimento por idade
  const agora = Date.now();
  const score = new Map<string, number>();
  const mencoes = new Map<string, number>();
  const mencoesImprensa = new Map<string, number>();
  const add = (texto: string, data: string, base: number, imprensa: boolean) => {
    const idade = data ? Math.max(0, (agora - new Date(data).getTime()) / 86_400_000) : janelaDias;
    const w = base * Math.exp(-idade / (imprensa ? 8 : 45));
    for (const id of classificarTexto(texto)) {
      score.set(id, (score.get(id) ?? 0) + w);
      mencoes.set(id, (mencoes.get(id) ?? 0) + 1);
      if (imprensa) mencoesImprensa.set(id, (mencoesImprensa.get(id) ?? 0) + 1);
    }
  };
  for (const item of agenda) add(item.ementa, item.data, 1, false);
  for (const c of contexto) add(c.texto, c.data, c.peso, true);
  const maxScore = Math.max(1, ...score.values());

  // 2) footprint temático do candidato.
  // Proposição = autoria real (peso cheio). Frente parlamentar = só interesse
  // (deputados entram em dezenas por cortesia) — só conta como posição se houver
  // várias na mesma pauta.
  const propHits = new Map<string, number>();
  for (const p of perfil.proposicoes?.recentes ?? []) {
    for (const id of classificarTexto(p.ementa)) {
      propHits.set(id, (propHits.get(id) ?? 0) + 1);
    }
  }
  const frenteHits = new Map<string, number>();
  for (const f of perfil.frentes) {
    for (const id of classificarTexto(f.titulo)) {
      frenteHits.set(id, (frenteHits.get(id) ?? 0) + 1);
    }
  }
  const FRENTE_MIN = 4; // nº de frentes na mesma pauta para valer como "acompanha"

  // 3) monta cada tema
  const temas: TemaRadar[] = TEMAS.filter((t) => (mencoes.get(t.id) ?? 0) > 0).map((t) => {
    const nome = t.label[locale];
    const heat = Math.round((100 * (score.get(t.id) ?? 0)) / maxScore);
    const n = mencoes.get(t.id) ?? 0;
    const props = propHits.get(t.id) ?? 0;
    const frentes = frenteHits.get(t.id) ?? 0;
    const k = props; // exibido como "N proposições"
    const ativo = props > 0 || frentes >= FRENTE_MIN;
    const alinhamento = alinhar(t.campo, campoCandidato);

    let tipo: TipoRadar;
    let recomendacao: string;
    if (ativo) {
      tipo = "consolidar";
      recomendacao = textos.consolidar({ tema: nome, n });
    } else if (alinhamento === "afim") {
      tipo = "lacuna";
      recomendacao = textos.lacuna({ tema: nome, n, janela: textos.janela });
    } else if (alinhamento === "tensao") {
      tipo = "exposicao";
      recomendacao = textos.exposicao({ tema: nome, n });
    } else {
      tipo = "monitorar";
      recomendacao = textos.monitorar({ tema: nome, n });
    }

    return {
      id: t.id,
      label: nome,
      eixo: t.eixo,
      heat,
      mencoes: n,
      candidatoAtivo: ativo,
      iniciativasCandidato: k,
      alinhamento,
      tipo,
      recomendacao,
      naImprensa: mencoesImprensa.get(t.id) ?? 0,
    };
  });

  // lacuna quente primeiro, depois por heat
  const ordem: Record<TipoRadar, number> = { lacuna: 0, exposicao: 1, monitorar: 2, consolidar: 3 };
  temas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || b.heat - a.heat);

  return {
    version: contexto.length > 0 ? `${RADAR_VERSION}+imprensa` : RADAR_VERSION,
    janelaDias,
    itensAnalisados: agenda.length + contexto.length,
    campoCandidato,
    temas,
    fontes:
      contexto.length > 0
        ? ["Câmara — proposições", "Imprensa e tendências (últimos dias)"]
        : ["Câmara — proposições"],
  };
}

/** rótulo do tema localizado (para a UI) */
export function temaLabel(id: string, locale: string): string {
  const t = getTema(id);
  if (!t) return id;
  return locale === "pt" ? t.label.pt : t.label.en;
}
