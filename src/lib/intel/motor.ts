/**
 * Motor NeoVoto — a camada que faz os módulos conversarem.
 * =======================================================
 * Lê os motores disponíveis (IFET territorial, Radar de Posicionamento, base
 * legislativa/eleitoral) e sintetiza UMA leitura da candidatura: um índice de
 * prontidão, o que cada dimensão diz em linguagem direta, e as ações
 * prioritárias que saem do cruzamento — não de um módulo isolado.
 *
 * É isto que aparece no painel como "Motor NeoVoto": não as fórmulas (segredo
 * de negócio), mas o fato de haver um núcleo que cruza os sinais e devolve
 * decisão. Saída qualitativa/estratégica (ver ETICA.md e RADAR-POSICIONAMENTO.md).
 */
import type { Dictionary } from "@/lib/i18n";
import type { Candidacy } from "@/db/schema";
import type { PerfilPolitico } from "@/lib/politico";
import { getIfetResumoUF, getIfetResumoNacional } from "@/lib/territory";
import { getAgendaCamara } from "@/lib/data-sources/agenda";
import { getVotacaoPartidoUF, getVotacaoPartidoNacional } from "@/lib/data-sources/regional";
import { escopoNacional, PLEITO_NACIONAL } from "@/lib/escopo";
import { computeRadar, type RadarResultado } from "@/lib/intel/radar";
import { computeMatriz, MATRIZ_PLEITO, type MatrizResultado } from "@/lib/intel/matriz";
import type { IfetResultado } from "@/lib/intel/ifet";
import { CARGO_LABEL, type Cargo } from "@/lib/cargos";

export const MOTOR_VERSION = "motor-v1";

export type NivelProntidao = "critico" | "atencao" | "competitivo" | "favoravel";

export type DimensaoLeitura = {
  chave: "territorio" | "posicionamento" | "base" | "ideologia";
  titulo: string;
  valor: string;
  rotulo: string;
  leitura: string;
  status: "ok" | "atencao" | "pendente";
  href: string;
  barras?: { label: string; v: number }[]; // 0–1, mini-gráfico
};

export type AcaoPrioritaria = {
  ordem: number;
  titulo: string;
  porque: string;
  href: string;
};

export type LeituraNeoVoto = {
  version: string;
  geradoEm: string;
  campo: "progressista" | "conservador" | "transversal";
  sintese: string;
  prontidao: { score: number; nivel: NivelProntidao; leitura: string };
  dimensoes: DimensaoLeitura[];
  acoes: AcaoPrioritaria[];
  sinaisAnalisados: number;
  fontes: string[];
};

const JANELA_DIAS = 120;

function nivelFrom(score: number): NivelProntidao {
  if (score >= 70) return "favoravel";
  if (score >= 50) return "competitivo";
  if (score >= 30) return "atencao";
  return "critico";
}

