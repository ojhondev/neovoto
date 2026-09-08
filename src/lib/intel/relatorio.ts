/**
 * Relatório NeoVoto — o documento estratégico completo para a equipe.
 * Junta o playbook (Motor), o placar (Cenários), o território (IFET), o
 * posicionamento (Radar + Matriz), as alianças (Coligações) e o adversário
 * (Mapa de Influência) num texto acionável, baseado EM DADOS REAIS.
 * Sem opinião, sem mock. Uso interno (Lei 9.504).
 */
import type { Candidacy } from "@/db/schema";
import type { PerfilPolitico } from "@/lib/politico";
import type { Dictionary } from "@/lib/i18n";
import { CARGO_LABEL, type Cargo } from "@/lib/cargos";
import { computePlano } from "@/lib/intel/plano";
import { carregarCenarios } from "@/lib/intel/cenarios-load";
import { getIfetResumoUF } from "@/lib/territory";
import { getAgendaCamara } from "@/lib/data-sources/agenda";
import { getVotacaoPartidoUF } from "@/lib/data-sources/regional";
import { computeRadar } from "@/lib/intel/radar";
import { computeMatriz, MATRIZ_PLEITO } from "@/lib/intel/matriz";

export const RELATORIO_VERSION = "relatorio-v1";

export type SecaoRelatorio = {
  chave: string;
  titulo: string;
  paragrafos: string[];
  itens?: { label: string; valor?: string }[];
};

export type RelatorioNeoVoto = {
  version: string;
  candidato: string;
  cargo: string;
  uf: string;
  objetivo: string;
  resumoExecutivo: string;
  secoes: SecaoRelatorio[];
};

