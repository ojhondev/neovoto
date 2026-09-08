"use client";

import { useState } from "react";
import type { PontoDispersao } from "@/lib/intel/cenarios";
import { urgVar } from "@/lib/viz/colors";

const W = 600;
const H = 340;
const PAD = 46;

export function CenariosScatter({
  pontos,
  labels,
  locale,
}: {
  pontos: PontoDispersao[];
  labels: { x: string; y: string; alvo: string };
  locale: string;
}) {
  const [hover, setHover] = useState<PontoDispersao | null>(null);
  const maxShare = Math.max(...pontos.map((p) => p.share), 0.05);
  const maxGap = Math.max(...pontos.map((p) => p.gap), 1);

  const sx = (share: number) => PAD + (share / maxShare) * (W - 2 * PAD);
  const sy = (ifet: number) => H - PAD - (ifet / 100) * (H - 2 * PAD);
  const rOf = (gap: number) => 3 + Math.sqrt(gap / maxGap) * 13;

  return (
    <div className="chart-in overflow-x-auto rounded-[var(--radius-card)] border border-ash bg-map-bg p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img">
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-ash)" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--color-ash)" />
        <text x={W - PAD} y={H - 14} textAnchor="end" className="fill-fossil" style={{ fontSize: 10 }}>
          {labels.x} →
        </text>
        <text x={14} y={PAD - 6} className="fill-fossil" style={{ fontSize: 10 }}>
          ↑ {labels.y}
        </text>

        {pontos.map((p) => {
          const x = sx(p.share);
          const y = sy(p.ifet);
          return (
            <g key={p.code} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}>
              <circle
                cx={x}
                cy={y}
                r={rOf(p.gap)}
                fill={p.alvo ? urgVar("crit") : "var(--color-cat-1)"}
                fillOpacity={p.alvo ? 0.9 : 0.4}
                stroke={p.alvo || hover?.code === p.code ? "var(--color-ink)" : "none"}
                strokeWidth={1.2}
              />
              {p.alvo && (
                <text x={x} y={y - rOf(p.gap) - 3} textAnchor="middle" className="fill-ink" style={{ fontSize: 9, fontWeight: 600 }}>
                  {p.nome.length > 12 ? p.nome.slice(0, 12) + "…" : p.nome}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="font-ui mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-caption text-pebble">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: urgVar("crit") }} />
          {labels.alvo}
        </span>
        {hover && (
          <span className="text-smoke">
            {hover.nome}: {locale === "pt" ? "share" : "share"} {(hover.share * 100).toFixed(1)}% · IFET {hover.ifet} ·{" "}
            {locale === "pt" ? "lacuna" : "gap"} {hover.gap.toLocaleString(locale)}
          </span>
        )}
      </div>
    </div>
  );
}
