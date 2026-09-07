import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/nav/LocaleSwitcher";
import { ThemeToggle } from "@/components/nav/ThemeToggle";
import { MobileNav } from "@/components/nav/MobileNav";
import { getDictionary } from "@/lib/i18n";

export async function SiteHeader() {
  const { locale, t } = await getDictionary();

  const items = [
    { href: "/#ferramentas", label: t.nav.tools },
    { href: "/planos", label: t.nav.pricing },
    { href: "/#faq", label: "FAQ" },
    { href: "/etica", label: t.nav.ethics },
    { href: "/fontes", label: t.common.dataSources },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ash bg-bone/85 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-5 sm:px-10 lg:px-20">
        <div className="shrink-0">
          <Logo height={24} />
        </div>

        <nav className="hidden items-center gap-6 lg:flex">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="nav-link">
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher current={locale} />
          <Link href="/entrar" className="nav-link ml-1 hidden sm:inline">
            {t.common.enter}
          </Link>
          <div className="hidden sm:block">
            <Link href="/onboarding" className="btn btn-primary whitespace-nowrap">
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
