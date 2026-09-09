/* Visualizações ilustrativas (mock) para as ferramentas em fase de fundação. */

const heatValue = (i: number, j: number) =>
  (Math.sin(i * 1.1) + Math.cos(j * 0.9) + Math.sin((i + j) * 0.5)) / 3;

export function HeatGrid({ cols = 14, rows = 8 }: { cols?: number; rows?: number }) {
  const color = (v: number) => {
    const n = (v + 1) / 2; // 0..1
    if (n > 0.72) return "var(--color-olive)";
    if (n > 0.55) return "#8ba33a";
    if (n > 0.42) return "#c9a227";
    if (n > 0.28) return "#c9772f";
    return "var(--color-negative)";
  };
  return (
    <div className="rounded-[var(--radius-card)] border border-ash bg-map-bg p-4">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      >
        {Array.from({ length: rows * cols }).map((_, k) => {
          const i = k % cols;
          const j = Math.floor(k / cols);
          const v = heatValue(i, j);
          return (
            <div
              key={k}
              className="aspect-square rounded-none"
              style={{ background: color(v), opacity: 0.35 + ((v + 1) / 2) * 0.6 }}
            />
          );
        })}
      </div>
      <div className="font-ui mt-3 flex items-center justify-between text-caption text-fossil">
        <span>− desempenho</span>
        <span>+ desempenho</span>
      </div>
    </div>
  );
}

const ideologyPoints = [
  { r: "Capital", x: -0.5, y: 0.3, w: 0.9 },
  { r: "RM Norte", x: 0.2, y: 0.5, w: 0.7 },
  { r: "Agreste", x: 0.55, y: -0.2, w: 0.6 },
  { r: "Litoral", x: -0.2, y: -0.4, w: 0.5 },
  { r: "Sertão", x: 0.4, y: 0.1, w: 0.55 },
  { r: "Sul", x: -0.6, y: -0.1, w: 0.65 },
];

export function IdeologyScatter() {
  const W = 480;
  const H = 360;
  const px = (x: number) => ((x + 1) / 2) * (W - 60) + 30;
  const py = (y: number) => ((1 - (y + 1) / 2)) * (H - 60) + 30;
  return (
    <div className="rounded-[var(--radius-card)] border border-ash bg-map-bg p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Matriz ideológica (ilustrativa)">
        <line x1={W / 2} y1={20} x2={W / 2} y2={H - 20} stroke="var(--color-ash)" />
        <line x1={20} y1={H / 2} x2={W - 20} y2={H / 2} stroke="var(--color-ash)" />
        <text x={W - 24} y={H / 2 - 8} textAnchor="end" className="fill-fossil" fontSize="10" fontFamily="var(--font-ui)">
          eixo econômico →
        </text>
        <text x={W / 2 + 8} y={26} className="fill-fossil" fontSize="10" fontFamily="var(--font-ui)">
          eixo de costumes ↑
        </text>
        {ideologyPoints.map((p) => (
          <g key={p.r}>
            <circle cx={px(p.x)} cy={py(p.y)} r={6 + p.w * 14} fill="var(--color-olive)" opacity={0.18} />
            <circle cx={px(p.x)} cy={py(p.y)} r={4} fill="var(--color-paper)" stroke="var(--color-olive)" strokeWidth={2} />
            <text x={px(p.x) + 10} y={py(p.y) + 3} fontSize="11" fontFamily="var(--font-ui)" className="fill-smoke">
              {p.r}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const proposalRows = [
  { theme: "Saúde", proposal: 82, demand: 91 },
  { theme: "Segurança", proposal: 40, demand: 74 },
  { theme: "Educação", proposal: 68, demand: 63 },
  { theme: "Mobilidade", proposal: 55, demand: 48 },
  { theme: "Emprego e renda", proposal: 30, demand: 70 },
  { theme: "Meio ambiente", proposal: 47, demand: 22 },
];

export function ProposalBars() {
  return (
    <div className="rounded-[var(--radius-card)] border border-ash bg-paper p-5">
      <div className="font-ui flex justify-end gap-4 text-caption text-fossil">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-none bg-ink" /> ênfase da candidatura
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-none bg-chartreuse" /> demanda observada
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {proposalRows.map((r) => (
          <div key={r.theme}>
            <div className="font-ui mb-1 flex justify-between text-body-sm">
              <span>{r.theme}</span>
              {r.demand - r.proposal > 25 && (
                <span className="text-negative">lacuna</span>
              )}
            </div>
            <div className="relative h-4 rounded-none bg-sand">
              <div
                className="absolute inset-y-0 left-0 rounded-none bg-chartreuse"
                style={{ width: `${r.demand}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-none bg-ink"
                style={{ width: `${r.proposal}%`, opacity: 0.85 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const scenarioBands = [
  { name: "Objetivo: 1º turno", p10: 44, p50: 51, p90: 57 },
  { name: "Cenário base", p10: 38, p50: 45, p90: 52 },
  { name: "Sem coligação central", p10: 31, p50: 37, p90: 44 },
];

export function ScenarioBands() {
  return (
    <div className="rounded-[var(--radius-card)] border border-ash bg-paper p-5">
      <div className="space-y-5">
        {scenarioBands.map((s) => (
          <div key={s.name}>
            <div className="font-ui mb-1.5 flex justify-between text-body-sm">
              <span>{s.name}</span>
              <span className="text-fossil">
                {s.p10}–{s.p90}% · mediana {s.p50}%
              </span>
            </div>
            <div className="relative h-6 rounded-none bg-sand">
              <div
                className="absolute inset-y-0 rounded-none bg-olive/25"
                style={{ left: `${s.p10}%`, width: `${s.p90 - s.p10}%` }}
              />
              <div
                className="absolute inset-y-0 w-0.5 bg-ink"
                style={{ left: `${s.p50}%` }}
              />
              <div className="absolute inset-y-0 w-px bg-negative" style={{ left: "50%" }} />
            </div>
          </div>
        ))}
      </div>
      <p className="font-ui mt-4 text-caption text-pebble">
        Linha vermelha = 50%. Faixa = intervalo p10–p90 de 2.000 simulações (ilustrativo).
      </p>
    </div>
  );
}

const coalitionRows = [
  { name: "Partido X + Federação Y", seats: 0.42, overlap: 0.18, time: "6m12s" },
  { name: "Partido X + Bloco B", seats: 0.37, overlap: 0.34, time: "4m50s" },
  { name: "Partido X isolado", seats: 0.24, overlap: 0, time: "2m10s" },
];

export function CoalitionBars() {
  return (
    <div className="rounded-[var(--radius-card)] border border-ash bg-paper p-5">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="font-ui text-caption uppercase tracking-wider text-pebble">
            <th className="pb-2">Composição</th>
            <th className="pb-2">Alcance estimado</th>
            <th className="pb-2">Sobreposição de base</th>
            <th className="pb-2">Tempo de TV</th>
          </tr>
        </thead>
        <tbody className="font-ui text-body-sm">
          {coalitionRows.map((r) => (
            <tr key={r.name} className="border-t border-ash">
              <td className="py-2.5 pr-4">{r.name}</td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-none bg-sand">
                    <div className="h-full rounded-none bg-olive" style={{ width: `${r.seats * 100}%` }} />
                  </div>
                  {Math.round(r.seats * 100)}%
                </div>
              </td>
              <td className="py-2.5 pr-4 text-smoke">{Math.round(r.overlap * 100)}%</td>
              <td className="py-2.5 text-smoke">{r.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
