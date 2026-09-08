import type { ReactNode } from "react";
import { getDictionary } from "@/lib/i18n";
import { getTool, type ToolId } from "@/lib/tools";
import { MockBanner } from "@/components/app/MockBanner";
import { ClipButton } from "@/components/app/ClipButton";

export async function ToolShell({
  id,
  children,
  howItWorks,
  outputs,
  realData = false,
  conclusao,
  conclusaoTexto,
}: {
  id: ToolId;
  updatedAt?: string;
  children: ReactNode;
  howItWorks: string[];
  outputs: string[];
  realData?: boolean;
  /** Leitura objetiva no topo — "o que isto diz". */
  conclusao?: ReactNode;
  /** versão texto-puro da conclusão, para o relatório */
  conclusaoTexto?: string;
}) {
  const { locale, t } = await getDictionary();
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

      {conclusao && (
        <div className="mt-6 rounded-[var(--radius-card)] border-l-2 border-olive bg-paper p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="t-eyebrow mb-1">{locale === "pt" ? "O que isto diz" : "What this says"}</p>
            {conclusaoTexto && (
              <ClipButton
                item={{ modulo: meta.name, titulo: locale === "pt" ? "Leitura do módulo" : "Module reading", texto: conclusaoTexto }}
              />
            )}
          </div>
          <div className="text-body-sm text-ink">{conclusao}</div>
        </div>
      )}

      {!realData && (
        <div className="mt-8">
          <MockBanner text={t.toolPage.statusStub} />
        </div>
      )}

      <section className="mt-6">{children}</section>

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
    </>
  );
}
