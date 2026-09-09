import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/nav/LocaleSwitcher";
import { ThemeToggle } from "@/components/nav/ThemeToggle";
import { MobileNav } from "@/components/nav/MobileNav";
import { getDictionary } from "@/lib/i18n";

export async function SiteHeader() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";

  const items = [
    { href: "/#ferramentas", label: t.nav.tools },
    { href: "/planos", label: t.nav.pricing },
    { href: "/fontes", label: t.common.dataSources },
    { href: "/etica", label: t.nav.ethics },
    { href: "/#faq", label: "FAQ" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-5 sm:px-10 lg:px-20">
        <div className="flex items-center gap-10">
          <Logo height={22} />
          <nav className="hidden items-center gap-7 lg:flex">
            {items.map((it) => (
              <Link key={it.href} href={it.href} className="nav-link">
                {it.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label={pt ? "Buscar" : "Search"}
            className="hidden rounded-none p-1.5 text-muted transition-colors hover:text-ink sm:block"
          >
            <Search size={17} />
          </button>
          <ThemeToggle />
          <LocaleSwitcher current={locale} />
          <Link href="/entrar" className="nav-link ml-1 hidden sm:inline">
            {t.common.enter}
          </Link>
          <div className="hidden sm:block">
            <Link href="/onboarding" className="btn btn-dark whitespace-nowrap">
              {t.common.requestDemo}
            </Link>
          </div>
          <MobileNav
            items={items}
            ctaLabel={t.common.requestDemo}
            ctaHref="/onboarding"
            enterLabel={t.common.enter}
          />
        </div>
      </div>
    </header>
  );
}
