import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell, GoogleButton } from "@/components/marketing/AuthShell";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  const { t } = await getDictionary();
  return (
    <AuthShell panelHeadline={t.auth.panelHeadline} panelSources={t.auth.panelSources}>
      <h1 className="t-heading-lg">{t.auth.signUpTitle}</h1>
      <p className="mt-3 text-body-sm text-fossil">{t.auth.signUpSub}</p>

      <form className="font-ui mt-8 space-y-4">
        <label className="block">
          <span className="text-body-sm text-smoke">{t.auth.workEmail} *</span>
          <input
            type="email"
            disabled
            className="mt-1.5 w-full rounded-none border border-pebble bg-paper px-3 py-2.5 text-body-sm disabled:opacity-60"
          />
        </label>
        <label className="block">
          <span className="text-body-sm text-smoke">{t.auth.password} *</span>
          <input
            type="password"
            disabled
            className="mt-1.5 w-full rounded-none border border-pebble bg-paper px-3 py-2.5 text-body-sm disabled:opacity-60"
          />
        </label>
        <label className="flex items-start gap-2 text-body-sm text-smoke">
          <input type="checkbox" defaultChecked disabled className="mt-0.5" />
          {t.auth.marketingOptIn}
        </label>
        <button
          type="button"
          disabled
          className="w-full rounded-none bg-sand px-4 py-2.5 text-body-sm text-fossil"
        >
          {t.auth.signUpCta}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="hairline flex-1" />
        <span className="font-ui text-caption text-pebble">{t.auth.or}</span>
        <span className="hairline flex-1" />
      </div>
      <GoogleButton label={t.auth.google} />

      <p className="font-ui mt-8 text-body-sm">
        <Link href="/entrar" className="nav-link">
          {t.auth.existingAccount}
        </Link>
      </p>
      <p className="font-ui mt-3 text-caption text-pebble">{t.auth.terms}</p>
      <Link href="/painel" className="font-ui nav-link mt-6 inline-block text-body-sm">
        {t.auth.authNotice}
      </Link>
    </AuthShell>
  );
}
