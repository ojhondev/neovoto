import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/nav/LocaleSwitcher";
import { MockBanner } from "@/components/app/MockBanner";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage() {
  const { locale, t } = await getDictionary();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-5">
        <Logo />
        <LocaleSwitcher current={locale} />
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 pb-24">
        <h1 className="t-heading-lg">{t.auth.signInTitle}</h1>
        <MockBanner text={t.auth.authNotice} />
        <form className="font-ui space-y-4">
          <label className="block">
            <span className="text-body-sm text-smoke">{t.auth.email}</span>
            <input
              type="email"
              disabled
              className="mt-1 w-full rounded-[8px] border border-pebble bg-paper px-3 py-2 text-body-sm disabled:opacity-60"
            />
          </label>
          <label className="block">
            <span className="text-body-sm text-smoke">{t.auth.password}</span>
            <input
              type="password"
              disabled
              className="mt-1 w-full rounded-[8px] border border-pebble bg-paper px-3 py-2 text-body-sm disabled:opacity-60"
            />
          </label>
          <button type="button" disabled className="btn btn-primary w-full justify-center opacity-60">
            {t.auth.signInCta}
          </button>
        </form>
        <p className="font-ui mt-6 text-body-sm text-fossil">
          {t.auth.noAccount}{" "}
          <Link href="/criar-conta" className="nav-link">
            {t.auth.signUpCta}
          </Link>
        </p>
        <Link href="/painel" className="font-ui mt-3 text-body-sm nav-link">
          {locale === "pt" ? "Explorar o painel (fundação)" : "Explore the dashboard (foundation)"} →
        </Link>
      </main>
    </div>
  );
}
