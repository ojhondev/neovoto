"use client";

import { useState } from "react";
import type { MunicipioMatriz } from "@/lib/intel/matriz";

type Labels = {
  axisEcoLeft: string;
  axisEcoRight: string;
  axisSocLeft: string;
  axisSocRight: string;
  you: string;
  ufAverage: string;
  distance: string;
  quadrants: { pp: string; pl: string; lp: string; ll: string };
};

const W = 520;
const H = 520;
const PAD = 44;

const sx = (eco: number) => PAD + ((eco + 1) / 2) * (W - 2 * PAD);
const sy = (soc: number) => PAD + ((1 - (soc + 1) / 2)) * (H - 2 * PAD); // soc +1 no topo

function lerpHex(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const p = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${p.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function IdeologyMatrix({
  municipios,
  candidato,
  ufMedia,
  nomeYou,
  labels,
  locale,
}: {
  municipios: MunicipioMatriz[];
  candidato: { eco: number; soc: number };
  ufMedia: { eco: number; soc: number };
  nomeYou: string;
  labels: Labels;
  locale: string;
}) {
  const [hover, setHover] = useState<MunicipioMatriz | null>(null);

  const maxPop = Math.max(...municipios.map((m) => m.populacao), 1);
  const rOf = (pop: number) => 2.5 + Math.sqrt(pop / maxPop) * 12;
  const maxDist = Math.max(...municipios.map((m) => m.distancia), 0.01);
  const colOf = (d: number) => lerpHex("#4b5b0a", "#c9b892", Math.min(1, d / maxDist));

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-ash bg-map-bg p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[440px]" role="img">
          {/* quadrantes */}
          <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="var(--color-ash)" />
          <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="var(--color-ash)" />
          {(
            [
              { x: PAD + 6, y: PAD + 14, anchor: "start", t: labels.quadrants.pp }, // cima-esq: estatista + conservador
              { x: W - PAD - 6, y: PAD + 14, anchor: "end", t: labels.quadrants.pl }, // cima-dir: liberal + conservador
              { x: PAD + 6, y: H - PAD - 6, anchor: "start", t: labels.quadrants.lp }, // baixo-esq: estatista + progressista
              { x: W - PAD - 6, y: H - PAD - 6, anchor: "end", t: labels.quadrants.ll }, // baixo-dir: liberal + progressista
            ] as const
          ).map((q, i) => (
            <text key={i} x={q.x} y={q.y} textAnchor={q.anchor} className="fill-pebble" style={{ fontSize: 10 }}>
              {q.t}
            </text>
          ))}

          {/* eixos */}
          <text x={PAD} y={H - 12} className="fill-fossil" style={{ fontSize: 11 }}>
            {labels.axisEcoLeft}
          </text>
          <text x={W - PAD} y={H - 12} textAnchor="end" className="fill-fossil" style={{ fontSize: 11 }}>
            {labels.axisEcoRight}
          </text>
          <text x={12} y={PAD - 14} className="fill-fossil" style={{ fontSize: 11 }}>
            {labels.axisSocRight}
          </text>
          <text x={12} y={H - PAD + 22} className="fill-fossil" style={{ fontSize: 11 }}>
            {labels.axisSocLeft}
          </text>

          {/* municípios */}
          {municipios.map((m) => (
            <circle
              key={m.code}
              cx={sx(m.eco)}
              cy={sy(m.soc)}
              r={rOf(m.populacao)}
              fill={colOf(m.distancia)}
              fillOpacity={0.62}
              stroke={hover?.code === m.code ? "var(--color-ink)" : "none"}
              onMouseEnter={() => setHover(m)}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {m.nome} · eco {m.eco} · soc {m.soc} · {labels.distance} {m.distancia}
              </title>
            </circle>
          ))}

          {/* média da UF */}
          <circle cx={sx(ufMedia.eco)} cy={sy(ufMedia.soc)} r={7} fill="none" stroke="var(--color-fossil)" strokeWidth={1.5} strokeDasharray="3 2" />

          {/* candidato */}
          <g transform={`translate(${sx(candidato.eco)} ${sy(candidato.soc)})`}>
            <path d="M0,-9 L2.6,-2.6 L9,0 L2.6,2.6 L0,9 L-2.6,2.6 L-9,0 L-2.6,-2.6 Z" fill="var(--color-chartreuse)" stroke="var(--color-ink)" strokeWidth={1} />
          </g>
        </svg>
      </div>

      <div className="font-ui space-y-3 text-body-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rotate-45 bg-chartreuse ring-1 ring-ink" />
          <span className="text-smoke">{nomeYou}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border border-dashed border-fossil" />
          <span className="text-smoke">{labels.ufAverage}</span>
        </div>
        {hover ? (
          <div className="rounded-[6px] border border-ash bg-paper p-3">
            <p className="text-body text-ink">{hover.nome}</p>
            <p className="mt-1 text-caption text-fossil">
              eco {hover.eco} · soc {hover.soc}
            </p>
            <p className="text-caption text-fossil">
              {labels.distance}: {hover.distancia} · {hover.populacao.toLocaleString(locale)} hab.
            </p>
          </div>
        ) : (
          <p className="text-caption text-pebble">
            {locale === "pt"
              ? "Passe o mouse por um município. O tamanho do ponto é a população; a cor, a distância até o candidato."
              : "Hover a municipality. Dot size is population; colour is distance to the candidate."}
          </p>
        )}
      </div>
    </div>
  );
}
