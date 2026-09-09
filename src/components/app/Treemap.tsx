"use client";

import { useState } from "react";

export type TreeNode = {
  label: string;
  value: number;
  color: string;
  sub?: string;
  /** id opaco (ex.: código do município) devolvido no onSelect */
  id?: string;
};

export type TreeGroup = {
  label: string;
  nodes: TreeNode[];
};

type Rect = { x: number; y: number; w: number; h: number };

/** squarified treemap — minimiza a razão de aspecto dos retângulos */
function squarify(values: number[], rect: Rect): Rect[] {
  const out: Rect[] = new Array(values.length);
  const total = values.reduce((s, v) => s + v, 0) || 1;
  const scale = (rect.w * rect.h) / total;
  const areas = values.map((v) => v * scale);

  let { x, y, w, h } = rect;
  let i = 0;
  while (i < areas.length) {
    const vertical = w >= h;
    const side = vertical ? h : w;
    let row: number[] = [];
    let rowSum = 0;
    let worst = Infinity;
    let j = i;
    for (; j < areas.length; j++) {
      const next = [...row, areas[j]];
      const nextSum = rowSum + areas[j];
      const mx = Math.max(...next);
      const mn = Math.min(...next);
      const nextWorst = Math.max((side * side * mx) / (nextSum * nextSum), (nextSum * nextSum) / (side * side * mn));
      if (nextWorst > worst && row.length > 0) break;
      row = next;
      rowSum = nextSum;
      worst = nextWorst;
    }
    const len = rowSum / side;
    let off = 0;
    for (let k = 0; k < row.length; k++) {
      const cell = row[k] / len;
      out[i + k] = vertical
        ? { x, y: y + off, w: len, h: cell }
        : { x: x + off, y, w: cell, h: len };
      off += cell;
    }
    if (vertical) {
      x += len;
      w -= len;
    } else {
      y += len;
      h -= len;
    }
    i += row.length;
  }
  return out;
}

export function Treemap({
  groups,
  width = 720,
  height = 460,
  locale,
  onSelect,
  selectedId,
  hint,
}: {
  groups: TreeGroup[];
  width?: number;
  height?: number;
  locale: string;
  onSelect?: (node: TreeNode) => void;
  selectedId?: string | null;
  hint?: string;
}) {
  const [hover, setHover] = useState<(TreeNode & { grupo: string }) | null>(null);

  const groupTotals = groups.map((g) => g.nodes.reduce((s, n) => s + n.value, 0));
  const groupRects = squarify(groupTotals, { x: 0, y: 0, w: width, h: height });

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="chart-in overflow-x-auto rounded-[var(--radius-card)] border border-ash bg-map-bg p-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[520px]" role="img">
          {groups.map((g, gi) => {
            const gr = groupRects[gi];
            if (!gr || gr.w < 1 || gr.h < 1) return null;
            const pad = 2;
            const inner = { x: gr.x + pad, y: gr.y + 16, w: Math.max(1, gr.w - pad * 2), h: Math.max(1, gr.h - 16 - pad) };
            const cells = squarify(g.nodes.map((n) => n.value), inner);
            return (
              <g key={g.label}>
                <rect x={gr.x} y={gr.y} width={gr.w} height={gr.h} fill="none" stroke="var(--color-ash)" />
                <text x={gr.x + 5} y={gr.y + 12} className="fill-fossil" style={{ fontSize: 10, fontWeight: 600 }}>
                  {g.label}
                </text>
                {g.nodes.map((nn, ni) => {
                  const c = cells[ni];
                  if (!c || c.w < 1 || c.h < 1) return null;
                  return (
                    <g
                      key={nn.label + ni}
                      onMouseEnter={() => setHover({ ...nn, grupo: g.label })}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => onSelect?.(nn)}
                      style={{ cursor: onSelect ? "pointer" : "default" }}
                    >
                      <rect
                        x={c.x}
                        y={c.y}
                        width={Math.max(0, c.w - 0.7)}
                        height={Math.max(0, c.h - 0.7)}
                        fill={nn.color}
                        fillOpacity={hover?.label === nn.label ? 1 : 0.82}
                        stroke={
                          selectedId != null && nn.id === selectedId
                            ? "var(--color-ink)"
                            : "transparent"
                        }
                        strokeWidth={1.5}
                      />
                      {c.w > 44 && c.h > 16 && (
                        <text x={c.x + 3} y={c.y + 11} className="fill-white" style={{ fontSize: 9 }}>
                          {nn.label.length > c.w / 5 ? nn.label.slice(0, Math.floor(c.w / 5)) + "…" : nn.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="font-ui self-start text-body-sm">
        {hover ? (
          <div className="rounded-none border border-ash bg-paper p-3">
            <p className="text-body text-ink">{hover.label}</p>
            <p className="mt-1 text-caption text-fossil">{hover.grupo}</p>
            {hover.sub && <p className="text-caption text-fossil">{hover.sub}</p>}
            <p className="text-caption text-pebble">{Math.round(hover.value).toLocaleString(locale)}</p>
          </div>
        ) : (
          <p className="text-caption text-pebble">
            {hint ??
              (locale === "pt"
                ? "Cada retângulo é um município; o tamanho é a população. Passe o mouse para ver."
                : "Each rectangle is a municipality; size is population. Hover to see.")}
          </p>
        )}
      </div>
    </div>
  );
}
