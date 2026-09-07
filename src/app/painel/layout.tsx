import Link from "next/link";
import { Sidebar } from "@/components/app/Sidebar";
import { LocaleSwitcher } from "@/components/nav/LocaleSwitcher";
import { getDictionary } from "@/lib/i18n";
import { buildToolNames } from "@/lib/tools";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, t } = await getDictionary();
  const toolNames = buildToolNames(t);

  return (
    <div className="flex min-h-dvh">
      <div className="hidden lg:block">
        <Sidebar
          labels={{ dashboard: t.common.dashboard, tools: t.nav.tools }}
          toolNames={toolNames}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ash bg-bone/85 px-5 backdrop-blur">
          <Link href="/" className="nav-link text-body-sm">
            ← {t.common.backToSite}
          </Link>
          <div className="flex items-center gap-4">
            <LocaleSwitcher current={locale} />
            <span className="font-ui rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
              {locale === "pt" ? "Ambiente de fundação" : "Foundation environment"}
            </span>
          </div>
        </header>
        <main className="flex-1 px-5 py-8 lg:px-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
