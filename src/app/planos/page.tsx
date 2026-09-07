import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Planos" };

const FLUID = "w-full px-5 sm:px-10 lg:px-20";

export default async function PlanosPage() {
  const { t } = await getDictionary();
  const p = t.pricing;

  return (
    <>
      <SiteHeader />
      <main>
        <section className={`${FLUID} pt-16 pb-12`}>
          <p className="t-eyebrow mb-3">{p.kicker}</p>
          <h1 className="t-display max-w-3xl">{p.title}</h1>
          <p className="mt-5 max-w-xl text-body text-fossil">{p.sub}</p>
          <p className="font-ui mt-4 inline-block rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
            {p.mock}
          </p>
        </section>

        {/* Cartões de plano */}
        <section className={`${FLUID} pb-16`}>
          <div className="grid gap-px overflow-hidden rounded-[var(--radius-card-lg)] border border-ash bg-ash lg:grid-cols-4">
            {p.plans.map((plan, i) => {
              const paid = i > 0;
              const enterprise = i === p.plans.length - 1;
              return (
                <div key={plan.name} className="relative flex flex-col bg-paper p-6">
                  {i === 1 && (
                    <span className="font-ui absolute right-4 top-4 rounded-[4px] bg-chartreuse px-2 py-0.5 text-[11px] text-ink-accent">
                      {p.mostPopular}
                    </span>
                  )}
                  <h2 className="t-heading text-[24px]">{plan.name}</h2>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-display text-[34px] font-light text-ink">
                      {plan.price}
                    </span>
                    {paid && !enterprise && (
                      <span className="font-ui text-body-sm text-fossil">{p.perMonth}</span>
                    )}
                  </div>
                  <p className="mt-3 text-body-sm text-fossil">{plan.for}</p>

                  <Link
                    href="/#demo"
                    className={
                      "mt-5 " + (i === 0 ? "btn btn-ghost" : "btn btn-primary") + " justify-center"
                    }
                  >
                    {i === 0 ? p.ctaFree : enterprise ? p.ctaEnterprise : p.ctaPaid}
                  </Link>

                  <ul className="font-ui mt-6 space-y-2 text-body-sm">
                    {plan.includes.map((inc) => (
                      <li key={inc} className="flex gap-2 text-smoke">
                        <Check size={15} className="mt-0.5 shrink-0 text-olive" />
                        {inc}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tabela de comparação */}
        <section className="border-y border-ash bg-bone">
          <div className={`${FLUID} py-16`}>
            <h2 className="t-heading-lg">{p.compareTitle}</h2>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="font-ui border-b border-ash text-body-sm">
                    <th className="py-3 pr-4 font-medium text-fossil"></th>
                    {p.plans.map((pl) => (
                      <th key={pl.name} className="py-3 pr-4 font-medium text-ink">
                        {pl.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-ui text-body-sm">
                  {p.compareRows.map((row) => (
                    <tr key={row.feature} className="border-b border-ash">
                      <td className="py-2.5 pr-4 text-smoke">{row.feature}</td>
                      {row.vals.map((v, k) => (
                        <td key={k} className="py-2.5 pr-4">
                          {v === "sim" || v === "yes" ? (
                            <Check size={15} className="text-olive" />
                          ) : (
                            <span className="text-fossil">{v}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={`${FLUID} py-24 text-center`}>
          <h2 className="t-display mx-auto max-w-2xl">{t.landing.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-md text-body text-fossil">{t.landing.ctaBody}</p>
          <Link href="/onboarding" className="btn btn-primary mt-8">
            {t.landing.heroPrimary} <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <SiteFooter fluid={FLUID} />
    </>
  );
}
