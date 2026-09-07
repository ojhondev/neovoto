import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { getDictionary } from "@/lib/i18n";
import { DATA_SOURCES } from "@/lib/data-sources/catalog";

export const metadata: Metadata = { title: "Fontes de dados" };

const statusLabel: Record<string, { pt: string; en: string }> = {
  planejado: { pt: "Planejado", en: "Planned" },
  prototipado: { pt: "Prototipado", en: "Prototyped" },
  conectado: { pt: "Conectado", en: "Connected" },
};

export default async function SourcesPage() {
  const { locale, t } = await getDictionary();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[var(--page-max)] px-5 py-20">
        <p className="t-eyebrow mb-4">{t.common.dataSources}</p>
        <h1 className="t-heading-lg max-w-2xl">
          {locale === "pt"
            ? "Somente dados abertos oficiais. Cada número é rastreável."
            : "Official open data only. Every figure is traceable."}
        </h1>
        <p className="mt-5 max-w-2xl text-body text-fossil">
          {locale === "pt"
            ? "A NeoVoto não coleta dados de pessoas naturais nem compra bases de terceiros. Todo o pipeline parte de APIs e conjuntos publicados por órgãos públicos sob a Lei de Acesso à Informação."
            : "NeoVoto collects no data on private individuals and buys no third-party databases. The whole pipeline starts from APIs and datasets published by public bodies under the freedom-of-information law."}
        </p>

        <div className="mt-12 space-y-4">
          {DATA_SOURCES.map((s) => (
            <div key={s.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="t-heading">{s.name}</h2>
                  <p className="font-ui mt-1 text-body-sm text-fossil">{s.org}</p>
                </div>
                <span className="font-ui rounded-[4px] border border-ash bg-bone px-2 py-1 text-caption uppercase tracking-wider text-smoke">
                  {statusLabel[s.status][locale]}
                </span>
              </div>
              <dl className="font-ui mt-4 grid gap-x-8 gap-y-2 text-body-sm sm:grid-cols-2">
                <div>
                  <dt className="text-pebble">Base</dt>
                  <dd className="break-all text-smoke">{s.base}</dd>
                </div>
                <div>
                  <dt className="text-pebble">{locale === "pt" ? "Acesso" : "Access"}</dt>
                  <dd className="text-smoke">{s.access}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-pebble">{locale === "pt" ? "Licença" : "Licence"}</dt>
                  <dd className="text-smoke">{s.license}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <p className="font-ui text-caption uppercase tracking-wider text-pebble">
                  {locale === "pt" ? "Feeds usados" : "Feeds used"}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {s.feeds.map((f) => (
                    <li
                      key={f}
                      className="font-ui rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <Link href="/" className="btn btn-ghost mt-12">
          {t.common.backToSite}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
