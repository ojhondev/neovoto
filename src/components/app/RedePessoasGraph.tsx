"use client";

import { useMemo, useState } from "react";
import type { NoPessoa, ArestaPessoa } from "@/lib/intel/rede-pessoas";
import { partidoColor } from "@/lib/viz/colors";

const W = 680;
const H = 360;
const PAD = 46;

const CAMPO_COR: Record<string, string> = {
  aliado: "var(--color-urg-low)",
  adversario: "var(--color-urg-crit)",
  neutro: "var(--color-urg-none)",
};

export function RedePessoasGraph({
  nos,
  arestas,
  labels,
}: {
  nos: NoPessoa[];
  arestas: ArestaPessoa[];
  labels: { x: string; y: string; ally: string; foe: string; neutral: string };
}) {
  const [sel, setSel] = useState<NoPessoa | null>(null);
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of nos) {
      m.set(n.id, {
        x: PAD + ((n.x + 1) / 2) * (W - 2 * PAD),
        y: H - PAD - n.concordanciaComCampo * (H - 2 * PAD),
      });
    }
    return m;
  }, [nos]);

  return (
    <div>
      <div className="chart-in overflow-x-auto rounded-[var(--radius-card)] border border-ash bg-map-bg p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img">
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-ash)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--color-ash)" />
          <text x={W - PAD} y={H - 12} textAnchor="end" className="fill-fossil" style={{ fontSize: 10 }}>
            {labels.x} →
          </text>
          <text x={12} y={PAD - 6} className="fill-fossil" style={{ fontSize: 10 }}>
            ↑ {labels.y}
          </text>

          {arestas.map((e: ArestaPessoa) => {
            const a = pos.get(e.a);
            const b = pos.get(e.b);
            if (!a || !b) return null;
            return (
              <line
                key={`${e.a}-${e.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--color-ash)"
                strokeWidth={0.6 + (e.forca - 0.75) * 4}
                strokeOpacity={0.5}
              />
            );
          })}

          {nos.map((n) => {
            const p = pos.get(n.id)!;
            const on = sel?.id === n.id;
            return (
              <circle
                key={n.id}
                cx={p.x}
                cy={p.y}
                r={on ? 7 : 4.5}
                fill={partidoColor(n.partido)}
                stroke={on ? "var(--color-ink)" : CAMPO_COR[n.campo]}
                strokeWidth={on ? 2 : 1.5}
                className="cursor-pointer"
                onClick={() => setSel(on ? null : n)}
              >
                <title>
                  {n.nome} ({n.partido}) · {labels[n.campo === "aliado" ? "ally" : n.campo === "adversario" ? "foe" : "neutral"]}
                </title>
              </circle>
            );
          })}
          {sel && (
            <text
              x={pos.get(sel.id)!.x}
              y={pos.get(sel.id)!.y - 10}
              textAnchor="middle"
              className="fill-ink"
              style={{ fontSize: 10, fontWeight: 700 }}
            >
              {sel.nome}
            </text>
          )}
        </svg>
        <div className="font-ui flex flex-wrap gap-x-4 gap-y-1 px-1 pt-2 text-caption text-pebble">
          {(["aliado", "adversario", "neutro"] as const).map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CAMPO_COR[c] }} />
              {c === "aliado" ? labels.ally : c === "adversario" ? labels.foe : labels.neutral}
            </span>
          ))}
        </div>
      </div>

      {sel && (
        <div className="mt-3 rounded-[var(--radius-card)] border-l-2 border-olive bg-paper p-3">
          <p className="font-ui text-body-sm font-medium text-ink">
            {sel.nome} · {sel.partido}
            {sel.federacao ? ` · ${sel.federacao}` : ""}
          </p>
          <p className="font-ui mt-1 text-caption text-fossil">
            {labels.y}: {Math.round(sel.concordanciaComCampo * 100)}% · {labels.x}: {sel.x} ·{" "}
            {Math.round(sel.presenca * 100)}% de presença nas votações
          </p>
        </div>
      )}
    </div>
  );
}
