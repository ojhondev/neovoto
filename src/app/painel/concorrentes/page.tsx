import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { db } from "@/db";
import { candidacies } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getCurrentCandidacy, getCompareIds } from "@/lib/candidacy";
import { compararCandidatos, type EixoRadar } from "@/lib/intel/comparar";
import { ConcorrenteBusca } from "@/components/app/ConcorrenteBusca";
import { CompareRadar } from "@/components/app/CompareRadar";
import { CompareScatter } from "@/components/app/CompareScatter";
import { ClipButton } from "@/components/app/ClipButton";
import type { CandidatoComparado } from "@/lib/intel/comparar";
import { removerConcorrenteAction, limparConcorrentesAction } from "./actions";

export const metadata: Metadata = { title: "Concorrentes" };

function num(v: number, locale: string) {
  return Math.round(v).toLocaleString(locale);
}

/** interpretação data-driven da comparação (você = candidatos[0]) */
function interpretarComparacao(cs: CandidatoComparado[], pt: boolean, locale: string): string {
  const you = cs[0];
  const others = cs.slice(1);
  const partes: string[] = [];
  const maisVoto = [...cs].sort((a, b) => b.votos - a.votos)[0];
  if (maisVoto.id === you.id) {
    partes.push(
      pt
        ? `${you.nome} lidera em votos (${num(you.votos, locale)}).`
        : `${you.nome} leads in votes (${num(you.votos, locale)}).`,
    );
  } else if (you.temVoto) {
    partes.push(
      pt
        ? `${maisVoto.nome} tem mais votos (${num(maisVoto.votos, locale)}) que ${you.nome} (${num(you.votos, locale)}) — diferença de ${num(maisVoto.votos - you.votos, locale)}.`
        : `${maisVoto.nome} has more votes (${num(maisVoto.votos, locale)}) than ${you.nome} (${num(you.votos, locale)}).`,
    );
  }
  const maisEspalhado = [...cs].sort((a, b) => b.municipios - a.municipios)[0];
  const maisConcentrado = [...cs].filter((c) => c.temVoto).sort((a, b) => b.concentracaoTop5 - a.concentracaoTop5)[0];
  if (maisConcentrado && maisConcentrado.id !== you.id && you.temVoto) {
    partes.push(
      pt
        ? `${maisConcentrado.nome} concentra ${Math.round(maisConcentrado.concentracaoTop5 * 100)}% do voto em 5 cidades — base geograficamente frágil, mais fácil de atacar. Sua base é ${you.concentracaoTop5 < maisConcentrado.concentracaoTop5 ? "mais distribuída" : "também concentrada"}.`
        : `${maisConcentrado.nome} concentrates ${Math.round(maisConcentrado.concentracaoTop5 * 100)}% of the vote in 5 cities — geographically fragile.`,
    );
  }
  void maisEspalhado;
  for (const o of others) {
    const d = Math.hypot(o.eco - you.eco, o.soc - you.soc);
    if (d >= 1.0) {
      partes.push(
        pt
          ? `${o.nome} está num campo ideológico oposto ao seu — a disputa com ${o.nome} é por polarização, não por sobreposição de base.`
          : `${o.nome} is in an opposite ideological field — the contest is by polarisation.`,
      );
    } else if (d <= 0.4) {
      partes.push(
        pt
          ? `${o.nome} disputa exatamente o seu eleitorado (mesmo campo). Diferenciação é por entrega e presença, não por discurso.`
          : `${o.nome} competes for exactly your electorate. Differentiate by delivery and presence.`,
      );
    }
  }
  return partes.join(" ");
}

