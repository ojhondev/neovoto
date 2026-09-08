import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Trophy, MapPin, MessageSquareText, Handshake, Crosshair, Database } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { computePlano, type EixoPasso } from "@/lib/intel/plano";
import { IfetInfo } from "@/components/app/IfetInfo";
import { Info } from "@/components/app/Info";
import { URGENCIA_RESULTADO, urgVar, catVar } from "@/lib/viz/colors";

export const metadata: Metadata = { title: "Como Ganhar" };

function n(v: number, locale: string) {
  return Math.round(v).toLocaleString(locale);
}

const EIXO_ICON: Record<EixoPasso, typeof MapPin> = {
  territorio: MapPin,
  agenda: MessageSquareText,
  alianca: Handshake,
  ataque: Crosshair,
  dado: Database,
};

export default async function Page() {
  const { locale, t } = await getDictionary();
  const loc = locale === "pt" ? "pt" : "en";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  if (!candidacy || !perfil) {
    return (
      <>
        <p className="t-eyebrow mb-3">{t.motor.name}</p>
        <h1 className="t-heading-lg">{t.comoGanhar.title}</h1>
        <p className="mt-3 max-w-xl text-body text-fossil">{t.comoGanhar.needCandidate}</p>
        <Link href="/onboarding" className="btn btn-primary mt-6">
          {t.dash.emptyCta} <ArrowRight size={16} />
        </Link>
      </>
    );
  }

  const plano = await computePlano(candidacy, perfil, t, loc);
  const eixoLabel: Record<EixoPasso, string> = {
    territorio: t.comoGanhar.eixoTerritorio,
    agenda: t.comoGanhar.eixoAgenda,
    alianca: t.comoGanhar.eixoAlianca,
    ataque: t.comoGanhar.eixoAtaque,
    dado: t.comoGanhar.eixoDado,
  };

  const placar = plano.placar;
  const sitCor =
    placar?.situacao === "eleito"
      ? urgVar(URGENCIA_RESULTADO.vitoria)
      : placar?.situacao === "disputa"
        ? urgVar(URGENCIA_RESULTADO.disputa)
        : urgVar(URGENCIA_RESULTADO.derrota);
  const sitLabel =
    placar?.situacao === "eleito" ? t.comoGanhar.eleito : placar?.situacao === "disputa" ? t.comoGanhar.emDisputa : t.comoGanhar.fora;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Trophy size={16} className="text-ink" />
        <span className="t-eyebrow">{t.motor.name}</span>
      </div>
      <h1 className="t-heading-lg mt-2">{t.comoGanhar.title}</h1>
      <p className="mt-3 max-w-2xl text-body text-fossil">
        {t.comoGanhar.intro.replace("{nome}", perfil.nome)}
      </p>
      <p className="font-ui mt-2 inline-block rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
        {t.comoGanhar.objetivo}: {plano.objetivo}
      </p>

      {/* ---- FRASE ---- */}
      <p className="mt-5 border-l-2 border-olive pl-4 text-body text-ink">{plano.frase}</p>

      {/* ---- PLACAR ---- */}
      {placar && (
        <section className="mt-6 rounded-[var(--radius-card-lg)] border border-ash bg-paper p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="t-eyebrow flex items-center">
              {t.comoGanhar.placarTitle}
              <Info label={t.comoGanhar.placarTitle}>
                {loc === "pt"
                  ? "Votos projetados no cenário base × a barra para eleger. Numa disputa majoritária a barra é a maioria dos votos válidos; na proporcional, o voto do último eleito no pleito de referência. Projeção heurística sobre a votação real — não é previsão."
                  : "Projected votes in the base scenario vs. the bar to get elected. In a majority race the bar is a majority of valid votes; in a proportional one, the last-elected's vote. Heuristic projection on the real vote — not a forecast."}
              </Info>
            </p>
            <span
              className="font-ui rounded-[3px] px-2 py-0.5 text-caption text-white"
              style={{ background: sitCor }}
            >
              {sitLabel}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-2">
            <div>
              <p className="font-ui text-caption text-pebble">{t.comoGanhar.projetado}</p>
              <p className="font-ui text-[34px] font-light leading-none text-ink">
                {n(placar.votosBase, locale)}
              </p>
            </div>
            <div>
              <p className="font-ui text-caption text-pebble">{t.comoGanhar.necessarios}</p>
              <p className="font-ui text-[34px] font-light leading-none text-fossil">
                {n(placar.votosNecessarios, locale)}
              </p>
            </div>
            <div>
              <p className="font-ui text-caption text-pebble">
                {placar.faltam > 0 ? t.comoGanhar.faltam : t.comoGanhar.folga}
              </p>
              <p
                className="font-ui text-[34px] font-light leading-none"
                style={{ color: placar.faltam > 0 ? urgVar("high") : urgVar("low") }}
              >
                {n(Math.abs(placar.faltam), locale)}
              </p>
            </div>
          </div>
          <div className="relative mt-4 h-3 rounded-[3px] bg-sand">
            <div
              className="h-full rounded-[3px]"
              style={{
                width: `${Math.min(100, (placar.votosBase / placar.votosNecessarios) * 100)}%`,
                background: placar.faltam > 0 ? urgVar("high") : urgVar("low"),
              }}
            />
            <div className="absolute inset-y-[-3px] w-px bg-ink" style={{ left: "100%" }} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {placar.cenarios.map((c) => (
              <div key={c.nome} className="font-ui rounded-[6px] border border-ash p-3">
                <p className="text-caption text-pebble">{c.nome}</p>
                <p className="mt-1 text-body text-ink">{n(c.votos, locale)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---- O PLANO ---- */}
      <section className="mt-8">
        <h2 className="t-heading flex items-center text-[22px]">
          {t.comoGanhar.planTitle} — {plano.passos.length}
          <IfetInfo />
        </h2>
        <p className="font-ui mt-1 text-caption text-pebble">{t.comoGanhar.planSub}</p>
        <ol className="mt-5 space-y-3">
          {plano.passos.map((p, i) => {
            const Icon = EIXO_ICON[p.eixo];
            return (
              <li key={p.ordem} className="card">
                <div className="flex items-start gap-4">
                  <span
                    className="font-ui mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-body text-white"
                    style={{ background: catVar(i) }}
                  >
                    {p.ordem}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon size={15} className="text-fossil" />
                      <span className="t-eyebrow">{eixoLabel[p.eixo]}</span>
                      {p.ganho && (
                        <span
                          className="font-ui rounded-[3px] px-1.5 py-0.5 text-[11px] text-white"
                          style={{ background: urgVar("low") }}
                        >
                          {p.ganho}
                        </span>
                      )}
                    </div>
                    <p className="font-ui mt-1.5 text-body text-ink">{p.titulo}</p>
                    <p className="mt-1 text-body-sm text-fossil">{p.detalhe}</p>
                    {p.alvos.length > 0 && (
                      <ul className="font-ui mt-3 flex flex-wrap gap-1.5">
                        {p.alvos.map((a) => (
                          <li
                            key={a.nome}
                            className="rounded-[4px] bg-sand px-2 py-1 text-[12px] text-smoke"
                          >
                            {a.nome}
                            {a.valor && <span className="text-pebble"> · {a.valor}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={p.href}
                      className="nav-link mt-3 inline-flex items-center gap-1 text-[13px]"
                    >
                      {t.comoGanhar.openModule} <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="font-ui mt-8 border-t border-ash pt-4 text-caption text-pebble">
        {t.comoGanhar.disclaimer} · {plano.version} · {plano.fontes.join(" · ")}
      </p>
    </>
  );
}