export async function analisarCandidatura(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
  t: Dictionary,
  locale: "pt" | "en",
): Promise<LeituraNeoVoto> {
  const pt = locale === "pt";
  const uf = perfil.uf || candidacy.uf || "";
  const cargo = (candidacy.cargo as Cargo | null) ?? perfil.cargo ?? null;
  const cargoLabel = cargo ? CARGO_LABEL[cargo]?.[locale] ?? cargo : "";
  const nacional = escopoNacional(cargo);

  // roda os motores disponíveis em paralelo
  const [resumo, agenda, votacaoPartido] = await Promise.all([
    nacional
      ? getIfetResumoNacional(candidacy.id).catch(() => null)
      : uf
        ? getIfetResumoUF(uf, candidacy.id).catch(() => null)
        : Promise.resolve(null),
    getAgendaCamara(JANELA_DIAS).catch(() => []),
    nacional
      ? getVotacaoPartidoNacional(PLEITO_NACIONAL.ano, PLEITO_NACIONAL.turno, PLEITO_NACIONAL.cargo).catch(() => [])
      : uf
        ? getVotacaoPartidoUF(MATRIZ_PLEITO.ano, MATRIZ_PLEITO.turno, uf, MATRIZ_PLEITO.cargo).catch(
            () => [],
          )
        : Promise.resolve([]),
  ]);

  const radar =
    agenda.length >= 20
      ? computeRadar(
          agenda,
          {
            partido: perfil.partido,
            proposicoes: perfil.proposicoes,
            frentes: perfil.frentes,
          },
          {
            janela: t.radar.janela,
            lacuna: (v) => fill(t.radar.recLacuna, v),
            consolidar: (v) => fill(t.radar.recConsolidar, v),
            exposicao: (v) => fill(t.radar.recExposicao, v),
            monitorar: (v) => fill(t.radar.recMonitorar, v),
          },
          JANELA_DIAS,
          locale,
        )
      : null;

  const dimensoes: DimensaoLeitura[] = [];
  const acoes: AcaoPrioritaria[] = [];
  let sinais = 0;
  const fontes = new Set<string>();

  // ---- Território (IFET) ----
  let territorioScore = 0;
  if (resumo) {
    const ifet = resumo.ifet;
    sinais += ifet.municipios.length;
    ifet.fontes.forEach((f) => fontes.add(f));

    const prioridade = ifet.municipios.filter((m) => m.quadrante === "prioridade-maxima");
    const topNomes = prioridade.slice(0, 3).map((m) => m.nome);
    const temVoto = !!resumo.eleitoralByCode;
    const concentracao = concentracaoTop(ifet, 5); // % do "peso" nos 5 maiores
    const un = nacional
      ? { s: pt ? "UF" : "state", p: pt ? "UFs" : "states", por: pt ? "UF" : "state" }
      : { s: pt ? "município" : "municipality", p: pt ? "municípios" : "municipalities", por: pt ? "município" : "municipality" };

    territorioScore = Math.round(
      40 + concentracao * 40 + (temVoto ? 20 : 0),
    );

    dimensoes.push({
      chave: "territorio",
      titulo: pt ? "Território" : "Territory",
      valor: String(prioridade.length),
      rotulo: pt ? `${un.p} prioridade máxima` : `top-priority ${un.p}`,
      status: temVoto ? "ok" : "atencao",
      href: "/painel/mapa-de-calor",
      leitura: pt
        ? `Sua força se concentra em ${prioridade.length} ${prioridade.length === 1 ? un.s : un.p} de prioridade máxima${topNomes.length ? ` (${topNomes.join(", ")})` : ""}. ${
            temVoto
              ? `A votação real por ${un.por} está carregada (${resumo.eleitoralTotal?.toLocaleString(locale)} votos em ${resumo.eleitoralAno}).`
              : `A votação real por ${un.por} ainda não foi carregada — o IFET está usando só o contexto territorial.`
          }`
        : `Your strength concentrates in ${prioridade.length} top-priority ${prioridade.length === 1 ? un.s : un.p}${topNomes.length ? ` (${topNomes.join(", ")})` : ""}. ${
            temVoto
              ? `Real vote by ${un.por} is loaded (${resumo.eleitoralTotal?.toLocaleString(locale)} votes in ${resumo.eleitoralAno}).`
              : `Real vote by ${un.por} isn't loaded yet — IFET is using territorial context only.`
          }`,
      barras: quadranteBarras(ifet, pt),
    });

    if (topNomes.length) {
      acoes.push({
        ordem: 0,
        titulo: pt
          ? `Concentrar agenda e recurso em ${topNomes.slice(0, 3).join(", ")}`
          : `Concentrate agenda and budget on ${topNomes.slice(0, 3).join(", ")}`,
        porque: pt
          ? `São ${nacional ? "as UFs" : "os municípios"} com mais voto em jogo e eleitorado conquistável para ${cargoLabel || "a disputa"}.`
          : `They hold the most votes at stake and the most persuadable electorate.`,
        href: "/painel/mapa-de-calor",
      });
    }
    if (!resumo.eleitoralByCode && candidacy.source === "tse" && !nacional) {
      acoes.push({
        ordem: 5,
        titulo: pt ? "Carregar a votação por município do candidato" : "Load the candidate's vote by municipality",
        porque: pt
          ? "Sem ela, o IFET e os cenários trabalham só com o contexto — a leitura fica menos precisa."
          : "Without it, IFET and scenarios run on context only — the read is less precise.",
        href: "/painel/mapa-de-calor",
      });
    }
  } else {
    dimensoes.push({
      chave: "territorio",
      titulo: pt ? "Território" : "Territory",
      valor: "—",
      rotulo: pt ? "sem UF definida" : "no state set",
      status: "pendente",
      href: "/painel/mapa-de-calor",
      leitura: pt
        ? "Não foi possível ler o território — a candidatura está sem UF."
        : "Couldn't read the territory — the candidacy has no state.",
    });
  }

  // ---- Posicionamento (Radar) ----
  let posScore = 0;
  if (radar) {
    sinais += radar.itensAnalisados;
    radar.fontes.forEach((f) => fontes.add(f));
    const lacunas = radar.temas.filter((x) => x.tipo === "lacuna").sort((a, b) => b.heat - a.heat);
    const exposicoes = radar.temas.filter((x) => x.tipo === "exposicao");
    const topLacuna = lacunas[0];

    // menos lacunas quentes em aberto = melhor posicionamento
    const lacunasQuentes = lacunas.filter((x) => x.heat >= 20).length;
    posScore = Math.round(Math.max(15, 80 - lacunasQuentes * 12));

    dimensoes.push({
      chave: "posicionamento",
      titulo: pt ? "Posicionamento" : "Positioning",
      valor: String(lacunas.length),
      rotulo: pt ? "lacunas temáticas a ocupar" : "thematic gaps to claim",
      status: lacunasQuentes > 2 ? "atencao" : "ok",
      href: "/painel/mapa-de-propostas",
      leitura: pt
        ? `${lacunas.length} ${lacunas.length === 1 ? "tema quente na agenda é terreno" : "temas quentes na agenda são terreno"} do seu campo e sem posição sua${topLacuna ? ` — ${lacunas.length === 1 ? "ele" : "o mais forte"} é "${topLacuna.label}"` : ""}. ${exposicoes.length} ${exposicoes.length === 1 ? "tema exige" : "temas exigem"} cuidado ao entrar.`
        : `${lacunas.length} hot ${lacunas.length === 1 ? "theme is" : "themes are"} friendly terrain with no position of yours${topLacuna ? ` — the ${lacunas.length === 1 ? "one" : "strongest"} is "${topLacuna.label}"` : ""}. ${exposicoes.length} ${exposicoes.length === 1 ? "theme needs" : "themes need"} care before entering.`,
      barras: radar.temas
        .slice(0, 5)
        .map((x) => ({ label: x.label, v: x.heat / 100 })),
    });

    if (topLacuna) {
      acoes.push({
        ordem: 1,
        titulo: pt
          ? `Ocupar o tema "${topLacuna.label}" antes do adversário`
          : `Claim the theme "${topLacuna.label}" before the opponent`,
        porque: pt
          ? `Está no ciclo de atenção (${topLacuna.mencoes} projetos na Câmara), é terreno afim ao seu campo e ninguém do seu lado ocupou.`
          : `It's in the attention cycle (${topLacuna.mencoes} bills), friendly terrain, and unclaimed on your side.`,
        href: "/painel/mapa-de-propostas",
      });
    }
    const topExpo = exposicoes.sort((a, b) => b.heat - a.heat)[0];
    if (topExpo && topExpo.heat >= 30) {
      acoes.push({
        ordem: 3,
        titulo: pt
          ? `Definir o enquadramento em "${topExpo.label}"`
          : `Set your framing on "${topExpo.label}"`,
        porque: pt
          ? "Está muito quente e é terreno de tensão para o seu campo — melhor ter uma linha pronta que ser pego sem resposta."
          : "It's hot and it's tense terrain — better to have a line ready than be caught without one.",
        href: "/painel/mapa-de-propostas",
      });
    }
  } else {
    dimensoes.push({
      chave: "posicionamento",
      titulo: pt ? "Posicionamento" : "Positioning",
      valor: "—",
      rotulo: pt ? "agenda indisponível" : "agenda unavailable",
      status: "pendente",
      href: "/painel/mapa-de-propostas",
      leitura: pt
        ? "A agenda legislativa não pôde ser lida agora. Tente recarregar em instantes."
        : "The legislative agenda couldn't be read right now. Try again shortly.",
    });
  }

  // ---- Base (atividade legislativa / histórico eleitoral) ----
  let baseScore = 40;
  const props = perfil.proposicoes;
  if (props && props.total > 0) {
    sinais += props.total;
    fontes.add(pt ? "Câmara — atividade legislativa" : "Chamber — legislative activity");
    baseScore = Math.min(80, 35 + props.total);
    dimensoes.push({
      chave: "base",
      titulo: pt ? "Base e capital político" : "Base and political capital",
      valor: String(props.total),
      rotulo: pt ? "proposições no mandato" : "bills in the mandate",
      status: "ok",
      href: "/painel/candidato",
      leitura: pt
        ? `${props.total} proposições (${props.comEmenta} com ementa) e ${perfil.frentes.length} frentes parlamentares — capital de mandato para sustentar a candidatura.`
        : `${props.total} bills (${props.comEmenta} with a summary) and ${perfil.frentes.length} parliamentary fronts — mandate capital to back the campaign.`,
    });
  } else if (resumo?.eleitoralTotal) {
    baseScore = 55;
    dimensoes.push({
      chave: "base",
      titulo: pt ? "Base e capital político" : "Base and political capital",
      valor: resumo.eleitoralTotal.toLocaleString(locale),
      rotulo: pt ? `votos em ${resumo.eleitoralAno}` : `votes in ${resumo.eleitoralAno}`,
      status: "ok",
      href: "/painel/mapa-de-calor",
      leitura: pt
        ? `Base eleitoral de ${resumo.eleitoralTotal.toLocaleString(locale)} votos em ${resumo.eleitoralAno} distribuída por ${Object.keys(resumo.eleitoralByCode ?? {}).length} municípios.`
        : `Electoral base of ${resumo.eleitoralTotal.toLocaleString(locale)} votes in ${resumo.eleitoralAno} across ${Object.keys(resumo.eleitoralByCode ?? {}).length} municipalities.`,
    });
  } else {
    dimensoes.push({
      chave: "base",
      titulo: pt ? "Base e capital político" : "Base and political capital",
      valor: "—",
      rotulo: pt ? "sem histórico carregado" : "no history loaded",
      status: "pendente",
      href: "/painel/candidato",
      leitura: pt
        ? "Ainda não há atividade legislativa nem votação carregada para medir o capital político."
        : "No legislative activity or vote loaded yet to measure political capital.",
    });
  }

  // ---- Alinhamento ideológico (Matriz) ----
  let matriz: MatrizResultado | null = null;
  if (resumo && votacaoPartido.length >= 100) {
    try {
      matriz = computeMatriz(
        votacaoPartido,
        {
          nomeByCode: resumo.nomeByCode,
          populacaoByCode: resumo.populacaoByCode,
          pibByCode: resumo.pibByCode,
        },
        perfil.partido,
      );
      sinais += matriz.municipios.length;
      fontes.add(pt ? "TSE / Base dos Dados — votação por partido" : "TSE / Base dos Dados — party vote");
      const distUf = Math.hypot(
        matriz.ufMedia.eco - matriz.candidato.eco,
        matriz.ufMedia.soc - matriz.candidato.soc,
      );
      const afins = matriz.maisAfins.slice(0, 3).map((m) => m.nome);
      dimensoes.push({
        chave: "ideologia",
        titulo: pt ? "Alinhamento ideológico" : "Ideological alignment",
        valor: distUf.toFixed(2),
        rotulo: pt ? `distância até a média de ${resumo.ufNome}` : `distance to the ${resumo.ufNome} average`,
        status: distUf > 1.0 ? "atencao" : "ok",
        href: "/painel/matriz-ideologica",
        leitura: pt
          ? `${distUf > 1.0 ? "Distância grande" : "Distância moderada"} entre o seu campo e a média ${nacional ? "nacional" : "do estado"}. Suas ${nacional ? "UFs" : "regiões"} mais afins: ${afins.join(", ")}. Fora delas, o discurso precisa de tradução.`
          : `${distUf > 1.0 ? "Large" : "Moderate"} distance between your field and the ${nacional ? "national" : "state"} average. Your most aligned ${nacional ? "states" : "regions"}: ${afins.join(", ")}. Elsewhere, the message needs translation.`,
      });
    } catch {
      /* matriz é opcional no painel */
    }
  }

  const prontidaoScore = Math.round(
    territorioScore * 0.4 + posScore * 0.35 + baseScore * 0.25,
  );
  const nivel = nivelFrom(prontidaoScore);

  const campo = radar?.campoCandidato ?? "transversal";

  const sintese = pt
    ? montarSintesePt({ perfil, cargoLabel, resumo, radar, nivel })
    : montarSinteseEn({ perfil, cargoLabel, resumo, radar, nivel });

  acoes.sort((a, b) => a.ordem - b.ordem);
  acoes.forEach((a, i) => (a.ordem = i + 1));

  return {
    version: MOTOR_VERSION,
    geradoEm: new Date().toISOString(),
    campo,
    sintese,
    prontidao: {
      score: prontidaoScore,
      nivel,
      leitura: leituraNivel(nivel, pt),
    },
    dimensoes,
    acoes: acoes.slice(0, 4),
    sinaisAnalisados: sinais,
    fontes: [...fontes],
  };
}

