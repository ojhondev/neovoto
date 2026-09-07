import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { TOOLS, toolPath } from "@/lib/tools";
import { MockBanner } from "@/components/app/MockBanner";

export const metadata: Metadata = { title: "Painel" };

export default async function PainelHome() {
  const { locale, t } = await getDictionary();
  return (
    <>
      <p className="t-eyebrow mb-3">{t.common.appName}</p>
      <h1 className="t-heading-lg">{t.common.dashboard}</h1>
      <p className="mt-3 max-w-2xl text-body text-fossil">
        {locale === "pt"
          ? "Seis ferramentas partindo dos mesmos dados oficiais. Comece pelo território e chegue ao cenário."
          : "Six tools from the same official data. Start with territory and arrive at a scenario."}
      </p>

      <div className="mt-8">
        <MockBanner text={t.common.mockNotice} />
      </div>

      <div className="grid gap-px overflow-hidden rounded-[var(--radius-card-lg)] border border-ash bg-ash sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const meta = t.tools[tool.key];
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              href={toolPath(tool.id)}
              className="group flex flex-col bg-paper p-6 transition-colors hover:bg-bone"
            >
              <Icon size={20} strokeWidth={1.5} className="text-ink" />
              <h2 className="t-heading mt-3 text-[22px]">{meta.name}</h2>
              <p className="mt-2 flex-1 text-body-sm text-fossil">{meta.short}</p>
              <span className="nav-link mt-4 inline-flex w-fit items-center gap-1.5 text-[13px]">
                {t.common.preview} <ArrowRight size={13} />
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
