/**
 * Matriz Ideológica por Região (Fase 1).
 * Posiciona cada município nos eixos econômico e de costumes a partir da
 * votação agregada POR PARTIDO no último pleito presidencial (o termômetro
 * ideológico mais comparável do país), ajustada levemente pelo contexto
 * de renda (IBGE). Sem qualquer inferência sobre indivíduos.
 *
 * Método explicável: posição do município = média das posições dos partidos
 * ponderada pelo voto. A escala de partido é transparente e editável
 * (src/lib/intel/partidos.ts).
 */
import { eixoDoPartido, PARTIDOS_VERSION } from "@/lib/intel/partidos";

export const MATRIZ_VERSION = `matriz-v1 · ${PARTIDOS_VERSION}`;

/**
 * Pleito usado como pano de fundo ideológico. Deputado federal (proporcional)
 * espalha os municípios muito melhor que o presidencial — 30+ partidos em vez
 * de uma disputa bipolar que vira só um eixo esquerda-direita.
 */
export const MATRIZ_PLEITO = { ano: 2022, turno: 1, cargo: "deputado federal" };

export type MunicipioMatriz = {
  code: string;
  nome: string;
  eco: number; // -1..1
  soc: number; // -1..1
  populacao: number;
  votos: number;
  distancia: number; // ao candidato (0 = idêntico)
};

export type MatrizResultado = {
  version: string;
  pleito: string;
  candidato: { eco: number; soc: number; partido: string; conhecido: boolean };
  municipios: MunicipioMatriz[];
  ufMedia: { eco: number; soc: number };
  maisAfins: MunicipioMatriz[];
  maisDistantes: MunicipioMatriz[];
  cobertura: number; // 0..1 — fração do voto classificável
  fontes: string[];
};

