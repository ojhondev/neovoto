import Link from "next/link";
import { Bell, ArrowLeft } from "lucide-react";
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
    <div className="flex min-h-svh bg-canvas">
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
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/90 pl-16 pr-4 backdrop-blur sm:pr-6 lg:pl-6">
          <Link
            href="/"
            className="font-ui inline-flex items-center gap-1.5 text-body-sm text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            {t.common.backToSite}
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <span className="pill pill-neutral hidden sm:inline-flex">
              {locale === "pt" ? "Ambiente de fundação" : "Foundation environment"}
            </span>
            <button
              type="button"
              aria-label={locale === "pt" ? "Notificações" : "Notifications"}
              className="relative rounded-none p-1.5 text-muted transition-colors hover:bg-sand hover:text-ink"
            >
              <Bell size={17} />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
            </button>
            <ThemeToggle />
            <LocaleSwitcher current={locale} />
            <span className="ml-0.5 grid h-7 w-7 place-items-center rounded-full bg-brand text-[11px] font-semibold text-[#04211a]">
              NV
            </span>
          </div>
        </header>
        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
