"use client";

import { useState } from "react";
import { recomendaMunicipio, type MunicipioMatriz } from "@/lib/intel/matriz";
import { ClipButton } from "@/components/app/ClipButton";

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
  candidato: { eco: number; soc: number; conhecido?: boolean };
  ufMedia: { eco: number; soc: number };
  nomeYou: string;
  labels: Labels;
  locale: string;
}) {
  const [hover, setHover] = useState<MunicipioMatriz | null>(null);
  const [sel, setSel] = useState<MunicipioMatriz | null>(null);
  const loc = locale === "pt" ? "pt" : "en";
  const rec = sel
    ? recomendaMunicipio(sel, { eco: candidato.eco, soc: candidato.soc, conhecido: candidato.conhecido ?? true }, loc)
    : null;

  const maxPop = Math.max(...municipios.map((m) => m.populacao), 1);
  const rOf = (pop: number) => 2.5 + Math.sqrt(pop / maxPop) * 12;
  // cor pelo campo ideológico (média dos eixos): progressista → centro → conservador
  const colOf = (m: { eco: number; soc: number }) => {
    const t = (m.eco + m.soc) / 2; // -1..1
    return t < 0
      ? lerpHex("#2f6fed", "#b9b2a6", Math.min(1, (t + 1) / 1))
      : lerpHex("#b9b2a6", "#e5397f", Math.min(1, t));
  };

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
              fill={colOf(m)}
              fillOpacity={sel?.code === m.code ? 0.95 : 0.62}
              stroke={hover?.code === m.code || sel?.code === m.code ? "var(--color-ink)" : "none"}
              className="cursor-pointer"
              onMouseEnter={() => setHover(m)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setSel(m)}
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
        <div className="space-y-1.5 text-caption text-pebble">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-16 rounded-full" style={{ background: "linear-gradient(90deg,#2f6fed,#b9b2a6,#e5397f)" }} />
            <span>{loc === "pt" ? "esquerda → centro → direita" : "left → centre → right"}</span>
          </div>
          <p>
            {loc === "pt"
              ? "Clique num município para a recomendação de agenda ali."
              : "Click a municipality for the agenda recommendation there."}
          </p>
          {hover && (
            <p className="text-fossil">
              {hover.nome} · eco {hover.eco} · soc {hover.soc}
            </p>
          )}
        </div>
      </div>

      {/* recomendação acionável do município selecionado */}
      {sel && rec && (
        <div className="mt-4 rounded-[var(--radius-card)] border-l-2 border-olive bg-paper p-4 sm:col-span-2 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <p className="t-eyebrow mb-1">
              {loc === "pt" ? "O que fazer em" : "What to do in"} {sel.nome}
            </p>
            <ClipButton
              item={{
                modulo: loc === "pt" ? "Matriz Ideológica" : "Ideological Matrix",
                titulo: `${loc === "pt" ? "Agenda para" : "Agenda for"} ${sel.nome}`,
                texto: rec,
              }}
            />
          </div>
          <p className="text-body-sm text-ink">{rec}</p>
          <p className="font-ui mt-2 text-caption text-pebble">
            eco {sel.eco} · soc {sel.soc} · {labels.distance} {sel.distancia} ·{" "}
            {sel.populacao.toLocaleString(locale)} {loc === "pt" ? "hab." : "inhab."}
          </p>
        </div>
      )}
    </div>
  );
}