// ---------- helpers ----------

function fill(tpl: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    tpl,
  );
}

function concentracaoTop(ifet: IfetResultado, n: number): number {
  const scores = ifet.municipios.map((m) => m.score).sort((a, b) => b - a);
  const total = scores.reduce((s, v) => s + v, 0) || 1;
  const top = scores.slice(0, n).reduce((s, v) => s + v, 0);
  return Math.min(1, top / total);
}

function quadranteBarras(ifet: IfetResultado, pt: boolean) {
  const total = ifet.municipios.length || 1;
  const count = (quad: string) => ifet.municipios.filter((m) => m.quadrante === quad).length;
  return [
    { label: pt ? "Prioridade máxima" : "Top priority", v: count("prioridade-maxima") / total },
    { label: pt ? "Consolidar" : "Consolidate", v: count("consolidar") / total },
    { label: pt ? "Oportunidade" : "Opportunity", v: count("oportunidade-dispersa") / total },
  ];
}

function leituraNivel(n: NivelProntidao, pt: boolean): string {
  const m = {
    critico: pt
      ? "Faltam dados ou definições básicas — a estratégia ainda não fecha."
      : "Basic data or decisions are missing — the strategy doesn't close yet.",
    atencao: pt
      ? "Há base, mas lacunas importantes de território ou de agenda."
      : "There's a base, but important territory or agenda gaps remain.",
    competitivo: pt
      ? "Estratégia com direção clara; falta executar as prioridades."
      : "Clear strategic direction; priorities need executing.",
    favoravel: pt
      ? "Território, agenda e base alinhados — o jogo está no seu campo."
      : "Territory, agenda and base aligned — the game is on your side.",
  };
  return m[n];
}