function percentRank(values: number[]): (v: number) => number {
  const s = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  if (s.length === 0) return () => 0.5;
  const lo = s[Math.floor(s.length * 0.05)] ?? s[0];
  const hi = s[Math.ceil(s.length * 0.95) - 1] ?? s[s.length - 1];
  return (v: number) => (hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 0.5);
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export function computeMatriz(
  votacao: { idMunicipio: string; sigla: string; votos: number }[],
  ibge: { nomeByCode: Record<string, string>; populacaoByCode: Record<string, number>; pibByCode: Record<string, number> },
  partidoCandidato: string,
): MatrizResultado {
  // agrupa voto por município
  const porMun = new Map<string, Map<string, number>>();
  for (const r of votacao) {
    if (!porMun.has(r.idMunicipio)) porMun.set(r.idMunicipio, new Map());
    const m = porMun.get(r.idMunicipio)!;
    m.set(r.sigla, (m.get(r.sigla) ?? 0) + r.votos);
  }

  // rank de PIB per capita para o ajuste de contexto
  const pibPc: Record<string, number> = {};
  for (const [code, pib] of Object.entries(ibge.pibByCode)) {
    const pop = ibge.populacaoByCode[code] ?? 0;
    pibPc[code] = pop > 0 ? pib / pop : 0;
  }
  const rankPib = percentRank(Object.values(pibPc));

  let votosTotais = 0;
  let votosClassificados = 0;
  const municipios: MunicipioMatriz[] = [];

  for (const [code, votosPartido] of porMun) {
    let somaClass = 0;
    let somaTodos = 0;
    let ecoAcc = 0;
    let socAcc = 0;
    for (const [sigla, v] of votosPartido) {
      somaTodos += v;
      const eixo = eixoDoPartido(sigla);
      if (eixo) {
        somaClass += v;
        ecoAcc += v * eixo.eco;
        socAcc += v * eixo.soc;
      }
    }
    votosTotais += somaTodos;
    votosClassificados += somaClass;
    if (somaClass < 50) continue;

    let eco = ecoAcc / somaClass;
    const soc = socAcc / somaClass;
    // ajuste leve de contexto: renda mais alta empurra o eixo econômico
    // em direção ao mercado (no máx. ±0,12).
    eco = clamp(eco + 0.12 * (rankPib(pibPc[code] ?? 0) - 0.5) * 2);

    municipios.push({
      code,
      nome: ibge.nomeByCode[code] ?? code,
      eco: Math.round(eco * 100) / 100,
      soc: Math.round(soc * 100) / 100,
      populacao: ibge.populacaoByCode[code] ?? 0,
      votos: somaTodos,
      distancia: 0,
    });
  }

  const eixoCand = eixoDoPartido(partidoCandidato);
  const candidato = {
    eco: eixoCand?.eco ?? 0,
    soc: eixoCand?.soc ?? 0,
    partido: (partidoCandidato || "").toUpperCase(),
    conhecido: !!eixoCand,
  };

  for (const m of municipios) {
    m.distancia =
      Math.round(Math.hypot(m.eco - candidato.eco, m.soc - candidato.soc) * 100) / 100;
  }

  // média da UF ponderada por população
  let we = 0;
  let ws = 0;
  let wp = 0;
  for (const m of municipios) {
    we += m.eco * m.populacao;
    ws += m.soc * m.populacao;
    wp += m.populacao;
  }
  const ufMedia = {
    eco: Math.round((wp ? we / wp : 0) * 100) / 100,
    soc: Math.round((wp ? ws / wp : 0) * 100) / 100,
  };

  const popMediana = mediana(municipios.map((m) => m.populacao));
  const relevantes = municipios.filter((m) => m.populacao >= popMediana);
  const maisAfins = [...relevantes].sort((a, b) => a.distancia - b.distancia).slice(0, 6);
  const maisDistantes = [...relevantes].sort((a, b) => b.distancia - a.distancia).slice(0, 6);

  return {
    version: MATRIZ_VERSION,
    pleito: `${MATRIZ_PLEITO.cargo} ${MATRIZ_PLEITO.ano} · ${MATRIZ_PLEITO.turno}º turno`,
    candidato,
    municipios: municipios.sort((a, b) => b.populacao - a.populacao),
    ufMedia,
    maisAfins,
    maisDistantes,
    cobertura: votosTotais ? votosClassificados / votosTotais : 0,
    fontes: [
      "TSE / Base dos Dados — votação por partido e município",
      "IBGE — PIB dos Municípios (ajuste de contexto)",
      "Bolognesi, Ribeiro & Codato (2022) — survey de especialistas (escala ideológica)",
    ],
  };
}

export type RecomendacaoMatriz = {
  /** classificação em linguagem simples ("centro-direita, mais conservador nos costumes") */
  classe: string;
  /** o que o eleitorado dali quer ouvir (temas concretos) */
  agenda: string;
  /** como tratar pautas de costumes ali ("" quando não há alerta) */
  tom: string;
  /** leitura da distância até o candidato */
  ressonancia: string;
  /** tudo junto, para o recorte do relatório */
  texto: string;
};

function classeEco(eco: number, pt: boolean): string {
  if (eco <= -0.5) return pt ? "à esquerda no eixo econômico (Estado, redistribuição)" : "economically left (state, redistribution)";
  if (eco <= -0.15) return pt ? "de centro-esquerda no eixo econômico" : "economically centre-left";
  if (eco < 0.15) return pt ? "de centro no eixo econômico" : "economically centrist";
  if (eco < 0.5) return pt ? "de centro-direita no eixo econômico (mercado)" : "economically centre-right (market)";
  return pt ? "à direita no eixo econômico (mercado, liberalismo)" : "economically right (market, liberalism)";
}
function classeSoc(soc: number, pt: boolean): string {
  if (soc <= -0.2) return pt ? "liberal nos costumes" : "socially liberal";
  if (soc < 0.2) return pt ? "moderado nos costumes" : "moderate on social values";
  return pt ? "conservador nos costumes" : "socially conservative";
}

/**
 * Traduz a posição ideológica de um município/UF em recomendação de agenda
 * acionável, em linguagem de campanha. Pura, sem I/O.
 */
export function recomendaMunicipio(
  m: { nome: string; eco: number; soc: number; distancia: number },
  cand: { eco: number; soc: number; conhecido: boolean },
  locale: "pt" | "en",
): RecomendacaoMatriz {
  const pt = locale === "pt";

  const classe = `${classeEco(m.eco, pt)}, ${classeSoc(m.soc, pt)}`;

  const agenda =
    m.eco <= -0.15
      ? pt
        ? `Aborde trabalho e geração de emprego, saúde pública (SUS), custo de vida e apoio a quem tem menos. Fale em concreto — obra, posto, vaga — não em ideologia.`
        : `Address jobs, public healthcare, cost of living and support for those who have less. Talk concretely — works, clinics, jobs.`
      : m.eco >= 0.15
        ? pt
          ? `Aborde custo de vida, apoio ao pequeno negócio e desburocratização, segurança pública e eficiência do gasto. Linguagem de resultado, não de bandeira.`
          : `Address cost of living, small business support and deregulation, public safety and spending efficiency.`
        : pt
          ? `Terreno de consenso: infraestrutura, saúde, educação e emprego rendem sem dividir. Evite temas polarizadores.`
          : `Consensus ground: infrastructure, health, education and jobs pay off without dividing.`;

  const tom =
    m.soc >= 0.2
      ? pt
        ? `Não leve pautas de costumes na ofensiva. Se o tema vier, responda pelo lado da segurança, da família e da ordem.`
        : `Don't push social-values themes. If raised, answer via safety, family and order.`
      : m.soc <= -0.2
        ? pt
          ? `Há espaço para pautas de direitos e meio ambiente sem custo eleitoral.`
          : `There's room for rights and environment themes at no electoral cost.`
        : "";

  const ressonancia =
    !cand.conhecido
      ? pt
        ? `O partido do candidato não está na escala calibrada — a distância não pôde ser medida.`
        : `The candidate's party isn't in the calibrated scale — distance couldn't be measured.`
      : m.distancia <= 0.55
        ? pt
          ? `O discurso do candidato já ressoa em ${m.nome} (distância ${m.distancia.toFixed(2)}). Aqui o jogo é presença e mobilização, não convencimento.`
          : `The candidate's message already resonates in ${m.nome} (distance ${m.distancia.toFixed(2)}). Here it's presence and turnout, not persuasion.`
        : m.distancia >= 1.0
          ? pt
            ? `${m.nome} está longe do eixo do candidato (distância ${m.distancia.toFixed(2)}): traduza a mensagem para a linguagem local — nunca entre por confronto ideológico.`
            : `${m.nome} is far from the candidate's axis (distance ${m.distancia.toFixed(2)}): translate the message locally — never enter via ideological confrontation.`
          : pt
            ? `${m.nome} é terreno intermediário (distância ${m.distancia.toFixed(2)}): dá para crescer com a agenda certa e sem estridência.`
            : `${m.nome} is middle ground (distance ${m.distancia.toFixed(2)}): you can grow with the right agenda.`;

  const texto = pt
    ? `Em ${m.nome}, o eleitorado é ${classe}. ${agenda}${tom ? " " + tom : ""} ${ressonancia}`
    : `In ${m.nome}, the electorate is ${classe}. ${agenda}${tom ? " " + tom : ""} ${ressonancia}`;

  return { classe, agenda, tom, ressonancia, texto };
}

function mediana(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