function pct(n: number) {
  return `${(n * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

export async function computeRelatorio(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
  t: Dictionary,
  locale: "pt" | "en",
): Promise<RelatorioNeoVoto> {
  const pt = locale === "pt";
  const uf = perfil.uf || candidacy.uf || "";
  const cargo = (candidacy.cargo as Cargo | null) ?? perfil.cargo ?? null;
  const cargoLabel = cargo ? CARGO_LABEL[cargo]?.[locale] ?? cargo : "";
  const objetivo =
    t.onboarding.objectives.find((o) => o.value === candidacy.objective)?.label ??
    candidacy.objective ??
    "";

  const [plano, cenLoad, resumo, agenda, votacaoPartido] = await Promise.all([
    computePlano(candidacy, perfil, t, locale),
    carregarCenarios(candidacy, perfil, t),
    uf ? getIfetResumoUF(uf, candidacy.id).catch(() => null) : Promise.resolve(null),
    getAgendaCamara(120).catch(() => []),
    uf
      ? getVotacaoPartidoUF(MATRIZ_PLEITO.ano, MATRIZ_PLEITO.turno, uf, MATRIZ_PLEITO.cargo).catch(() => [])
      : Promise.resolve([]),
  ]);
  const cen = cenLoad.ok ? cenLoad.cenarios : null;

  const radar =
    agenda.length >= 20
      ? computeRadar(
          agenda,
          { partido: perfil.partido, proposicoes: perfil.proposicoes, frentes: perfil.frentes },
          {
            janela: t.radar.janela,
            lacuna: (v) => v.tema,
            consolidar: (v) => v.tema,
            exposicao: (v) => v.tema,
            monitorar: (v) => v.tema,
          },
          120,
          locale,
        )
      : null;
  const matriz =
    resumo && votacaoPartido.length >= 100
      ? computeMatriz(
          votacaoPartido,
          { nomeByCode: resumo.nomeByCode, populacaoByCode: resumo.populacaoByCode, pibByCode: resumo.pibByCode },
          perfil.partido,
        )
      : null;

  const secoes: SecaoRelatorio[] = [];

  // ---- Diagnóstico ----
  secoes.push({
    chave: "diagnostico",
    titulo: pt ? "Diagnóstico" : "Diagnosis",
    paragrafos: [
      plano.frase,
      pt
        ? `Índice de Prontidão: ${plano.placar ? "" : ""}${objetivoFrase(plano, pt)}`
        : `Readiness assessment: ${objetivoFrase(plano, pt)}`,
    ].filter(Boolean),
  });

  // ---- Placar ----
  if (cen) {
    const falta = cen.faltam;
    const alvo3 = cen.municipiosAlvo.slice(0, 3).map((m) => m.nome);
    const swing = cen.votosNecessarios > 0 ? Math.min(1, Math.max(0, (cen.sensibilidade[0]?.impacto ?? 0) / cen.votosNecessarios)) : 0;
    secoes.push({
      chave: "placar",
      titulo: pt ? "O placar" : "The scoreboard",
      paragrafos: [
        pt
          ? `Projeção no cenário base: ${cen.votosBase.toLocaleString(locale)} votos. Barra para eleger: ${cen.votosNecessarios.toLocaleString(locale)}. ${falta > 0 ? `Faltam ${Math.abs(falta).toLocaleString(locale)} votos` : `Folga de ${Math.abs(falta).toLocaleString(locale)} votos`}.`
          : `Base-scenario projection: ${cen.votosBase.toLocaleString(locale)} votes. Bar to get elected: ${cen.votosNecessarios.toLocaleString(locale)}. ${falta > 0 ? `${Math.abs(falta).toLocaleString(locale)} votes missing` : `${Math.abs(falta).toLocaleString(locale)}-vote cushion`}.`,
        pt
          ? `Cenário favorável: ${cen.cenarios[1]?.votos.toLocaleString(locale)}. Cenário adverso: ${cen.cenarios[2]?.votos.toLocaleString(locale)}.`
          : `Favourable: ${cen.cenarios[1]?.votos.toLocaleString(locale)}. Adverse: ${cen.cenarios[2]?.votos.toLocaleString(locale)}.`,
        pt
          ? `O fator que mais move o ponteiro é "${cen.sensibilidade[0]?.fator}". Converter as lacunas de voto nos municípios prioritários (${alvo3.join(", ")}) pode adicionar cerca de ${pct(swing)} do total necessário — estimativa heurística sobre a votação real, não uma previsão.`
          : `The biggest lever is "${cen.sensibilidade[0]?.fator}". Converting the vote gaps in the priority municipalities (${alvo3.join(", ")}) could add about ${pct(swing)} of the needed total — a heuristic estimate on the real vote, not a forecast.`,
      ],
      itens: cen.municipiosAlvo.slice(0, 6).map((m) => ({
        label: m.nome,
        valor: pt ? `+${m.ganhoPotencial.toLocaleString(locale)} votos · IFET ${m.ifet}` : `+${m.ganhoPotencial.toLocaleString(locale)} votes · IFET ${m.ifet}`,
      })),
    });
  }

  // ---- Território ----
  if (resumo) {
    const ifet = resumo.ifet;
    const pm = ifet.municipios.filter((m) => m.quadrante === "prioridade-maxima");
    const consolidar = ifet.municipios.filter((m) => m.quadrante === "consolidar");
    const top = pm.slice(0, 5).map((m) => m.nome);
    const fortes = consolidar.slice(0, 3).map((m) => m.nome);
    secoes.push({
      chave: "territorio",
      titulo: pt ? "Território" : "Territory",
      paragrafos: [
        pt
          ? `${resumo.ufNome} tem ${pm.length} municípios de prioridade máxima — muito voto em jogo e eleitorado conquistável. Concentre agenda, tempo do candidato e recurso de comunicação em ${top.join(", ")}.`
          : `${resumo.ufNome} has ${pm.length} top-priority municipalities — lots of votes at stake and a persuadable electorate. Concentrate agenda, candidate time and communication budget on ${top.join(", ")}.`,
        fortes.length
          ? pt
            ? `Onde você já é forte (${fortes.join(", ")}): defenda a base, não desperdice palanque — o voto ali é mais cristalizado.`
            : `Where you're already strong (${fortes.join(", ")}): defend the base, don't waste rallies — the vote there is more crystallised.`
          : "",
        resumo.eleitoralByCode
          ? pt
            ? `A votação real por município está carregada (${resumo.eleitoralTotal?.toLocaleString(locale)} votos em ${resumo.eleitoralAno}).`
            : `Real vote by municipality is loaded (${resumo.eleitoralTotal?.toLocaleString(locale)} votes in ${resumo.eleitoralAno}).`
          : pt
            ? "A votação por município do candidato ainda não foi carregada — o IFET usa só o contexto territorial."
            : "The candidate's vote by municipality isn't loaded — IFET uses territorial context only.",
      ].filter(Boolean),
    });
  }

  // ---- Posicionamento ----
  if (radar || matriz) {
    const paras: string[] = [];
    if (radar) {
      const lac = radar.temas.filter((x) => x.tipo === "lacuna").sort((a, b) => b.heat - a.heat);
      const expo = radar.temas.filter((x) => x.tipo === "exposicao").sort((a, b) => b.heat - a.heat);
      if (lac.length) {
        const nomes = lac.slice(0, 3).map((x) => x.label);
        paras.push(
          pt
            ? `Há ${lac.length} temas quentes na agenda do Congresso que são terreno do seu campo e sobre os quais o candidato não tem posição pública — os mais fortes: ${nomes.join(", ")}. Ocupá-los primeiro, com fala própria, tende a render crescimento onde o adversário ainda não plantou bandeira.`
            : `There are ${lac.length} hot themes on the Congress agenda that are friendly terrain and where the candidate has no public position — the strongest: ${nomes.join(", ")}. Claiming them first tends to yield growth where the opponent hasn't planted a flag.`,
        );
      }
      if (expo[0] && expo[0].heat >= 30) {
        paras.push(
          pt
            ? `Cuidado com "${expo[0].label}": tema muito quente e terreno de tensão para o seu campo. Tenha uma linha pronta pelo lado prático/local; o silêncio custa menos que uma fala mal calibrada.`
            : `Careful with "${expo[0].label}": very hot and tense terrain for your field. Have a line ready via the practical/local angle.`,
        );
      }
    }
    if (matriz && matriz.candidato.conhecido) {
      const afins = matriz.maisAfins.slice(0, 3);
      const distantes = matriz.maisDistantes.slice(0, 3);
      paras.push(
        pt
          ? `Ideologicamente, suas regiões mais afins são ${afins.map((m) => m.nome).join(", ")} — ali o discurso do candidato ressoa sem tradução. Já em ${distantes.map((m) => m.nome).join(", ")}, o eixo do eleitorado é mais ${matriz.ufMedia.eco >= 0 ? "de mercado" : "estatista"} e ${matriz.ufMedia.soc >= 0 ? "conservador nos costumes" : "liberal nos costumes"}: nesses municípios, aproxime a pauta de temas como ${matriz.ufMedia.eco >= 0 ? "empreendedorismo, desburocratização e custo de vida" : "trabalho, geração de emprego e serviços públicos"}, evitando a linguagem de confronto ideológico.`
          : `Ideologically, your most aligned regions are ${afins.map((m) => m.nome).join(", ")}. In ${distantes.map((m) => m.nome).join(", ")} the electorate leans more ${matriz.ufMedia.eco >= 0 ? "market" : "statist"} and ${matriz.ufMedia.soc >= 0 ? "socially conservative" : "socially liberal"}: bring the agenda closer to ${matriz.ufMedia.eco >= 0 ? "small business, deregulation and cost of living" : "jobs and public services"}, avoiding ideological confrontation.`,
      );
    }
    if (paras.length)
      secoes.push({ chave: "posicionamento", titulo: pt ? "Posicionamento e agenda" : "Positioning and agenda", paragrafos: paras });
  }

  // ---- Alianças + Adversário: dos passos do plano ----
  const alianca = plano.passos.find((p) => p.eixo === "alianca");
  if (alianca) {
    secoes.push({
      chave: "aliancas",
      titulo: pt ? "Alianças" : "Alliances",
      paragrafos: [alianca.titulo + ". " + alianca.detalhe + (alianca.ganho ? ` (${alianca.ganho})` : "")],
      itens: alianca.alvos.map((a) => ({ label: a.nome, valor: a.valor })),
    });
  }
  const ataque = plano.passos.find((p) => p.eixo === "ataque");
  if (ataque) {
    secoes.push({
      chave: "adversario",
      titulo: pt ? "Onde atacar o adversário" : "Where to attack the opponent",
      paragrafos: [ataque.detalhe],
      itens: ataque.alvos.map((a) => ({ label: a.nome, valor: a.valor })),
    });
  }

  // ---- Plano de ação + comunicação ----
  const passosTxt = plano.passos.map((p) => `${p.ordem}. ${p.titulo} — ${p.detalhe}`);
  const alvosComm = (cen?.municipiosAlvo ?? []).slice(0, 3).map((m) => m.nome);
  const temasComm = radar?.temas.filter((x) => x.tipo === "lacuna").slice(0, 2).map((x) => x.label) ?? [];
  const comm = alvosComm.length
    ? pt
      ? `Comunicação: direcione a mídia digital geolocalizada (anúncios por município no Meta, TikTok e YouTube — sempre por localidade, nunca por perfil individual) para ${alvosComm.join(", ")}${temasComm.length ? `, com os temas ${temasComm.join(" e ")}` : ""}. Combine com presença física do candidato nas mesmas praças. A NeoVoto indica onde e o quê; a criação e a veiculação da peça são da equipe.`
      : `Communication: point geo-targeted digital media (ads by municipality on Meta, TikTok and YouTube — always by locality, never by individual profile) to ${alvosComm.join(", ")}${temasComm.length ? `, with the themes ${temasComm.join(" and ")}` : ""}. Combine with the candidate's physical presence in the same places.`
    : "";
  secoes.push({
    chave: "plano",
    titulo: pt ? "Plano de ação" : "Action plan",
    paragrafos: [...passosTxt, comm].filter(Boolean),
  });

  const resumoExecutivo = plano.frase;

  return {
    version: RELATORIO_VERSION,
    candidato: perfil.nome,
    cargo: cargoLabel,
    uf: perfil.uf || "",
    objetivo,
    resumoExecutivo,
    secoes,
  };
}

function objetivoFrase(plano: Awaited<ReturnType<typeof computePlano>>, pt: boolean): string {
  if (!plano.placar) return pt ? "faltam dados para o placar." : "scoreboard data missing.";
  const s = plano.placar.situacao;
  return s === "eleito"
    ? pt
      ? "no cenário base, a candidatura elege — o foco é blindar a vitória."
      : "in the base scenario the candidacy wins — focus on locking it in."
    : s === "disputa"
      ? pt
        ? "a candidatura está no limite — as ações abaixo definem o resultado."
        : "the candidacy is on the edge — the actions below decide it."
      : pt
        ? "no cenário base a candidatura não elege — é preciso executar todas as frentes."
        : "in the base scenario the candidacy doesn't win — every front must be executed.";
}
