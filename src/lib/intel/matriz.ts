/**
 * Matriz Ideológica por Região (v2 — validada por backtest).
 * Posiciona cada município/UF nos eixos econômico e de costumes a partir da
 * votação por partido no 1º turno presidencial de 2022. Sem inferência sobre
 * indivíduos.
 *
 * Método: posição = média das posições dos partidos ponderada pelo voto.
 * Escala de partido calibrada por Bolognesi 2022 (src/lib/intel/partidos.ts).
 *
 * POR QUE O PRESIDENCIAL, E NÃO O PROPORCIONAL (backtest — scripts/backtest.ts):
 * usando o voto de deputado federal, a posição atribuída NÃO prevê o 2º turno
 * presidencial de 2022 (R² 0,06; acurácia de direção ~50%, no nível do acaso) —
 * no interior e no Nordeste o voto proporcional é de máquina local, não de
 * ideologia. Com o voto presidencial de 1º turno, a mesma posição prevê o 2º
 * turno com R² 0,93 mesmo OUT OF TIME (posição de 2018 → resultado de 2022) e
 * ~89% de acurácia de direção. A "dispersão" a mais do proporcional era ruído.
 */
import { eixoDoPartido, PARTIDOS_VERSION } from "@/lib/intel/partidos";

export const MATRIZ_VERSION = `matriz-v3 · ${PARTIDOS_VERSION}`;

/**
 * Ajuste de contexto socioeconômico (limitado e transparente).
 *
 * EIXO ECONÔMICO: só renda (PIB p/c), ±0,06 — IDÊNTICO à v2, que o backtest de 2º
 * turno valida (R² 0,996; direção 97,6%). Testei adicionar escolaridade no eixo
 * econômico e ela PIOROU a previsão (direção 97,6%→87,3%): eleitor de alta
 * escolaridade no Brasil não é economicamente de direita, é anti-Bolsonaro — o
 * termo foi descartado (scripts/backtest.ts §E).
 *
 * EIXO DE COSTUMES: escolaridade e urbanização → mais liberal; idade → mais
 * conservador. É um dos achados mais replicados do comportamento político
 * (Stubager 2013; Weakliem 2002). NÃO é backtestável contra o voto presidencial
 * (que é sobre o eixo econômico); no backtest §E o nudge nem abre a distribuição,
 * então entra MÍNIMO. O valor da escolaridade/idade do eleitorado está mais em
 * ser EXIBIDO por município (calibra a recomendação de agenda) do que em mover
 * a posição.
 */
const AJUSTE = {
  ecoRenda: 0.06,
  socEscolaridade: 0.05,
  socUrbanizacao: 0.025,
  socIdade: 0.03,
};

/** Pano de fundo ideológico: 1º turno presidencial 2022 (validado por backtest). */
export const MATRIZ_PLEITO = { ano: 2022, turno: 1, cargo: "presidente" };