export default async function Page() {
  const { locale, t } = await getDictionary();
  const primary = await getCurrentCandidacy();
  const compareIds = await getCompareIds();

  if (!primary) {
    return (
      <>
        <p className="t-eyebrow mb-3">{t.motor.name}</p>
        <h1 className="t-heading-lg">{t.concorrentes.title}</h1>
        <p className="mt-3 max-w-xl text-body text-fossil">{t.dash.emptyBody}</p>
        <Link href="/onboarding" className="btn btn-primary mt-6">
          {t.dash.emptyCta} <ArrowRight size={16} />
        </Link>
      </>
    );
  }

  const extras = compareIds.length
    ? await db.select().from(candidacies).where(inArray(candidacies.id, compareIds))
    : [];
  const ordered = [primary, ...compareIds.map((id) => extras.find((e) => e.id === id)).filter(Boolean)] as typeof extras;
  const arenaFull = ordered.length >= 4;

  const cmp = ordered.length >= 2 ? await compararCandidatos(ordered) : null;

  const eixoLabel: Record<EixoRadar, string> = {
    votos: t.concorrentes.eixoVotos,
    alcance: t.concorrentes.eixoAlcance,
    concentracao: t.concorrentes.eixoConcentracao,
    penetracao: t.concorrentes.eixoPenetracao,
    legislativo: t.concorrentes.eixoLegislativo,
  };

  return (
    <>
      <p className="t-eyebrow mb-2">{t.motor.name}</p>
      <h1 className="t-heading-lg">{t.concorrentes.title}</h1>
      <p className="mt-3 max-w-2xl text-body text-fossil">{t.concorrentes.intro}</p>

      {/* arena */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-2 sm:grid-cols-2">
          {ordered.map((c, i) => (
            <div
              key={c.id}
              className="card flex items-center justify-between gap-3"
              style={{ borderLeft: `3px solid ${["var(--color-cmp-self)", "var(--color-cmp-other)", "var(--color-cmp-third)", "var(--color-cat-4)"][i % 4]}` }}
            >
              <div className="min-w-0">
                <p className="font-ui truncate text-body text-ink">{c.name}</p>
                <p className="font-ui truncate text-caption text-pebble">
                  {c.party}
                  {c.uf ? `-${c.uf}` : ""}
                  {i === 0 ? ` · ${t.concorrentes.yourCandidate}` : ""}
                </p>
              </div>
              {i > 0 && (
                <form action={removerConcorrenteAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" aria-label={t.concorrentes.remove} className="p-1 text-pebble hover:text-ink">
                    <X size={15} />
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <p className="t-eyebrow mb-2">{t.concorrentes.addTitle}</p>
          {arenaFull ? (
            <p className="font-ui text-caption text-pebble">{t.concorrentes.full}</p>
          ) : (
            <ConcorrenteBusca
              full
              labels={{
                placeholder: t.concorrentes.placeholder,
                searching: "…",
                allOffices: t.concorrentes.allOffices,
                empty: t.concorrentes.empty,
                add: t.concorrentes.add,
              }}
            />
          )}
          {compareIds.length > 0 && (
            <form action={limparConcorrentesAction} className="mt-3">
              <button type="submit" className="nav-link text-caption">
                {t.concorrentes.clear}
              </button>
            </form>
          )}
        </div>
      </div>

      {!cmp ? (
        <p className="font-ui mt-8 text-body-sm text-pebble">{t.concorrentes.needMore}</p>
      ) : (
        <>
          {/* leitura */}
          {(() => {
            const leitura = interpretarComparacao(cmp.candidatos, locale === "pt", locale);
            return leitura ? (
              <div className="mt-8 rounded-[var(--radius-card)] border-l-2 border-l-brand bg-paper p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="t-eyebrow mb-1">{locale === "pt" ? "O que a comparação diz" : "What the comparison says"}</p>
                  <ClipButton
                    item={{
                      modulo: t.concorrentes.title,
                      titulo: locale === "pt" ? "Comparação com concorrentes" : "Competitor comparison",
                      texto: leitura,
                    }}
                  />
                </div>
                <p className="text-body-sm text-ink">{leitura}</p>
              </div>
            ) : null;
          })()}

          {/* radar */}
          <section className="card mt-6">
            <h2 className="t-heading">{t.concorrentes.radarTitle}</h2>
            <div className="mt-4">
              <CompareRadar
                candidatos={cmp.candidatos}
                eixos={cmp.eixos}
                eixoLabel={eixoLabel}
                nota={t.concorrentes.radarNote}
              />
            </div>
          </section>

          {/* scatter */}
          <section className="card mt-6">
            <h2 className="t-heading">{t.concorrentes.scatterTitle}</h2>
            <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-ash bg-map-bg p-2">
              <CompareScatter
                candidatos={cmp.candidatos}
                labels={{
                  x: t.concorrentes.scatterX,
                  y: t.concorrentes.scatterY,
                  left: t.concorrentes.scatterLeft,
                  right: t.concorrentes.scatterRight,
                }}
              />
            </div>
          </section>

          {/* tabela */}
          <section className="card mt-6 overflow-x-auto">
            <h2 className="t-heading">{t.concorrentes.tableTitle}</h2>
            <table className="mt-4 w-full min-w-[640px] text-left text-body-sm">
              <thead>
                <tr className="font-ui text-caption uppercase tracking-wider text-pebble">
                  <th className="pb-2 pr-3 font-normal">{t.concorrentes.colCand}</th>
                  <th className="pb-2 pr-3 text-right font-normal">{t.concorrentes.colVotos}</th>
                  <th className="pb-2 pr-3 text-right font-normal">{t.concorrentes.colMunicipios}</th>
                  <th className="pb-2 pr-3 text-right font-normal">{t.concorrentes.colConc}</th>
                  <th className="pb-2 pr-3 text-right font-normal">{t.concorrentes.colPen}</th>
                  <th className="pb-2 pr-3 text-right font-normal">{t.concorrentes.colProp}</th>
                  <th className="pb-2 text-right font-normal">{t.concorrentes.colEixo}</th>
                </tr>
              </thead>
              <tbody className="font-ui divide-y divide-ash">
                {cmp.candidatos.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.cor }} />
                        <span className="text-ink">{c.nome}</span>
                        <span className="text-pebble">
                          {c.partido}-{c.uf}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-smoke">
                      {c.temVoto ? num(c.votos, locale) : t.concorrentes.noVote}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-fossil">{c.municipios || "—"}</td>
                    <td className="py-2.5 pr-3 text-right text-fossil">
                      {c.temVoto ? `${Math.round(c.concentracaoTop5 * 100)}%` : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-fossil">
                      {c.temVoto ? c.penetracao.toFixed(3) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-fossil">{c.proposicoes || "—"}</td>
                    <td className="py-2.5 text-right text-fossil">
                      {c.eco.toFixed(1)} / {c.soc.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="font-ui mt-6 border-t border-ash pt-4 text-caption text-pebble">
            {t.concorrentes.disclaimer} · {cmp.version} · {cmp.fontes.join(" · ")}
          </p>
        </>
      )}
    </>
  );
}
