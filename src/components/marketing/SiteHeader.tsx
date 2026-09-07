import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/nav/LocaleSwitcher";
import { getDictionary } from "@/lib/i18n";

export async function SiteHeader() {
  const { locale, t } = await getDictionary();
  return (
    <header className="sticky top-0 z-40 border-b border-ash bg-bone/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[var(--page-max)] items-center justify-between gap-6 px-5">
        <div className="shrink-0">
          <Logo />
        </div>
        <nav className="hidden items-center gap-6 lg:flex">
          <Link href="/#ferramentas" className="nav-link">
            {t.nav.tools}
          </Link>
          <Link href="/#metodo" className="nav-link">
            {t.nav.method}
          </Link>
          <Link href="/etica" className="nav-link">
            {t.nav.ethics}
          </Link>
          <Link href="/fontes" className="nav-link">
            {t.common.dataSources}
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <LocaleSwitcher current={locale} />
          <Link href="/entrar" className="nav-link hidden sm:inline">
            {t.common.enter}
          </Link>
          <div className="hidden sm:block">
            <Link href="/#demo" className="btn btn-primary whitespace-nowrap">
              {t.common.requestDemo}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
