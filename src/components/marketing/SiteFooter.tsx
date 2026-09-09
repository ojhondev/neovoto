import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import logoDark from "../../../public/brand/logo-dark.png";
import { getDictionary } from "@/lib/i18n";

export async function SiteFooter({ fluid = "w-full px-5 sm:px-10 lg:px-20" }: { fluid?: string }) {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const year = new Date().getFullYear();

  const columns: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: pt ? "Plataforma" : "Platform",
      links: [
        { label: t.nav.tools, href: "/#ferramentas" },
        { label: t.nav.pricing, href: "/planos" },
        { label: "FAQ", href: "/#faq" },
        { label: pt ? "Solicitar demonstração" : "Request demo", href: "/onboarding" },
      ],
    },
    {
      title: pt ? "Recursos" : "Resources",
      links: [
        { label: t.footer.sourcesLink, href: "/fontes" },
        { label: t.footer.ethicsLink, href: "/etica" },
        { label: pt ? "Metodologia" : "Methodology", href: "/etica" },
      ],
    },
    {
      title: pt ? "Conta" : "Account",
      links: [
        { label: t.common.enter, href: "/entrar" },
        { label: pt ? "Criar conta" : "Create account", href: "/criar-conta" },
        { label: pt ? "Painel" : "Dashboard", href: "/painel" },
      ],
    },
  ];

  return (
    <footer className="bg-charcoal text-white">
      <div className={`${fluid} py-16`}>
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* brand column */}
          <div className="max-w-sm">
            <Image
              src={logoDark}
              alt="NeoVoto"
              height={24}
              width={Math.round((logoDark.width / logoDark.height) * 24)}
            />
            <p className="mt-5 text-body-sm leading-relaxed text-white/55">
              {pt
                ? "Inteligência eleitoral a partir de dados abertos oficiais. Território, posicionamento e coligações — do primeiro turno ao Planalto, dentro da LGPD."
                : "Electoral intelligence from official open data. Territory, positioning and coalitions — from the first round to the presidency, LGPD-compliant."}
            </p>
            <Link
              href="/onboarding"
              className="mt-6 inline-flex items-center gap-2 border-b border-white/30 pb-1 text-body-sm font-medium text-white transition-colors hover:border-brand hover:text-brand"
            >
              {pt ? "Solicitar demonstração" : "Request a demo"} <ArrowRight size={14} />
            </Link>
          </div>

          {/* link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/40">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label + l.href}>
                      <Link
                        href={l.href}
                        className="text-body-sm text-white/65 transition-colors hover:text-white"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/12 pt-6 text-caption text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} NeoVoto. {t.footer.rights}
          </p>
          <p className="max-w-lg sm:text-right">
            {pt
              ? "Somente dados abertos oficiais (TSE · IBGE · Câmara · Senado). Leitura interna — não é pesquisa eleitoral (Lei 9.504/1997)."
              : "Official open data only (TSE · IBGE · Chamber · Senate). Internal reading — not an electoral poll."}
          </p>
        </div>
      </div>
    </footer>
  );
}
