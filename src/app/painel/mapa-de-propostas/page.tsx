import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { Info } from "@/components/app/Info";
import { URGENCIA_RADAR, urgVar } from "@/lib/viz/colors";
import { getDictionary } from "@/lib/i18n";
import { FichaMetodologica } from "@/components/app/FichaMetodologica";
import { FICHAS } from "@/lib/intel/fichas";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getAgendaCamara } from "@/lib/data-sources/agenda";
import { getManchetes, getTendencias } from "@/lib/data-sources/imprensa";
import { computeRadar, type TemaRadar, type TipoRadar } from "@/lib/intel/radar";
import { RadarLista } from "@/components/app/RadarLista";

export const metadata: Metadata = { title: "Mapa de Propostas" };

const JANELA_DIAS = 120;

function fill(tpl: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    tpl,
  );
}

export default async function Page() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  const howItWorks = pt
    ? [
        "Lê as proposições apresentadas na Câmara nos últimos meses (Dados Abertos).",
        "Classifica cada uma por tema com um vocabulário controlado e versionado.",
        "Cruza o que está no ciclo de atenção com a atividade legislativa do candidato.",
        "Marca cada tema como terreno afim ou de tensão para o campo político dele.",
      ]
    : [
        "Reads the bills filed in the Chamber over recent months (Open Data).",
        "Classifies each one by theme with a controlled, versioned vocabulary.",
        "Crosses what's in the attention cycle with the candidate's legislative activity.",
        "Flags each theme as friendly or tense terrain for their political field.",
      ];
  const outputs = pt
    ? [
        "Ranking dos temas no ciclo de atenção do Congresso.",
        "Lacunas: tema quente, afim ao campo, sem posição registrada.",
        "Recomendação de direção — qualitativa, para uso interno.",
      ]
    : [
        "Ranking of themes in the Congress attention cycle.",
        "Gaps: hot theme, friendly to the field, no position on record.",
        "Directional recommendation — qualitative, for internal use.",
      ];

  if (!candidacy || !perfil) {
    return (
      <ToolShell id="mapa-de-propostas" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <div className="card">
          <p className="text-body-sm text-fossil">{t.maps.needCandidate}</p>
          <Link href="/onboarding" className="btn btn-primary mt-4">
            {t.maps.goOnboarding} <ArrowRight size={16} />
          </Link>
        </div>
      </ToolShell>
    );
  }

  const [agenda, manchetes, tendencias] = await Promise.all([
    getAgendaCamara(JANELA_DIAS),
    getManchetes().catch(() => []),
    getTendencias().catch(() => []),
  ]);
  const contexto = [
    ...manchetes.map((m) => ({ texto: m.titulo, data: m.data, peso: 1.6 })),
    ...tendencias.map((tr) => ({ texto: tr.titulo, data: tr.data, peso: 2.2 })),
  ];

  if (agenda.length < 20) {
    return (
      <ToolShell id="mapa-de-propostas" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <div className="card">
          <p className="text-body-sm text-fossil">{t.radar.empty}</p>
        </div>
      </ToolShell>
    );
  }

  const textos = {
    janela: t.radar.janela,
    lacuna: (v: { tema: string; n: number; janela: string }) => fill(t.radar.recLacuna, v),
    consolidar: (v: { tema: string; n: number }) => fill(t.radar.recConsolidar, v),
    exposicao: (v: { tema: string; n: number }) => fill(t.radar.recExposicao, v),
    monitorar: (v: { tema: string; n: number }) => fill(t.radar.recMonitorar, v),
  };
  const radar = computeRadar(agenda, perfil, textos, JANELA_DIAS, locale === "pt" ? "pt" : "en", contexto);

  const campoLabel =
    radar.campoCandidato === "progressista"
      ? t.radar.campoProgressista
      : radar.campoCandidato === "conservador"
        ? t.radar.campoConservador
        : t.radar.campoTransversal;

  const tipoLabel: Record<TipoRadar, string> = {
    lacuna: t.radar.tipoLacuna,
    consolidar: t.radar.tipoConsolidar,
    exposicao: t.radar.tipoExposicao,
    monitorar: t.radar.tipoMonitorar,
  };
  const alignLabel: Record<TemaRadar["alinhamento"], string> = {
    afim: t.radar.alignAfim,
    tensao: t.radar.alignTensao,
    neutro: t.radar.alignNeutro,
  };

  const counts = (["lacuna", "exposicao", "consolidar", "monitorar"] as TipoRadar[]).map((k) => ({
    k,
    n: radar.temas.filter((x) => x.tipo === k).length,
  }));

  const lacunas = radar.temas.filter((x) => x.tipo === "lacuna").sort((a, b) => b.heat - a.heat);
  const exposicoes = radar.temas.filter((x) => x.tipo === "exposicao");
  const conclusao = pt
    ? `${lacunas.length} ${lacunas.length === 1 ? "tema quente" : "temas quentes"} da agenda ${lacunas.length === 1 ? "é" : "são"} terreno do campo de ${perfil.nome} e ${lacunas.length === 1 ? "está" : "estão"} sem posição pública${lacunas[0] ? ` — a maior é "${lacunas[0].label}"` : ""}. ${exposicoes.length} ${exposicoes.length === 1 ? "exige" : "exigem"} cuidado ao entrar. Priorize ocupar as lacunas.`
    : `${lacunas.length} hot ${lacunas.length === 1 ? "theme is" : "themes are"} friendly terrain for ${perfil.nome} with no public position${lacunas[0] ? ` — the biggest is "${lacunas[0].label}"` : ""}. ${exposicoes.length} need care before entering. Prioritise claiming the gaps.`;

  return (
    <ToolShell
      id="mapa-de-propostas"
      realData
      conclusao={conclusao}
      conclusaoTexto={conclusao}
      updatedAt={radar.version}
      howItWorks={howItWorks}
      outputs={outputs}
    >
      <h2 className="t-heading text-[22px]">
        {t.radar.name} <span className="mark ml-1 text-caption">{t.radar.tag}</span>
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-fossil">
        {fill(t.radar.intro, { dias: radar.janelaDias, n: radar.itensAnalisados, nome: perfil.nome })}
      </p>
      <p className="font-ui mt-3 inline-block rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
        {fill(t.radar.fieldNote, { partido: perfil.partido || "—", campo: campoLabel })}
      </p>

      {/* resumo */}
      <div className="mt-6 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-ash bg-ash sm:grid-cols-4">
        {counts.map(({ k, n }) => (
          <div key={k} className="bg-paper p-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: urgVar(URGENCIA_RADAR[k] ?? "none") }}
              />
              <p className="font-ui text-[24px] font-light text-ink">{n}</p>
            </div>
            <p className="font-ui mt-1 text-caption text-fossil">{tipoLabel[k]}</p>
          </div>
        ))}
      </div>

      {/* ranking */}
      <div className="card mt-6">
        <h3 className="t-heading flex items-center text-[20px]">
          {t.radar.ranking}
          <Info label={t.radar.colHeat}>
            {pt
              ? '"No ciclo" (0–100) é o quanto o tema aparece na agenda recente da Câmara, com peso maior para projetos dos últimos dias. "Lacuna a ocupar" = quente + afim ao seu campo + sem posição sua. "Cuidado ao entrar" = quente, mas terreno de tensão para o seu lado.'
              : '"In cycle" (0–100) is how much the theme shows up in the Chamber\'s recent agenda, weighted toward the last few days. "Gap to claim" = hot + friendly to your field + no position of yours. "Careful entering" = hot, but tense terrain for your side.'}
          </Info>
        </h3>
        <div className="mt-4">
          <RadarLista
            temas={radar.temas}
            modulo={t.radar.name}
            locale={locale}
            labels={{
              heat: t.radar.colHeat,
              recommendation: t.radar.recommendation,
              tipo: tipoLabel,
              align: alignLabel,
              all: pt ? "Todas" : "All",
              inPress: pt ? "no noticiário" : "in the news",
            }}
          />
        </div>
      </div>

      <FichaMetodologica ficha={FICHAS.radar(pt)} locale={locale} labels={t.ficha} />

      <p className="font-ui mt-3 rounded-[4px] border border-ash bg-sand/60 p-3 text-caption text-smoke">
        {t.radar.disclaimer}
      </p>
    </ToolShell>
  );
}
