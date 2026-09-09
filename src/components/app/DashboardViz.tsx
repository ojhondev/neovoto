import type { ReactNode } from "react";
import { Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Donut — distribuição em anel (estilo governança: risco/prioridade) */
/* ------------------------------------------------------------------ */

export type DonutSeg = { label: string; value: number; color: string };

export function Donut({
  segments,
  size = 168,
  thickness = 20,
  centerValue,
  centerLabel,
}: {
  segments: DonutSeg[];
  size?: number;
  thickness?: number;
  centerValue?: ReactNode;
  centerLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  // offset acumulado por segmento, calculado antes do render
  const arcs = segments.reduce<{ seg: DonutSeg; len: number; offset: number }[]>((acc, seg) => {
    const len = (seg.value / total) * c;
    const offset = acc.reduce((s, a) => s + a.len, 0);
    acc.push({ seg, len, offset });
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={thickness}
          />
          {arcs.map(({ seg, len, offset }) => (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className="draw-line"
              style={{ ["--dash" as string]: c }}
            />
          ))}
        </svg>
        {(centerValue !== undefined || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue !== undefined && (
              <span className="text-heading-lg font-semibold leading-none text-ink">{centerValue}</span>
            )}
            {centerLabel && (
              <span className="mt-1 max-w-[8rem] text-[11px] leading-tight text-faint">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2 text-body-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: seg.color }} />
            <span className="flex-1 truncate text-body">{seg.label}</span>
            <span className="font-semibold tabular-nums text-ink">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PipelineBars — barras horizontais (projetos por etapa / dimensão)  */
/* ------------------------------------------------------------------ */

export type BarRow = { label: string; value: number; display?: string; color?: string };

export function PipelineBars({ rows, unit, max: maxProp }: { rows: BarRow[]; unit?: string; max?: number }) {
  const max = Math.max(1, maxProp ?? 0, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-body-sm sm:grid-cols-[8rem_1fr_3rem]">
          <span className="truncate text-body" title={r.label}>
            {r.label}
          </span>
          <span className="h-2.5 rounded-full bg-sand">
            <span
              className="bar-grow block h-full rounded-full"
              style={{
                width: `${Math.max(2, (r.value / max) * 100)}%`,
                background: r.color ?? "var(--color-brand)",
              }}
            />
          </span>
          <span className="text-right tabular-nums font-semibold text-ink">
            {r.display ?? r.value}
            {unit ? <span className="ml-0.5 font-normal text-faint">{unit}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stepper — fluxo horizontal (Intake → … → Monitoramento)            */
/* ------------------------------------------------------------------ */

export type StepState = "done" | "current" | "pending";
export type Step = { title: string; sub: string; state: StepState; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> };

export function Stepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid gap-y-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const done = s.state === "done";
        const current = s.state === "current";
        return (
          <li key={s.title} className="relative flex gap-3 lg:flex-col lg:gap-3 lg:pr-6">
            {i < steps.length - 1 && (
              <span
                className="absolute left-[15px] top-8 h-full w-px lg:left-0 lg:top-[15px] lg:h-px lg:w-full"
                style={{ background: done ? "var(--color-brand)" : "var(--color-line)" }}
              />
            )}
            <span
              className={
                "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[13px] font-semibold " +
                (done
                  ? "border-brand bg-brand text-[#04211a]"
                  : current
                    ? "border-brand bg-brand-tint text-brand-ink"
                    : "border-line-strong bg-surface text-faint")
              }
            >
              {done ? <Check size={16} strokeWidth={2.4} /> : <Icon size={15} strokeWidth={1.9} />}
            </span>
            <div className="min-w-0 lg:pr-2">
              <p className={"text-body-sm font-semibold " + (s.state === "pending" ? "text-muted" : "text-ink")}>
                {s.title}
              </p>
              <p className="mt-0.5 text-caption text-faint">{s.sub}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/*  Sparkline — série curta (monitoramento)                            */
/* ------------------------------------------------------------------ */

export function Sparkline({ points, color = "var(--color-brand)", height = 56 }: { points: number[]; color?: string; height?: number }) {
  if (points.length < 2) return null;
  const w = 240;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - ((p - min) / span) * (height - 8) - 4).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L${w},${height} L0,${height} Z`} fill={color} opacity={0.1} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="draw-line" style={{ ["--dash" as string]: 1000 }} />
    </svg>
  );
}
