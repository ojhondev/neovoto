import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/nav/LocaleSwitcher";
import { InfluenceNetwork } from "@/components/viz/InfluenceNetwork";
import { HeatGrid, ScenarioBands, ProposalBars } from "@/components/viz/mocks";
import { getLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export async function AuthShell({
  children,
  panelHeadline,
  panelSources,
}: {
  children: React.ReactNode;
  panelHeadline: string;
  panelSources: string;
}) {
  const locale: Locale = await getLocale();
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,440px)_1fr]">
      {/* Coluna do formulário */}
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo height={24} />
          <LocaleSwitcher current={locale} />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {children}
        </div>
      </div>

      {/* Painel chartreuse com colagem de produto */}
      <div
        className="relative hidden overflow-hidden bg-chartreuse lg:block"
        style={{
          backgroundImage:
            "radial-gradient(rgba(28,28,28,0.10) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="relative h-[520px] w-full max-w-2xl">
            <div className="absolute left-0 top-4 w-[62%] -rotate-2">
              <InfluenceNetwork compact withCallouts={false} />
            </div>
            <div className="absolute right-0 top-0 w-[42%] rotate-3 rounded-[12px] border border-ink/10 bg-paper p-3">
              <ProposalBars />
            </div>
            <div className="absolute bottom-16 left-8 w-[40%] -rotate-1">
              <ScenarioBands />
            </div>
            <div className="absolute bottom-0 right-6 w-[46%] rotate-2">
              <HeatGrid cols={10} rows={6} />
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="font-display max-w-md text-[26px] font-light leading-tight tracking-[-0.02em] text-ink">
            {panelHeadline}
          </p>
          <p className="font-ui mt-4 text-caption uppercase tracking-[0.14em] text-smoke">
            {panelSources}
          </p>
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="font-ui flex w-full items-center justify-center gap-2 rounded-[8px] border border-pebble bg-paper px-4 py-2.5 text-body-sm text-ink opacity-70"
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.2-3.1-.5-4.5H24v9h12.7c-.6 3-2.4 5.5-5 7.2l7.7 6c4.5-4.2 7.1-10.3 7.1-17.7z" />
        <path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.7-6c-2.1 1.4-4.9 2.3-7.3 2.3-6.4 0-11.7-3.7-13.6-9.1l-7.9 6.1C6.4 42.6 14.6 48 24 48z" />
      </svg>
      {label}
    </button>
  );
}
