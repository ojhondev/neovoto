"use client";

import type { CandidatoComparado } from "@/lib/intel/comparar";

const W = 560;
const H = 320;
const PAD = 48;

export function CompareScatter({
  candidatos,
  labels,
}: {
  candidatos: CandidatoComparado[];
  labels: { x: string; y: string; left: string; right: string };
}) {
  const withVotes = candidatos.filter((c) => c.temVoto);
  const maxLog = Math.max(...withVotes.map((c) => Math.log10(c.votos + 1)), 1);
  const minLog = Math.min(...withVotes.map((c) => Math.log10(c.votos + 1)), maxLog - 0.5);

  const sx = (eixo: number) => PAD + ((eixo + 1) / 2) * (W - 2 * PAD);
  const sy = (votos: number) => {
    const l = Math.log10(votos + 1);
    return H - PAD - ((l - minLog) / (maxLog - minLog || 1)) * (H - 2 * PAD);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[440px]" role="img">
      <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="var(--color-ash)" strokeDasharray="2 3" />
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-ash)" />
      <text x={PAD} y={H - 14} className="fill-fossil" style={{ fontSize: 11 }}>
        {labels.left}
      </text>
      <text x={W - PAD} y={H - 14} textAnchor="end" className="fill-fossil" style={{ fontSize: 11 }}>
        {labels.right}
      </text>
      <text x={12} y={PAD - 6} className="fill-fossil" style={{ fontSize: 11 }}>
        {labels.y} ↑
      </text>

      {candidatos.map((c) => {
        if (!c.temVoto) return null;
        const x = sx((c.eco + c.soc) / 2);
        const y = sy(c.votos);
        return (
          <g key={c.id}>
            <circle cx={x} cy={y} r={9} fill={c.cor} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
            <text x={x} y={y - 14} textAnchor="middle" className="fill-ink" style={{ fontSize: 10, fontWeight: 600 }}>
              {c.nome.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
