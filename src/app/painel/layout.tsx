import Link from "next/link";
import { Sidebar } from "@/components/app/Sidebar";
import { LocaleSwitcher } from "@/components/nav/LocaleSwitcher";
import { ThemeToggle } from "@/components/nav/ThemeToggle";
import { getDictionary } from "@/lib/i18n";
import { buildToolNames } from "@/lib/tools";
import { getCurrentCandidacyId } from "@/lib/candidacy";
import { countInsights } from "@/lib/report";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, t } = await getDictionary();
  const toolNames = buildToolNames(t);
  const candId = await getCurrentCandidacyId();
  const relatorioCount = candId ? await countInsights(candId).catch(() => 0) : 0;

  return (
    <div className="flex min-h-svh">
      <Sidebar
        labels={{
          dashboard: t.common.dashboard,
          comoGanhar: t.comoGanhar.navLabel,
          concorrentes: t.concorrentes.navLabel,
          relatorio: t.relatorio.navLabel,
          partidos: t.partidos.navLabel,
          candidate: locale === "pt" ? "Candidato" : "Candidate",
          collapse: locale === "pt" ? "Recolher" : "Collapse",
          groupOverview: t.nav.groupOverview,
          groupTerritory: t.nav.groupTerritory,
          groupPositioning: t.nav.groupPositioning,
          groupProjection: t.nav.groupProjection,
        }}
        toolNames={toolNames}
        relatorioCount={relatorioCount}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-ash bg-bone/85 pl-16 pr-5 backdrop-blur lg:pl-5">
          <Link href="/" className="nav-link text-body-sm">
            ← {t.common.backToSite}
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LocaleSwitcher current={locale} />
            <span className="font-ui hidden rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke sm:inline">
              {locale === "pt" ? "Ambiente de fundação" : "Foundation environment"}
            </span>
          </div>
        </header>
        <main className="w-full flex-1 px-4 py-8 sm:px-6 lg:px-10 2xl:px-16">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
