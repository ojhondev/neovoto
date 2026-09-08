"use client";

import type { CandidatoComparado, EixoRadar } from "@/lib/intel/comparar";

const SIZE = 320;
const C = SIZE / 2;
const R = SIZE / 2 - 46;

export function CompareRadar({
  candidatos,
  eixos,
  eixoLabel,
  nota,
}: {
  candidatos: CandidatoComparado[];
  eixos: EixoRadar[];
  eixoLabel: Record<EixoRadar, string>;
  nota: string;
}) {
  const n = eixos.length;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => {
    const rr = (v / 100) * R;
    return [C + Math.cos(ang(i)) * rr, C + Math.sin(ang(i)) * rr];
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[320px_1fr]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[320px]" role="img">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="var(--color-ash)" strokeWidth={0.75} />
        ))}
        {eixos.map((e, i) => {
          const [x, y] = pt(i, 100);
          const [lx, ly] = [C + Math.cos(ang(i)) * (R + 22), C + Math.sin(ang(i)) * (R + 22)];
          return (
            <g key={e}>
              <line x1={C} y1={C} x2={x} y2={y} stroke="var(--color-ash)" strokeWidth={0.75} />
              <text
                x={lx}
                y={ly}
                textAnchor={Math.abs(lx - C) < 8 ? "middle" : lx > C ? "start" : "end"}
                dominantBaseline="middle"
                className="fill-fossil"
                style={{ fontSize: 10 }}
              >
                {eixoLabel[e]}
              </text>
            </g>
          );
        })}
        {candidatos.map((c) => {
          const pts = eixos.map((e, i) => pt(i, c.radar[e]).join(",")).join(" ");
          return (
            <polygon
              key={c.id}
              className="poly-in"
              points={pts}
              fill={c.cor}
              fillOpacity={0.14}
              stroke={c.cor}
              strokeWidth={2}
            />
          );
        })}
        {candidatos.map((c) =>
          eixos.map((e, i) => {
            const [x, y] = pt(i, c.radar[e]);
            return <circle key={c.id + e} cx={x} cy={y} r={3} fill={c.cor} />;
          }),
        )}
      </svg>

      <div className="font-ui space-y-2 self-center text-body-sm">
        {candidatos.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: c.cor }} />
            <span className="text-smoke">
              {c.nome} <span className="text-pebble">· {c.partido}-{c.uf}</span>
            </span>
          </div>
        ))}
        <p className="pt-2 text-caption text-pebble">{nota}</p>
      </div>
    </div>
  );
}
