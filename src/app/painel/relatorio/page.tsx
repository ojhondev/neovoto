import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, X, FileText } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy } from "@/lib/candidacy";
import { listInsights } from "@/lib/report";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { unclipAction, clearAction, gerarAction } from "./actions";

export const metadata: Metadata = { title: "Relatório" };

export default async function Page({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { locale, t } = await getDictionary();
  const { erro } = await searchParams;
  const candidacy = await getCurrentCandidacy();

  if (!candidacy) {
    return (
      <>
        <p className="t-eyebrow mb-2">{t.motor.name}</p>
        <h1 className="t-heading-lg">{t.relatorio.title}</h1>
        <p className="mt-3 max-w-xl text-body text-fossil">{t.dash.emptyBody}</p>
        <Link href="/onboarding" className="btn btn-primary mt-6">
          {t.dash.emptyCta} <ArrowRight size={16} />
        </Link>
      </>
    );
  }

  const [itens, gerados] = await Promise.all([
    listInsights(candidacy.id).catch(() => []),
    db.select().from(reports).where(eq(reports.candidacyId, candidacy.id)).orderBy(desc(reports.generatedAt)).limit(8),
  ]);

  return (
    <>
      <p className="t-eyebrow mb-2">{t.motor.name}</p>
      <h1 className="t-heading-lg">{t.relatorio.title}</h1>
      <p className="mt-3 max-w-2xl text-body text-fossil">{t.relatorio.intro}</p>
      {erro && <p className="font-ui mt-3 text-caption text-urg-crit">{t.relatorio.genError}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form action={gerarAction}>
          <button type="submit" className="btn btn-primary">
            <FileText size={16} /> {t.relatorio.generate}
          </button>
        </form>
        {itens.length > 0 && (
          <form action={clearAction}>
            <button type="submit" className="nav-link text-caption">
              {t.relatorio.clear}
            </button>
          </form>
        )}
      </div>

      {/* recortes */}
      <section className="mt-8">
        <h2 className="t-heading">
          {t.relatorio.clipsTitle} {itens.length > 0 && <span className="text-fossil">· {itens.length}</span>}
        </h2>
        {itens.length === 0 ? (
          <p className="font-ui mt-3 max-w-lg text-body-sm text-pebble">{t.relatorio.noClips}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {itens.map((i) => (
              <li key={i.id} className="card flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-ui text-caption uppercase tracking-wider text-pebble">{i.modulo}</p>
                  <p className="font-ui mt-1 text-body text-ink">{i.titulo}</p>
                  <p className="mt-1 text-body-sm text-fossil">{i.texto}</p>
                </div>
                <form action={unclipAction}>
                  <input type="hidden" name="id" value={i.id} />
                  <button type="submit" aria-label="remover" className="p-1 text-pebble hover:text-ink">
                    <X size={15} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {gerados.length > 0 && (
        <section className="mt-8">
          <h2 className="t-heading">{t.relatorio.lastReports}</h2>
          <ul className="font-ui mt-3 divide-y divide-ash text-body-sm">
            {gerados.map((r) => (
              <li key={r.code} className="flex items-center justify-between py-2.5">
                <span className="text-smoke">
                  {r.code} · {new Date(r.generatedAt).toLocaleString(locale)}
                </span>
                <Link href={`/painel/relatorio/${r.code}`} className="nav-link text-[13px]">
                  {t.relatorio.open} <ArrowRight size={13} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
