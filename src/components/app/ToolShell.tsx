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
    <div className="space-y-5">
      {/* -------- Cabeçalho do módulo -------- */}
      <div className="flex items-start gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center border border-line bg-surface text-ink">
          <Icon size={19} strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <p className="t-eyebrow">{t.nav.tools}</p>
          <h1 className="t-heading-lg mt-0.5 leading-tight">{meta.name}</h1>
          <p className="mt-2 max-w-2xl text-body-sm text-muted">{meta.desc}</p>
        </div>
      </div>

      {conclusao && (
        <div className="card border-l-2 border-l-brand">
          <div className="flex items-start justify-between gap-3">
            <p className="t-eyebrow">{locale === "pt" ? "O que isto diz" : "What this says"}</p>
            {conclusaoTexto && (
              <ClipButton
                item={{
                  modulo: meta.name,
                  titulo: locale === "pt" ? "Leitura do módulo" : "Module reading",
                  texto: conclusaoTexto,
                }}
              />
            )}
          </div>
          <div className="mt-2 text-body-sm text-ink">{conclusao}</div>
        </div>
      )}

      {!realData && <MockBanner text={t.toolPage.statusStub} />}

      <section>{children}</section>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="t-heading">{t.toolPage.howItWorks}</h2>
          <ol className="mt-4 space-y-2.5 text-body-sm text-body">
            {howItWorks.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center bg-brand-tint text-[11px] font-semibold text-brand-ink">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card">
          <h2 className="t-heading">{t.toolPage.outputs}</h2>
          <ul className="mt-4 space-y-2.5 text-body-sm text-body">
            {outputs.map((o, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 bg-faint" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
