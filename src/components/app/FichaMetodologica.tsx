import type { Ficha } from "@/lib/intel/fichas";

const STATUS: Record<Ficha["status"], { pt: string; en: string; cor: string }> = {
  validado: { pt: "Validado por backtest", en: "Backtested", cor: "var(--color-positive)" },
  calibrado: { pt: "Calibrado", en: "Calibrated", cor: "var(--color-olive)" },
  heuristico: { pt: "Heurística", en: "Heuristic", cor: "var(--color-urg-med)" },
};

/**
 * Ficha metodológica de um motor: método, validação, faixa de incerteza, fontes
 * e limites conhecidos. Colapsável — aberta por padrão em telas grandes via CSS
 * do próprio <details> não é possível, então fica aberta sempre; some no print? não.
 */
export function FichaMetodologica({
  ficha,
  locale,
  labels,
}: {
  ficha: Ficha;
  locale: string;
  labels: {
    title: string;
    method: string;
    validation: string;
    uncertainty: string;
    sources: string;
    limits: string;
  };
}) {
  const pt = locale === "pt";
  const st = STATUS[ficha.status];

  return (
    <details className="card mt-6" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <h3 className="t-heading text-[20px]">{labels.title}</h3>
        <span className="flex items-center gap-2">
          <span
            className="font-ui rounded-none px-2 py-0.5 text-[11px] font-medium text-white"
            style={{ background: st.cor }}
          >
            {pt ? st.pt : st.en}
          </span>
          <span className="font-ui text-caption text-pebble">{ficha.versao}</span>
        </span>
      </summary>

      <div className="mt-4 space-y-4 text-body-sm">
        <div>
          <p className="t-eyebrow mb-1">{labels.method}</p>
          <p className="text-fossil">{ficha.metodo}</p>
        </div>
        <div>
          <p className="t-eyebrow mb-1">{labels.validation}</p>
          <p className="text-fossil">{ficha.validacao}</p>
        </div>
        <div>
          <p className="t-eyebrow mb-1">{labels.uncertainty}</p>
          <p className="text-fossil">{ficha.intervalo}</p>
        </div>
        <div>
          <p className="t-eyebrow mb-1">{labels.sources}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {ficha.fontes.map((f) => (
              <span key={f} className="font-ui rounded-none bg-sand px-2 py-1 text-caption text-smoke">
                {f}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="t-eyebrow mb-1">{labels.limits}</p>
          <ul className="mt-1 space-y-1 text-caption text-fossil">
            {ficha.limites.map((l) => (
              <li key={l}>— {l}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
