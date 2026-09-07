import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Ética & LGPD" };

export default async function EthicsPage() {
  const { t } = await getDictionary();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-20">
        <p className="t-eyebrow mb-4">{t.nav.ethics}</p>
        <h1 className="t-heading-lg">{t.ethics.title}</h1>
        <p className="mt-6 text-body text-fossil">{t.ethics.intro}</p>

        <h2 className="t-heading mt-16">{t.ethics.caseTitle}</h2>
        <ul className="mt-5 space-y-3">
          {t.ethics.casePoints.map((p) => (
            <li key={p} className="border-b border-ash pb-3 text-body-sm text-smoke">
              {p}
            </li>
          ))}
        </ul>

        <h2 className="t-heading mt-16">{t.ethics.answerTitle}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {t.ethics.answer.map((a) => (
            <div key={a.problem} className="card">
              <p className="font-ui text-caption uppercase tracking-wider text-fossil">
                {a.problem}
              </p>
              <p className="mt-2 text-body-sm">{a.solution}</p>
            </div>
          ))}
        </div>

        <h2 className="t-heading mt-16">{t.ethics.lgpdTitle}</h2>
        <ul className="mt-5 space-y-3">
          {t.ethics.lgpdPoints.map((p) => (
            <li key={p} className="flex gap-3 text-body-sm">
              <span className="mark h-fit font-ui text-[11px]">LGPD</span>
              <span className="text-smoke">{p}</span>
            </li>
          ))}
        </ul>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link href="/fontes" className="btn btn-ghost">
            {t.common.dataSources}
          </Link>
          <Link href="/" className="btn btn-ghost">
            {t.common.backToSite}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
