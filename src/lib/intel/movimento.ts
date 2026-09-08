/**
 * Movimento entre eleições — os bolsões de crescimento e de perda do candidato.
 * =========================================================================
 * O PRD pede: "compara turnos e eleições: bolsões de crescimento e de perda".
 * Aqui: para cada município, o voto do candidato na sua eleição mais recente vs.
 * a anterior no mesmo cargo, normalizado pelo COMPARECIMENTO daquele pleito
 * (para não confundir crescimento real com mais gente votando).
 *
 *   swing(m) = voto_atual/comparecimento_atual − voto_anterior/comparecimento_anterior
 *
 * Classes: bolsão de crescimento / estável / bolsão de perda / novo (não tinha
 * voto antes) / perdido (tinha e zerou).
 */
export const MOVIMENTO_VERSION = "movimento-v1";

export type ClasseMovimento = "crescimento" | "estavel" | "perda" | "novo" | "perdido";

export type MovimentoMunicipio = {
  code: string;
  nome: string;
  votosAtual: number;
  votosAnterior: number;
  delta: number; // votos
  deltaPct: number; // -1..∞
  shareAtual: number; // voto / comparecimento (0..1)
  shareAnterior: number;
  swing: number; // pontos percentuais (shareAtual − shareAnterior)
  classe: ClasseMovimento;
};

export type MovimentoResultado = {
  version: string;
  anoAtual: number;
  anoAnterior: number;
  cargo: string;
  municipios: MovimentoMunicipio[];
  byCodeSwing: Record<string, number>; // swing em pp × 100, para o choropleth
  bolsoesCrescimento: MovimentoMunicipio[];
  bolsoesPerda: MovimentoMunicipio[];
  totalAtual: number;
  totalAnterior: number;
  deltaTotal: number;
  municipiosCresceu: number;
  municipiosCaiu: number;
  fontes: string[];
};

type VotoMun = Record<string, number>;
type CompMun = Record<string, number>; // comparecimento por código

export function computeMovimento(input: {
  anoAtual: number;
  anoAnterior: number;
  cargo: string;
  atual: VotoMun;
  anterior: VotoMun;
  compAtual: CompMun;
  compAnterior: CompMun;
  nomeByCode: Record<string, string>;
}): MovimentoResultado {
  const codes = new Set([...Object.keys(input.atual), ...Object.keys(input.anterior)]);
  const municipios: MovimentoMunicipio[] = [];
  let totalAtual = 0;
  let totalAnterior = 0;

  for (const code of codes) {
    const va = input.atual[code] ?? 0;
    const vp = input.anterior[code] ?? 0;
    totalAtual += va;
    totalAnterior += vp;
    const ca = input.compAtual[code] ?? 0;
    const cp = input.compAnterior[code] ?? 0;
    const sa = ca > 0 ? va / ca : 0;
    const sp = cp > 0 ? vp / cp : 0;
    const swing = sa - sp;
    const delta = va - vp;
    const deltaPct = vp > 0 ? delta / vp : va > 0 ? 1 : 0;

    let classe: ClasseMovimento;
    if (vp === 0 && va > 0) classe = "novo";
    else if (va === 0 && vp > 0) classe = "perdido";
    else if (swing >= 0.01 || deltaPct >= 0.15) classe = "crescimento";
    else if (swing <= -0.01 || deltaPct <= -0.15) classe = "perda";
    else classe = "estavel";

    municipios.push({
      code,
      nome: input.nomeByCode[code] ?? code,
      votosAtual: va,
      votosAnterior: vp,
      delta,
      deltaPct: Math.round(deltaPct * 1000) / 1000,
      shareAtual: Math.round(sa * 10000) / 10000,
      shareAnterior: Math.round(sp * 10000) / 10000,
      swing: Math.round(swing * 10000) / 10000,
      classe,
    });
  }

  municipios.sort((a, b) => b.delta - a.delta);
  const byCodeSwing: Record<string, number> = {};
  for (const m of municipios) byCodeSwing[m.code] = Math.round(m.swing * 100 * 100) / 100;

  const comVoto = municipios.filter((m) => m.votosAtual > 50 || m.votosAnterior > 50);
  const bolsoesCrescimento = [...comVoto]
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 8);
  const bolsoesPerda = [...comVoto]
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 8);

  return {
    version: MOVIMENTO_VERSION,
    anoAtual: input.anoAtual,
    anoAnterior: input.anoAnterior,
    cargo: input.cargo,
    municipios,
    byCodeSwing,
    bolsoesCrescimento,
    bolsoesPerda,
    totalAtual,
    totalAnterior,
    deltaTotal: totalAtual - totalAnterior,
    municipiosCresceu: municipios.filter((m) => m.delta > 0).length,
    municipiosCaiu: municipios.filter((m) => m.delta < 0).length,
    fontes: [
      "TSE / Base dos Dados — votação do candidato por município (2 eleições)",
      "TSE / Base dos Dados — comparecimento por município",
    ],
  };
}

export type ZonaForte = {
  code: string;
  nome: string;
  zona: string;
  votos: number;
  share: number; // voto / comparecimento da zona
};

export type ZonasResultado = {
  version: string;
  ano: number;
  totalZonas: number;
  maisFortes: ZonaForte[];
  maisFracas: ZonaForte[];
  fontes: string[];
};

export function computeZonas(input: {
  ano: number;
  votosPorZona: { idMunicipio: string; zona: string; votos: number }[];
  compPorZona: Record<string, number>; // "municipio-zona" → comparecimento
  nomeByCode: Record<string, string>;
}): ZonasResultado {
  const zonas: ZonaForte[] = input.votosPorZona
    .filter((z) => z.votos > 0)
    .map((z) => {
      const comp = input.compPorZona[`${z.idMunicipio}-${z.zona}`] ?? 0;
      return {
        code: z.idMunicipio,
        nome: input.nomeByCode[z.idMunicipio] ?? z.idMunicipio,
        zona: z.zona,
        votos: z.votos,
        share: comp > 0 ? Math.round((z.votos / comp) * 10000) / 10000 : 0,
      };
    });

  const porShare = [...zonas].filter((z) => z.share > 0).sort((a, b) => b.share - a.share);
  const comVoto = [...zonas].filter((z) => z.votos >= 20);
  return {
    version: MOVIMENTO_VERSION,
    ano: input.ano,
    totalZonas: zonas.length,
    maisFortes: porShare.slice(0, 12),
    maisFracas: comVoto.filter((z) => z.share > 0).sort((a, b) => a.share - b.share).slice(0, 12),
    fontes: ["TSE / Base dos Dados — votação do candidato por zona"],
  };
}
