import type { ReactNode } from "react";
import { getDictionary } from "@/lib/i18n";
import { getTool, type ToolId } from "@/lib/tools";
import { MockBanner } from "@/components/app/MockBanner";

export async function ToolShell({
  id,
  updatedAt,
  children,
  howItWorks,
  outputs,
}: {
  id: ToolId;
  updatedAt: string;
  children: ReactNode;
  howItWorks: string[];
  outputs: string[];
}) {
  const { t } = await getDictionary();
  const tool = getTool(id);
  const meta = t.tools[tool.key];
  const Icon = tool.icon;

  return (
    <>
      <div className="flex items-start gap-3">
        <Icon size={26} strokeWidth={1.4} className="mt-1 text-ink" />
        <div>
          <p className="t-eyebrow mb-1">{t.nav.tools}</p>
          <h1 className="t-heading-lg">{meta.name}</h1>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-body text-fossil">{meta.desc}</p>

      <div className="mt-8">
        <MockBanner text={t.toolPage.statusStub} />
      </div>

      <section className="mt-2">{children}</section>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="t-heading text-[22px]">{t.toolPage.howItWorks}</h2>
          <ol className="font-ui mt-4 space-y-2 text-body-sm text-smoke">
            {howItWorks.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-pebble">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="card">
          <h2 className="t-heading text-[22px]">{t.toolPage.outputs}</h2>
          <ul className="font-ui mt-4 space-y-2 text-body-sm text-smoke">
            {outputs.map((o, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="text-pebble">
                  —
                </span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="t-heading text-[22px]">{t.toolPage.inputs}</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {tool.sources.map((s) => (
            <li
              key={s}
              className="font-ui rounded-[4px] bg-sand px-2.5 py-1 text-caption text-smoke"
            >
              {s}
            </li>
          ))}
        </ul>
        <p className="font-ui mt-4 text-caption text-pebble">
          {t.common.lastUpdate}: {updatedAt}
        </p>
      </div>
    </>
  );
}
