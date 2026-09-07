import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getAgendaCamara } from "@/lib/data-sources/agenda";
import { computeRadar, type TemaRadar, type TipoRadar } from "@/lib/intel/radar";

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

  const agenda = await getAgendaCamara(JANELA_DIAS);

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
  const radar = computeRadar(agenda, perfil, textos, JANELA_DIAS, locale === "pt" ? "pt" : "en");

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
  const alignLabel = (a: TemaRadar["alinhamento"]) =>
    a === "afim" ? t.radar.alignAfim : a === "tensao" ? t.radar.alignTensao : t.radar.alignNeutro;

  const counts = (["lacuna", "exposicao", "consolidar", "monitorar"] as TipoRadar[]).map((k) => ({
    k,
    n: radar.temas.filter((x) => x.tipo === k).length,
  }));

  return (
    <ToolShell
      id="mapa-de-propostas"
      realData
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
            <p className="font-ui text-[24px] font-light text-ink">{n}</p>
            <p className="font-ui mt-1 text-caption text-fossil">{tipoLabel[k]}</p>
          </div>
        ))}
      </div>

      {/* ranking */}
      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.radar.ranking}</h3>
        <ol className="mt-4 divide-y divide-ash">
          {radar.temas.map((tema) => (
            <li key={tema.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start gap-4">
                <div className="w-28 shrink-0">
                  <div className="font-ui flex items-baseline justify-between text-caption">
                    <span className="text-pebble">{t.radar.colHeat}</span>
                    <span className="text-fossil">{tema.heat}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-[2px] bg-sand">
                    <div
                      className="h-full rounded-[2px] bg-olive"
                      style={{ width: `${tema.heat}%` }}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-ui text-body text-ink">{tema.label}</span>
                    <span
                      className="font-ui rounded-[3px] px-1.5 py-0.5 text-[11px]"
                      style={{ background: "var(--color-sand)", color: "var(--color-smoke)" }}
                    >
                      {tipoLabel[tema.tipo]}
                    </span>
                    <span
                      className={
                        "font-ui rounded-[3px] px-1.5 py-0.5 text-[11px] " +
                        (tema.alinhamento === "tensao"
                          ? "bg-[#c9772f]/20 text-smoke"
                          : tema.alinhamento === "afim"
                            ? "bg-olive/20 text-smoke"
                            : "bg-sand text-smoke")
                      }
                    >
                      {alignLabel(tema.alinhamento)}
                    </span>
                  </div>
                  <p className="font-ui mt-1 text-caption text-pebble">
                    {tema.candidatoAtivo
                      ? tema.iniciativasCandidato > 0
                        ? fill(t.radar.statusAtivo, { k: tema.iniciativasCandidato })
                        : t.radar.statusFrentes
                      : t.radar.statusSilente}
                    {" · "}
                    {tema.mencoes} {pt ? "projetos" : "bills"}
                  </p>
                  <p className="mt-2 text-body-sm text-fossil">
                    <span className="text-pebble">{t.radar.recommendation}: </span>
                    {tema.recomendacao}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ficha técnica */}
      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.radar.fichaTitle}</h3>
        <dl className="font-ui mt-3 grid gap-x-8 gap-y-3 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-pebble">{t.radar.version}</dt>
            <dd className="text-smoke">{radar.version}</dd>
          </div>
          <div>
            <dt className="text-pebble">{t.radar.sources}</dt>
            <dd className="text-smoke">{radar.fontes.join(" · ")}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-pebble">{t.radar.pending}</dt>
            <dd className="mt-1 space-y-1 text-caption text-fossil">
              {t.radar.pendingItems.map((p) => (
                <p key={p}>— {p}</p>
              ))}
            </dd>
          </div>
        </dl>
      </div>

      <p className="font-ui mt-4 rounded-[4px] border border-ash bg-sand/60 p-3 text-caption text-smoke">
        {t.radar.disclaimer}
      </p>
    </ToolShell>
  );
}
