"use client";

import { useState } from "react";
import type { PartidosResultado } from "@/lib/intel/partidos-analise";
import { partidoColor, lerpHex } from "@/lib/viz/colors";

function corCorrelacao(v: number) {
  // −1 azul · 0 papel · +1 vermelho
  if (v >= 0) return lerpHex("#f2efe9", "#c0392b", v);
  return lerpHex("#f2efe9", "#2f6fed", -v);
}

const SW = 560;
const SH = 320;
const SPAD = 44;

export function PartidosViz({
  data,
  labels,
}: {
  data: PartidosResultado;
  labels: { corrTitle: string; corrHint: string; scatterTitle: string; ecoLeft: string; ecoRight: string; socTop: string; socBottom: string };
}) {
  const [hover, setHover] = useState<{ a: string; b: string; v: number } | null>(null);

  const sx = (eco: number) => SPAD + ((eco + 1) / 2) * (SW - 2 * SPAD);
  const sy = (soc: number) => SPAD + (1 - (soc + 1) / 2) * (SH - 2 * SPAD);
  const maxShare = Math.max(...data.nos.map((x) => x.share), 0.01);

  return (
    <div className="space-y-8">
      {/* Matriz de correlação */}
      <div>
        <h3 className="t-heading text-[18px]">{labels.corrTitle}</h3>
        <p className="font-ui mt-1 text-caption text-pebble">{labels.corrHint}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="border-collapse font-ui text-[11px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-paper p-1" />
                {data.ordem.map((s) => (
                  <th key={s} className="p-1 text-fossil">
                    <span className="inline-block w-7 -rotate-45 origin-bottom-left whitespace-nowrap">{s}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ordem.map((rowSig, i) => (
                <tr key={rowSig}>
                  <td className="sticky left-0 bg-paper py-1 pr-2 text-right text-fossil">{rowSig}</td>
                  {data.ordem.map((colSig, j) => {
                    const v = data.matriz[i][j];
                    return (
                      <td
                        key={colSig}
                        onMouseEnter={() => setHover({ a: rowSig, b: colSig, v })}
                        onMouseLeave={() => setHover(null)}
                        className="h-7 w-7 cursor-default text-center"
                        style={{
                          background: i === j ? "var(--color-sand)" : corCorrelacao(v),
                          color: Math.abs(v) > 0.55 ? "#fff" : "var(--color-smoke)",
                          outline: hover && hover.a === rowSig && hover.b === colSig ? "2px solid var(--color-ink)" : "none",
                        }}
                      >
                        {i === j ? "" : v.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="font-ui mt-3 flex items-center gap-2 text-caption text-pebble">
          <span className="h-2.5 w-16 rounded-full" style={{ background: "linear-gradient(90deg,#2f6fed,#f2efe9,#c0392b)" }} />
          <span>−1 (bases opostas) · 0 · +1 (mesma base)</span>
        </div>
        {hover && (
          <p className="font-ui mt-2 text-caption text-smoke">
            {hover.a} × {hover.b}: <span className="text-ink">{hover.v.toFixed(2)}</span>
          </p>
        )}
      </div>

      {/* Scatter ideológico */}
      <div>
        <h3 className="t-heading text-[18px]">{labels.scatterTitle}</h3>
        <div className="mt-3 overflow-x-auto rounded-[var(--radius-card)] border border-ash bg-map-bg p-2">
          <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full min-w-[440px]" role="img">
            <line x1={SW / 2} y1={SPAD} x2={SW / 2} y2={SH - SPAD} stroke="var(--color-ash)" strokeDasharray="2 3" />
            <line x1={SPAD} y1={SH / 2} x2={SW - SPAD} y2={SH / 2} stroke="var(--color-ash)" strokeDasharray="2 3" />
            <text x={SPAD} y={SH - 12} className="fill-fossil" style={{ fontSize: 10 }}>{labels.ecoLeft}</text>
            <text x={SW - SPAD} y={SH - 12} textAnchor="end" className="fill-fossil" style={{ fontSize: 10 }}>{labels.ecoRight}</text>
            <text x={12} y={SPAD - 6} className="fill-fossil" style={{ fontSize: 10 }}>{labels.socTop}</text>
            <text x={12} y={SH - SPAD + 20} className="fill-fossil" style={{ fontSize: 10 }}>{labels.socBottom}</text>
            {data.nos.map((p) => {
              const r = 5 + Math.sqrt(p.share / maxShare) * 22;
              return (
                <g key={p.sigla} onMouseEnter={() => setHover({ a: p.sigla, b: p.sigla, v: 1 })} onMouseLeave={() => setHover(null)}>
                  <circle cx={sx(p.eco)} cy={sy(p.soc)} r={r} fill={partidoColor(p.sigla)} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
                  <text x={sx(p.eco)} y={sy(p.soc) - r - 3} textAnchor="middle" className="fill-ink" style={{ fontSize: 10, fontWeight: 600 }}>
                    {p.sigla}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
