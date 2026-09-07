"use client";

import { useMemo, useRef, useState } from "react";

type FC = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: string; coordinates: unknown };
    properties: { codarea: string };
  }[];
};

type Scale = "heat" | "sequential";

const RAMP: Record<Scale, string[]> = {
  heat: ["#8a3b2f", "#c9772f", "#c9a227", "#8ba33a", "#4b5b0a"],
  sequential: ["#eef0dd", "#c3cf8a", "#8ba33a", "#4b5b0a"],
};

function lerpHex(a: string, b: string, t: number) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((x, i) => Math.round(x + (pb[i] - x) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function ramp(scale: Scale, t: number) {
  const stops = RAMP[scale];
  const x = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x);
  return lerpHex(stops[i], stops[i + 1] ?? stops[i], x - i);
}

// Web Mercator (graus → unidades de projeção)
function mercX(lon: number) {
  return lon;
}
function mercY(lat: number) {
  const s = Math.min(85, Math.max(-85, lat));
  return (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (s * Math.PI) / 360));
}

type Ring = [number, number][];
function ringsOf(geom: { type: string; coordinates: unknown }): Ring[] {
  const out: Ring[] = [];
  const push = (poly: unknown) => {
    if (!Array.isArray(poly)) return;
    for (const ring of poly as unknown[]) {
      if (Array.isArray(ring) && Array.isArray(ring[0])) {
        out.push((ring as number[][]).map(([x, y]) => [x, y]));
      }
    }
  };
  if (geom.type === "Polygon") push(geom.coordinates);
  else if (geom.type === "MultiPolygon")
    for (const p of geom.coordinates as unknown[]) push(p);
  return out;
}

function buildPaths(geojson: FC, W: number, H: number) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const projected = geojson.features.map((f) => {
    const rings = ringsOf(f.geometry).map((r) =>
      r.map(([lon, lat]) => {
        const x = mercX(lon);
        const y = mercY(lat);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        return [x, y] as [number, number];
      }),
    );
    return { code: f.properties.codarea, rings };
  });

  const pad = 16;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const s = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
  const offX = pad + (W - pad * 2 - s * spanX) / 2;
  const offY = pad + (H - pad * 2 - s * spanY) / 2;
  const tx = (x: number) => offX + (x - minX) * s;
  const ty = (y: number) => H - offY - (y - minY) * s;

  return projected.map((p) => ({
    code: p.code,
    d: p.rings
      .map(
        (r) =>
          "M" + r.map(([x, y]) => `${tx(x).toFixed(1)} ${ty(y).toFixed(1)}`).join("L") + "Z",
      )
      .join(" "),
  }));
}

export type TerritoryMapHandle = { code: string; nome: string; value: number | null };

export function TerritoryMap({
  geojson,
  valueByCode,
  nameByCode,
  metricLabel,
  formatValue = (n) => n.toLocaleString("pt-BR"),
  scale = "sequential",
  onSelect,
  height = 460,
}: {
  geojson: FC;
  valueByCode: Record<string, number>;
  nameByCode: Record<string, string>;
  metricLabel: string;
  formatValue?: (n: number) => string;
  scale?: Scale;
  onSelect?: (h: TerritoryMapHandle) => void;
  height?: number;
}) {
  const W = 800;
  const H = 620;

  const paths = useMemo(() => buildPaths(geojson, W, H), [geojson]);
  const { minV, maxV } = useMemo(() => {
    const vals = Object.values(valueByCode).filter((v) => v > 0);
    return {
      minV: vals.length ? Math.min(...vals) : 0,
      maxV: vals.length ? Math.max(...vals) : 1,
    };
  }, [valueByCode]);

  const logMin = Math.log(minV + 1);
  const logMax = Math.log(maxV + 1);
  const colorFor = (code: string) => {
    const raw = valueByCode[code];
    if (raw == null) return "var(--color-ash)";
    if (raw <= 0) return ramp(scale, 0);
    const t = logMax > logMin ? (Math.log(raw + 1) - logMin) / (logMax - logMin) : 0.5;
    return ramp(scale, t);
  };

  // pan / zoom
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ nome: string; txt: string; x: number; y: number } | null>(
    null,
  );

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setView((v) => {
      const k = Math.min(8, Math.max(1, v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      return { ...v, k };
    });
  };

  const hasData = Object.keys(valueByCode).length > 0;
  const hoverPath = hover
    ? paths.find((p) => (nameByCode[p.code] ?? p.code) === hover.nome)?.d
    : undefined;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-ash bg-map-bg">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height }}
        onWheel={onWheel}
        onMouseDown={(e) => (drag.current = { x: e.clientX - view.x, y: e.clientY - view.y })}
        onMouseUp={() => (drag.current = null)}
        onMouseMove={(e) => {
          if (drag.current) {
            setView((v) => ({ ...v, x: e.clientX - drag.current!.x, y: e.clientY - drag.current!.y }));
          }
        }}
        onMouseLeave={() => {
          drag.current = null;
          setHover(null);
        }}
        className="cursor-grab active:cursor-grabbing"
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {paths.map((p) => (
            <path
              key={p.code}
              d={p.d}
              fill={colorFor(p.code)}
              fillOpacity={0.9}
              stroke="var(--color-map-bg)"
              strokeWidth={0.5 / view.k}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                const v = valueByCode[p.code];
                setHover({
                  nome: nameByCode[p.code] ?? p.code,
                  txt: v != null ? `${formatValue(v)} · ${metricLabel}` : metricLabel,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onClick={() =>
                onSelect?.({
                  code: p.code,
                  nome: nameByCode[p.code] ?? p.code,
                  value: valueByCode[p.code] ?? null,
                })
              }
              style={{ cursor: onSelect ? "pointer" : "grab" }}
            />
          ))}
          {hoverPath && (
            <path
              d={hoverPath}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={1.4 / view.k}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-[6px] border border-ash bg-paper px-2.5 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <span className="font-ui block text-[12px] font-medium text-ink">{hover.nome}</span>
          <span className="font-ui block text-[11px] text-fossil">{hover.txt}</span>
        </div>
      )}

      <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-[6px] border border-ash bg-paper">
        <button
          type="button"
          aria-label="Aproximar"
          onClick={() => setView((v) => ({ ...v, k: Math.min(8, v.k * 1.3) }))}
          className="font-ui px-2.5 py-1 text-body-sm hover:bg-bone"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Afastar"
          onClick={() => setView({ k: 1, x: 0, y: 0 })}
          className="font-ui border-t border-ash px-2.5 py-1 text-body-sm hover:bg-bone"
        >
          −
        </button>
      </div>

      {hasData && (
        <div className="font-ui absolute bottom-3 left-3 z-10 rounded-[6px] border border-ash bg-paper/90 px-2.5 py-1.5 text-[11px] text-fossil backdrop-blur">
          <span className="mb-1 block uppercase tracking-wider text-pebble">{metricLabel}</span>
          <span className="flex items-center gap-1.5">
            {formatValue(minV)}
            <span
              className="inline-block h-2 w-20 rounded-[2px]"
              style={{
                background: `linear-gradient(90deg, ${RAMP[scale].join(", ")})`,
              }}
            />
            {formatValue(maxV)}
          </span>
        </div>
      )}
    </div>
  );
}
