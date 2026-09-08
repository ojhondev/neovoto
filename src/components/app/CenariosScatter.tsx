"use client";

import { useState } from "react";
import type { PontoDispersao } from "@/lib/intel/cenarios";
import { urgVar } from "@/lib/viz/colors";
import { ClipButton } from "@/components/app/ClipButton";

const W = 620;
const H = 360;
const PAD = 48;

export function CenariosScatter({
  pontos,
  labels,
  locale,
  nome,
}: {
  pontos: PontoDispersao[];
  labels: { x: string; y: string; alvo: string };
  locale: string;
  nome: string;
}) {
  const pt = locale === "pt";
  const [sel, setSel] = useState<PontoDispersao | null>(null);
  const maxShare = Math.max(...pontos.map((p) => p.share), 0.05);
  const maxGap = Math.max(...pontos.map((p) => p.gap), 1);

  const sx = (share: number) => PAD + (share / maxShare) * (W - 2 * PAD);
  const sy = (ifet: number) => H - PAD - (ifet / 100) * (H - 2 * PAD);
  const rOf = (gap: number) => 3.5 + Math.sqrt(gap / maxGap) * 14;

  // ordena por gap desc pra desenhar os pequenos por cima
  const ordenados = [...pontos].sort((a, b) => b.gap - a.gap);

  const rec = sel
    ? sel.share < 0.02
      ? pt
        ? `Em ${sel.nome} você quase não tem voto (${(sel.share * 100).toFixed(1)}%) e a prioridade territorial é ${sel.ifet}/100. ${sel.ifet >= 60 ? "Vale entrar: é um município que decide e está aberto — abra frente, articule liderança local, leve o candidato." : "Ganho pequeno: ação de baixo custo, sem deslocar o candidato."}`
        : `In ${sel.nome} you have almost no vote (${(sel.share * 100).toFixed(1)}%) and territorial priority is ${sel.ifet}/100.`
      : sel.ifet >= 55
        ? pt
          ? `${sel.nome}: você já tem ${(sel.share * 100).toFixed(1)}% e ainda há ${sel.gap.toLocaleString(locale)} votos na mesa, num município de prioridade ${sel.ifet}. É onde a campanha mais rende — concentre agenda, mídia e estrutura.`
          : `${sel.nome}: you have ${(sel.share * 100).toFixed(1)}% and ${sel.gap.toLocaleString(locale)} votes still on the table, priority ${sel.ifet}. Concentrate the campaign here.`
        : pt
          ? `${sel.nome}: ${(sel.share * 100).toFixed(1)}% de voto, prioridade ${sel.ifet}. Já é razoável e o teto está perto — defenda a posição, não gaste demais para crescer.`
          : `${sel.nome}: ${(sel.share * 100).toFixed(1)}% vote, priority ${sel.ifet}. Defend the position, don't overspend to grow.`
    : null;

  return (
    <div>
      <div className="chart-in overflow-x-auto rounded-[var(--radius-card)] border border-ash bg-map-bg p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img">
          {/* linhas-guia */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={PAD}
              y1={PAD + f * (H - 2 * PAD)}
              x2={W - PAD}
              y2={PAD + f * (H - 2 * PAD)}
              stroke="var(--color-ash)"
              strokeDasharray="1 4"
            />
          ))}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--color-ash)" />
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--color-ash)" />
          <text x={W - PAD} y={H - 14} textAnchor="end" className="fill-fossil" style={{ fontSize: 10 }}>
            {labels.x} →
          </text>
          <text x={14} y={PAD - 6} className="fill-fossil" style={{ fontSize: 10 }}>
            ↑ {labels.y}
          </text>

          {ordenados.map((p) => {
            const x = sx(p.share);
            const y = sy(p.ifet);
            const on = sel?.code === p.code;
            return (
              <circle
                key={p.code}
                cx={x}
                cy={y}
                r={rOf(p.gap)}
                fill={p.alvo ? urgVar("crit") : "var(--color-cat-1)"}
                fillOpacity={on ? 1 : p.alvo ? 0.88 : 0.38}
                stroke={on ? "var(--color-ink)" : p.alvo ? "#fff" : "none"}
                strokeWidth={on ? 2 : 1}
                className="cursor-pointer"
                onClick={() => setSel(on ? null : p)}
              >
                <title>{p.nome}</title>
              </circle>
            );
          })}
          {sel && (
            <text
              x={sx(sel.share)}
              y={sy(sel.ifet) - rOf(sel.gap) - 4}
              textAnchor="middle"
              className="fill-ink"
              style={{ fontSize: 10, fontWeight: 700 }}
            >
              {sel.nome}
            </text>
          )}
        </svg>
        <p className="font-ui mt-2 px-1 text-caption text-pebble">
          <span className="mr-3 inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: urgVar("crit") }} />
            {labels.alvo}
          </span>
          {pt
            ? "Tamanho = votos a capturar. Clique num ponto para a recomendação."
            : "Size = votes to capture. Click a point for the recommendation."}
        </p>
      </div>

      {sel && rec && (
        <div className="mt-4 rounded-[var(--radius-card)] border-l-2 border-olive bg-paper p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="t-eyebrow mb-1">{sel.nome}</p>
            <ClipButton
              item={{
                modulo: pt ? "Cenários" : "Scenarios",
                titulo: `${pt ? "Alvo:" : "Target:"} ${sel.nome}`,
                texto: rec,
              }}
            />
          </div>
          <p className="text-body-sm text-ink">{rec}</p>
          <p className="font-ui mt-2 text-caption text-pebble">
            {pt ? "voto atual" : "current vote"} {(sel.share * 100).toFixed(1)}% · IFET {sel.ifet} ·{" "}
            {pt ? "lacuna" : "gap"} {sel.gap.toLocaleString(locale)} · {nome}
          </p>
        </div>
      )}
    </div>
  );
}
