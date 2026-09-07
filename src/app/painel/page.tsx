import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { TOOLS, toolPath } from "@/lib/tools";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelHome() {
  const { locale, t } = await getDictionary();
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  if (!candidacy || !perfil) {
    return (
      <>
        <p className="t-eyebrow mb-3">{t.common.appName}</p>
        <h1 className="t-heading-lg">{t.dash.emptyTitle}</h1>
        <p className="mt-3 max-w-xl text-body text-fossil">{t.dash.emptyBody}</p>
        <Link href="/onboarding" className="btn btn-primary mt-6">
          {t.dash.emptyCta} <ArrowRight size={16} />
        </Link>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-card-lg)] border border-ash bg-ash sm:grid-cols-2">
          {TOOLS.map((tool) => {
            const meta = t.tools[tool.key];
            const Icon = tool.icon;
            return (
              <Link key={tool.id} href={toolPath(tool.id)} className="flex flex-col bg-paper p-6 hover:bg-bone">
                <Icon size={20} strokeWidth={1.5} className="text-ink" />
                <h2 className="t-heading mt-3 text-[22px]">{meta.name}</h2>
                <p className="mt-2 text-body-sm text-fossil">{meta.short}</p>
              </Link>
            );
          })}
        </div>
      </>
    );
  }

  const objectiveLabel =
    t.onboarding.objectives.find((o) => o.value === candidacy.objective)?.label ??
    candidacy.objective;
  const props = perfil.proposicoes;
  const maxTipo = props?.tipos[0]?.count ?? 1;

  return (
    <>
      {/* Cabeçalho da candidatura — dados reais */}
      <div className="flex flex-wrap items-start gap-5">
        {perfil.foto && (
          <Image
            src={perfil.foto}
            alt={perfil.nome}
            width={72}
            height={96}
            unoptimized
            className="h-24 w-[72px] shrink-0 rounded-[8px] border border-ash object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="t-eyebrow mb-1">{perfil.casa}</p>
          <h1 className="t-heading-lg">{perfil.nome}</h1>
          <p className="font-ui mt-1 text-body-sm text-fossil">
            {perfil.partido}
            {perfil.uf ? `-${perfil.uf}` : ""}
            {perfil.territorio ? ` · ${perfil.territorio.ufNome}` : ""}
          </p>
          <p className="font-ui mt-2 inline-flex items-center gap-2 rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
            {t.dash.objectiveLabel}: {objectiveLabel}
          </p>
        </div>
        <Link href="/painel/candidato" className="nav-link shrink-0 text-body-sm">
          {t.dash.changeCandidate}
        </Link>
      </div>

      {/* Widgets de dados reais */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="t-heading text-[22px]">{t.dash.profile}</h2>
          <dl className="font-ui mt-3 space-y-1.5 text-body-sm">
            {perfil.situacao && (
              <div className="flex justify-between gap-4">
                <dt className="text-pebble">{t.dash.situation}</dt>
                <dd className="text-smoke">{perfil.situacao}</dd>
              </div>
            )}
            {perfil.escolaridade && (
              <div className="flex justify-between gap-4">
                <dt className="text-pebble">{t.dash.education}</dt>
                <dd className="text-right text-smoke">{perfil.escolaridade}</dd>
              </div>
            )}
            {perfil.nascimento && (
              <div className="flex justify-between gap-4">
                <dt className="text-pebble">{t.dash.born}</dt>
                <dd className="text-smoke">{perfil.nascimento}</dd>
              </div>
            )}
            {perfil.email && (
              <div className="flex justify-between gap-4">
                <dt className="text-pebble">E-mail</dt>
                <dd className="truncate text-smoke">{perfil.email}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="card">
          <h2 className="t-heading text-[22px]">{t.dash.territory}</h2>
          {perfil.territorio ? (
            <div className="mt-3">
              <p className="font-ui text-[28px] font-light text-ink">
                {perfil.territorio.municipios}
              </p>
              <p className="font-ui text-body-sm text-fossil">
                {t.dash.municipalities} — {perfil.territorio.ufNome} ({t.dash.region}{" "}
                {perfil.territorio.regiao})
              </p>
              <Link
                href={toolPath("mapa-de-calor")}
                className="nav-link mt-4 inline-flex items-center gap-1.5 text-[13px]"
              >
                {t.dash.openTool} <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-body-sm text-fossil">—</p>
          )}
        </section>

        {props && (
          <section className="card md:col-span-2">
            <div className="flex items-baseline justify-between">
              <h2 className="t-heading text-[22px]">{t.dash.legislative}</h2>
              <p className="font-ui text-body-sm text-fossil">
                {props.total} {t.dash.propositions} · {props.comEmenta} {t.dash.withSummary}
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {props.tipos.slice(0, 6).map((tp) => (
                <div key={tp.label} className="font-ui flex items-center gap-3 text-body-sm">
                  <span className="w-40 shrink-0 truncate text-smoke">{tp.label}</span>
                  <span className="h-3 flex-1 rounded-[3px] bg-sand">
                    <span
                      className="block h-full rounded-[3px] bg-olive"
                      style={{ width: `${Math.max(6, (tp.count / maxTipo) * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-fossil">{tp.count}</span>
                </div>
              ))}
            </div>
            {props.recentes.length > 0 && (
              <div className="mt-5">
                <p className="font-ui text-caption uppercase tracking-wider text-pebble">
                  {t.dash.recent}
                </p>
                <ul className="mt-2 space-y-2">
                  {props.recentes.slice(0, 3).map((r) => (
                    <li key={r.titulo} className="font-ui text-body-sm">
                      <span className="text-ink">{r.titulo}</span>{" "}
                      <span className="text-fossil">— {r.ementa.slice(0, 130)}…</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link
              href={toolPath("mapa-de-propostas")}
              className="nav-link mt-5 inline-flex items-center gap-1.5 text-[13px]"
            >
              {t.dash.openTool} <ArrowRight size={13} />
            </Link>
          </section>
        )}

        {perfil.frentes.length > 0 && (
          <section className="card md:col-span-2">
            <div className="flex items-baseline justify-between">
              <h2 className="t-heading text-[22px]">{t.dash.fronts}</h2>
              <p className="font-ui text-body-sm text-fossil">{perfil.frentes.length}</p>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {perfil.frentes.slice(0, 12).map((f) => (
                <li
                  key={f.id}
                  className="font-ui rounded-[4px] bg-sand px-2.5 py-1 text-caption text-smoke"
                >
                  {f.titulo}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Ferramentas */}
      <h2 className="t-heading mt-12">
        {t.dash.toolsForCandidate.replace("{name}", perfil.nome)}
      </h2>
      <div className="mt-5 grid gap-px overflow-hidden rounded-[var(--radius-card-lg)] border border-ash bg-ash sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const meta = t.tools[tool.key];
          const Icon = tool.icon;
          return (
            <Link key={tool.id} href={toolPath(tool.id)} className="flex flex-col bg-paper p-5 hover:bg-bone">
              <Icon size={18} strokeWidth={1.5} className="text-ink" />
              <h3 className="t-heading mt-3 text-[19px]">{meta.name}</h3>
              <p className="mt-1.5 text-body-sm text-fossil">{meta.short}</p>
            </Link>
          );
        })}
      </div>

      <p className="font-ui mt-8 flex items-center gap-1.5 text-caption text-pebble">
        <ExternalLink size={12} />
        {t.dash.refreshedAt} {new Date(candidacy.refreshedAt).toLocaleDateString(locale)} ·{" "}
        {t.dash.sourcesNote}
      </p>
    </>
  );
}
