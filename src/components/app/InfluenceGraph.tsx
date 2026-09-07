"use client";

import { useState } from "react";
import type { NoInfluencia, ArestaInfluencia } from "@/lib/intel/influencia";
import { partidoColor } from "@/lib/viz/colors";

const W = 720;
const H = 460;
const PAD = 40;

export function InfluenceGraph({
  nos,
  arestas,
  base,
  labels,
  locale,
}: {
  nos: NoInfluencia[];
  arestas: ArestaInfluencia[];
  base: string;
  labels: { you: string; ally: string; foe: string; neutral: string; ideoLeft: string; ideoRight: string };
  locale: string;
}) {
  const [hover, setHover] = useState<NoInfluencia | null>(null);

  const maxShare = Math.max(...nos.map((n) => n.share), 0.01);
  const eixoDe = (n: NoInfluencia) => (n.eco + n.soc) / 2;
  const sx = (v: number) => PAD + ((v + 1) / 2) * (W - 2 * PAD);
  const sy = (share: number) => PAD + (1 - Math.sqrt(share / maxShare)) * (H - 2 * PAD);
  const rOf = (share: number) => 6 + Math.sqrt(share / maxShare) * 30;

  const pos = new Map(nos.map((n) => [n.sigla, { x: sx(eixoDe(n)), y: sy(n.share) }]));
  const baseNode = nos.find((n) => n.sigla === base);
  const baseEixo = baseNode ? eixoDe(baseNode) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-ash bg-map-bg p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]" role="img">
          {/* zona ideológica do candidato */}
          <rect
            x={sx(baseEixo - 0.5)}
            y={PAD}
            width={sx(baseEixo + 0.5) - sx(baseEixo - 0.5)}
            height={H - 2 * PAD}
            fill="var(--color-cmp-self)"
            fillOpacity={0.06}
          />
          <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="var(--color-ash)" strokeDasharray="2 3" />
          <text x={PAD} y={H - 14} className="fill-fossil" style={{ fontSize: 11 }}>
            {labels.ideoLeft}
          </text>
          <text x={W - PAD} y={H - 14} textAnchor="end" className="fill-fossil" style={{ fontSize: 11 }}>
            {labels.ideoRight}
          </text>

          {/* arestas — sobreposição de base */}
          {arestas.map((e, i) => {
            const a = pos.get(e.a);
            const b = pos.get(e.b);
            if (!a || !b) return null;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--color-fossil)"
                strokeWidth={e.forca * 3.5}
                strokeOpacity={0.10 + e.forca * 0.28}
              />
            );
          })}

          {/* nós */}
          {nos.map((n) => {
            const p = pos.get(n.sigla)!;
            const isBase = n.sigla === base;
            const r = rOf(n.share);
            return (
              <g key={n.sigla} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={partidoColor(n.sigla)}
                  fillOpacity={n.campo === "neutro" ? 0.6 : 0.9}
                  stroke={isBase ? "var(--color-ink)" : hover?.sigla === n.sigla ? "var(--color-ink)" : "#fff"}
                  strokeWidth={isBase ? 3 : 1.5}
                />
                {(isBase || n.share > maxShare * 0.18 || hover?.sigla === n.sigla) && (
                  <text
                    x={p.x}
                    y={p.y - r - 4}
                    textAnchor="middle"
                    className="fill-ink"
                    style={{ fontSize: 11, fontWeight: isBase ? 700 : 500 }}
                  >
                    {n.sigla}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="font-ui space-y-2 text-body-sm">
        {[
          { k: "you", c: "var(--color-ink)", t: `${labels.you}: ${base}` },
          { k: "ally", c: "var(--color-urg-low)", t: labels.ally },
          { k: "foe", c: "var(--color-urg-crit)", t: labels.foe },
          { k: "neutral", c: "var(--color-urg-none)", t: labels.neutral },
        ].map((l) => (
          <div key={l.k} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.c }} />
            <span className="text-smoke">{l.t}</span>
          </div>
        ))}
        {hover && (
          <div className="mt-3 rounded-[6px] border border-ash bg-paper p-3">
            <p className="flex items-center gap-2 text-body text-ink">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: partidoColor(hover.sigla) }} />
              {hover.sigla}
            </p>
            <p className="mt-1 text-caption text-fossil">
              {hover.votos.toLocaleString(locale)} {locale === "pt" ? "votos" : "votes"} ·{" "}
              {(hover.share * 100).toFixed(1)}% · {locale === "pt" ? "bancada" : "bench"} {hover.bancada}
            </p>
          </div>
        )}
        <p className="pt-2 text-caption text-pebble">
          {locale === "pt"
            ? "Tamanho = voto no estado. Posição horizontal = eixo ideológico. Linha entre dois partidos = disputam os mesmos eleitores."
            : "Size = vote in the state. Horizontal position = ideological axis. A line between two parties = they compete for the same voters."}
        </p>
      </div>
    </div>
  );
}
