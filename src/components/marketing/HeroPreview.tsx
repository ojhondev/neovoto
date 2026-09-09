/**
 * Eco estático do painel NeoVoto para o hero da home — não é screenshot, é o
 * próprio sistema visual (tokens do tema) montado em pequena escala. Decorativo.
 */
const RAIL_ITEMS = [true, false, false, false];
const STEPS = ["Captura", "Base", "Diagnóstico", "Plano"];
const BARS = [
  { l: "Território", v: 92, c: "var(--color-brand)" },
  { l: "Posicionamento", v: 64, c: "var(--color-brand)" },
  { l: "Base", v: 78, c: "var(--color-brand)" },
  { l: "Alinhamento", v: 48, c: "var(--color-warn)" },
];
const DONUT = [
  { v: 36, c: "var(--color-q-priority)" },
  { v: 22, c: "var(--color-q-expansion)" },
  { v: 10, c: "var(--color-q-stronghold)" },
  { v: 32, c: "var(--color-q-out)" },
];

function Donut() {
  const total = DONUT.reduce((s, d) => s + d.v, 0);
  const c = 2 * Math.PI * 34;
  const arcs = DONUT.reduce<{ d: (typeof DONUT)[number]; len: number; off: number }[]>((acc, d) => {
    const len = (d.v / total) * c;
    acc.push({ d, len, off: acc.reduce((s, a) => s + a.len, 0) });
    return acc;
  }, []);
  return (
    <svg viewBox="0 0 88 88" className="h-[88px] w-[88px] -rotate-90">
      <circle cx="44" cy="44" r="34" fill="none" stroke="var(--color-line)" strokeWidth="13" />
      {arcs.map(({ d, len, off }, i) => (
        <circle
          key={i}
          cx="44"
          cy="44"
          r="34"
          fill="none"
          stroke={d.c}
          strokeWidth="13"
          strokeDasharray={`${len} ${c - len}`}
          strokeDashoffset={-off}
        />
      ))}
    </svg>
  );
}

export function HeroPreview() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none border border-line-strong bg-map-bg p-2 sm:p-3"
    >
      <div className="flex overflow-hidden border border-line bg-surface">
        {/* rail */}
        <div className="hidden w-11 shrink-0 flex-col items-center gap-3 bg-charcoal py-3 sm:flex">
          <div className="h-3.5 w-3.5 bg-brand" />
          {RAIL_ITEMS.map((active, i) => (
            <div
              key={i}
              className={"h-4 w-4 " + (active ? "bg-white/90" : "bg-white/20")}
            />
          ))}
        </div>

        {/* body */}
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          {/* header row */}
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="space-y-1.5">
              <div className="h-2 w-24 bg-ink/80" />
              <div className="h-1.5 w-16 bg-faint/60" />
            </div>
            <span className="pill pill-ok text-[10px]">Competitivo</span>
          </div>

          {/* new-data strip */}
          <div className="mt-3 flex items-center gap-2 border border-line bg-surface px-2.5 py-2">
            <span className="pill pill-ok text-[10px]">Novos dados</span>
            <div className="h-1.5 flex-1 bg-line" />
          </div>

          {/* stepper */}
          <div className="mt-3 flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-1.5">
                <span
                  className={
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold " +
                    (i < 3 ? "bg-brand text-[#04211a]" : "border border-line-strong text-faint")
                  }
                >
                  {i < 3 ? "✓" : i + 1}
                </span>
                <span className="hidden text-[9px] font-medium text-muted lg:block">{s}</span>
                {i < STEPS.length - 1 && (
                  <span className={"h-px flex-1 " + (i < 2 ? "bg-brand" : "bg-line")} />
                )}
              </div>
            ))}
          </div>

          {/* kpi + charts */}
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <div className="border border-line bg-surface p-2.5">
              <div className="h-1.5 w-10 bg-faint/60" />
              <div className="mt-2 text-2xl font-bold leading-none text-ink">61</div>
              <div className="mt-2 h-1 w-full bg-line">
                <div className="h-full bg-info" style={{ width: "61%" }} />
              </div>
            </div>
            <div className="border border-line bg-surface p-2.5">
              <div className="h-1.5 w-12 bg-faint/60" />
              <div className="mt-2 text-2xl font-bold leading-none text-ink">36</div>
              <div className="mt-2 h-1.5 w-14 bg-brand-tint" />
            </div>
            <div className="flex items-center justify-center border border-line bg-surface p-2">
              <Donut />
            </div>
          </div>

          {/* bar list */}
          <div className="mt-2.5 space-y-1.5 border border-line bg-surface p-2.5">
            {BARS.map((b) => (
              <div key={b.l} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[9px] text-muted">{b.l}</span>
                <span className="h-1.5 flex-1 bg-line">
                  <span className="block h-full" style={{ width: `${b.v}%`, background: b.c }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