export type MunicipioMatriz = {
  code: string;
  nome: string;
  eco: number; // -1..1 (já com ajuste de contexto)
  soc: number; // -1..1
  ecoBase: number; // só o voto por partido, sem contexto
  socBase: number;
  populacao: number;
  votos: number;
  escolaridade: number | null; // 0..1 (média do nível TSE) — null sem dado
  frac60: number | null; // fração do eleitorado com 60+ anos
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
  ibge: {
    nomeByCode: Record<string, string>;
    populacaoByCode: Record<string, number>;
    pibByCode: Record<string, number>;
    /** escolaridade do eleitorado (0..1) e fração 60+ por município — opcional */
    escolaridadeByCode?: Record<string, number>;
    frac60ByCode?: Record<string, number>;
  },
  partidoCandidato: string,
): MatrizResultado {
  // agrupa voto por município
  const porMun = new Map<string, Map<string, number>>();
  for (const r of votacao) {
    if (!porMun.has(r.idMunicipio)) porMun.set(r.idMunicipio, new Map());
    const m = porMun.get(r.idMunicipio)!;
    m.set(r.sigla, (m.get(r.sigla) ?? 0) + r.votos);
  }

  // ranks para o ajuste de contexto
  const pibPc: Record<string, number> = {};
  for (const [code, pib] of Object.entries(ibge.pibByCode)) {
    const pop = ibge.populacaoByCode[code] ?? 0;
    pibPc[code] = pop > 0 ? pib / pop : 0;
  }
  const rankPib = percentRank(Object.values(pibPc));
  const esc = ibge.escolaridadeByCode ?? {};
  const ido = ibge.frac60ByCode ?? {};
  const temEsc = Object.keys(esc).length > 0;
  const rankEsc = percentRank(Object.values(esc));
  const rankIdo = percentRank(Object.values(ido));
  const rankUrb = percentRank(
    Object.values(ibge.populacaoByCode).map((p) => Math.log(p + 1)),
  );

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

    const ecoBase = ecoAcc / somaClass;
    const socBase = socAcc / somaClass;

    // fatores de contexto (0..1, centrados em 0,5 quando não há dado)
    const fPib = (rankPib(pibPc[code] ?? 0) - 0.5) * 2;
    const fEsc = temEsc && esc[code] != null ? (rankEsc(esc[code]) - 0.5) * 2 : 0;
    const fUrb = (rankUrb(Math.log((ibge.populacaoByCode[code] ?? 0) + 1)) - 0.5) * 2;
    const fIdo = ido[code] != null ? (rankIdo(ido[code]) - 0.5) * 2 : 0;

    const eco = clamp(ecoBase + AJUSTE.ecoRenda * fPib);
    const soc = clamp(
      socBase - AJUSTE.socEscolaridade * fEsc - AJUSTE.socUrbanizacao * fUrb + AJUSTE.socIdade * fIdo,
    );

    municipios.push({
      code,
      nome: ibge.nomeByCode[code] ?? code,
      eco: Math.round(eco * 100) / 100,
      soc: Math.round(soc * 100) / 100,
      ecoBase: Math.round(ecoBase * 100) / 100,
      socBase: Math.round(socBase * 100) / 100,
      populacao: ibge.populacaoByCode[code] ?? 0,
      votos: somaTodos,
      escolaridade: temEsc && esc[code] != null ? Math.round(esc[code] * 100) / 100 : null,
      frac60: ido[code] != null ? Math.round(ido[code] * 1000) / 1000 : null,
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
      "TSE / Base dos Dados — 1º turno presidencial 2022 por partido e município",
      "IBGE — PIB dos Municípios · TSE — perfil do eleitorado (escolaridade, idade)",
      "Bolognesi, Ribeiro & Codato (2022) — survey de especialistas (escala ideológica)",
      "NeoVoto — backtest de validação (eixo econômico: R² 0,93 out-of-time)",
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
  m: { nome: string; eco: number; soc: number; distancia: number; escolaridade?: number | null; frac60?: number | null },
  cand: { eco: number; soc: number; conhecido: boolean },
  locale: "pt" | "en",
): RecomendacaoMatriz {
  const pt = locale === "pt";

  const perfilTxt =
    m.escolaridade != null || m.frac60 != null
      ? pt
        ? ` Eleitorado: ${m.escolaridade != null ? `escolaridade ${m.escolaridade >= 0.75 ? "alta" : m.escolaridade >= 0.6 ? "média" : "baixa"}` : ""}${m.escolaridade != null && m.frac60 != null ? ", " : ""}${m.frac60 != null ? `${Math.round(m.frac60 * 100)}% com 60+` : ""}.`
        : ` Electorate: ${m.escolaridade != null ? `${m.escolaridade >= 0.75 ? "high" : m.escolaridade >= 0.6 ? "mid" : "low"} education` : ""}${m.escolaridade != null && m.frac60 != null ? ", " : ""}${m.frac60 != null ? `${Math.round(m.frac60 * 100)}% aged 60+` : ""}.`
      : "";

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
    ? `Em ${m.nome}, o eleitorado é ${classe}.${perfilTxt} ${agenda}${tom ? " " + tom : ""} ${ressonancia}`
    : `In ${m.nome}, the electorate is ${classe}.${perfilTxt} ${agenda}${tom ? " " + tom : ""} ${ressonancia}`;

  return { classe, agenda, tom, ressonancia, texto };
}

function mediana(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