type SinteseArgs = {
  perfil: PerfilPolitico;
  cargoLabel: string;
  resumo: Awaited<ReturnType<typeof getIfetResumoUF>>;
  radar: RadarResultado | null;
  nivel: NivelProntidao;
};

function montarSintesePt(a: SinteseArgs): string {
  const partes: string[] = [];
  const alvo = a.cargoLabel ? `à ${a.cargoLabel}` : "na disputa";
  if (a.resumo) {
    const pm = a.resumo.ifet.municipios.filter((m) => m.quadrante === "prioridade-maxima").length;
    partes.push(
      `Na candidatura de ${a.perfil.nome} ${alvo}, o território de ${a.resumo.ufNome} tem ${pm} ${pm === 1 ? "praça" : "praças"} de prioridade máxima`,
    );
  }
  if (a.radar) {
    const lac = a.radar.temas.filter((x) => x.tipo === "lacuna").length;
    partes.push(
      `${lac} ${lac === 1 ? "tema quente" : "temas quentes"} da agenda ${lac === 1 ? "está" : "estão"} sem posição sua e ${lac === 1 ? "é" : "são"} terreno do seu campo`,
    );
  }
  const fecho = {
    critico: "O Motor recomenda fechar as pendências de dado antes de definir a estratégia.",
    atencao: "O Motor aponta ganho rápido em ocupar as lacunas e concentrar o esforço territorial.",
    competitivo: "O Motor tem direção clara: as ações abaixo são o caminho mais curto para a maioria.",
    favoravel: "O Motor indica manter a rota e blindar a base — o cenário favorece o crescimento.",
  }[a.nivel];
  return (partes.join(". ") + ". " + fecho).replace(/\.\./g, ".");
}

function montarSinteseEn(a: SinteseArgs): string {
  const partes: string[] = [];
  if (a.resumo) {
    const pm = a.resumo.ifet.municipios.filter((m) => m.quadrante === "prioridade-maxima").length;
    partes.push(
      `For ${a.perfil.nome}'s race, the territory of ${a.resumo.ufNome} has ${pm} top-priority ${pm === 1 ? "stronghold" : "strongholds"}`,
    );
  }
  if (a.radar) {
    const lac = a.radar.temas.filter((x) => x.tipo === "lacuna").length;
    partes.push(`${lac} hot ${lac === 1 ? "theme is" : "themes are"} unclaimed by you on friendly terrain`);
  }
  const fecho = {
    critico: "The Engine recommends closing the data gaps before setting the strategy.",
    atencao: "The Engine sees quick wins in claiming the gaps and concentrating the territorial effort.",
    competitivo: "The Engine has a clear direction: the actions below are the shortest path to a majority.",
    favoravel: "The Engine says hold the course and shield the base — the scenario favours growth.",
  }[a.nivel];
  return partes.join(". ") + ". " + fecho;
}
