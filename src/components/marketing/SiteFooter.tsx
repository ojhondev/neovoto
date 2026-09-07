import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { getDictionary } from "@/lib/i18n";

export async function SiteFooter() {
  const { t } = await getDictionary();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-ash bg-bone">
      <div className="mx-auto max-w-[var(--page-max)] px-5 py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="font-ui mt-4 text-body-sm text-fossil">
              {t.footer.builtWith}
            </p>
          </div>
          <div className="font-ui flex flex-wrap gap-x-12 gap-y-4 text-body-sm">
            <div className="flex flex-col gap-2">
              <span className="t-eyebrow">{t.nav.product}</span>
              <Link href="/#ferramentas" className="text-fossil hover:text-ink">
                {t.nav.tools}
              </Link>
              <Link href="/#metodo" className="text-fossil hover:text-ink">
                {t.nav.method}
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="t-eyebrow">{t.nav.ethics}</span>
              <Link href="/etica" className="text-fossil hover:text-ink">
                {t.footer.ethicsLink}
              </Link>
              <Link href="/fontes" className="text-fossil hover:text-ink">
                {t.footer.sourcesLink}
              </Link>
            </div>
          </div>
        </div>
        <hr className="hairline my-10" />
        <p className="font-ui text-caption text-pebble">
          © {year} NeoVoto. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
