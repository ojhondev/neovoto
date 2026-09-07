"use client";

import { useEffect, useRef } from "react";
import { WORLD_ROWS, WORLD_COLS, WORLD_LINES } from "@/lib/worldmap";

type P = {
  sx: number;
  sy: number;
  size: number;
  gx: number;
  gy: number;
  gz: number;
  land: boolean;
  drift: number;
};

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function buildParticles(): P[] {
  const list: P[] = [];
  const add = (lonDeg: number, latDeg: number, land: boolean, size: number) => {
    const lon = (lonDeg * Math.PI) / 180;
    const lat = (latDeg * Math.PI) / 180;
    const cl = Math.cos(lat);
    list.push({
      sx: Math.random(),
      sy: Math.random(),
      size,
      gx: cl * Math.sin(lon),
      gy: Math.sin(lat),
      gz: cl * Math.cos(lon),
      land,
      drift: Math.random() * Math.PI * 2,
    });
  };
  for (let row = 0; row < WORLD_LINES; row++) {
    const line = WORLD_ROWS[row];
    for (let col = 0; col < WORLD_COLS; col++) {
      const land = line[col] === "#";
      const lon0 = (col / WORLD_COLS) * 360 - 180;
      const lat0 = 90 - (row / (WORLD_LINES - 1)) * 180;
      const step = 360 / WORLD_COLS;
      const n = land ? 3 : (col + row) % 2 === 0 ? 1 : 0;
      for (let k = 0; k < n; k++) {
        add(
          lon0 + (Math.random() - 0.5) * step,
          lat0 + (Math.random() - 0.5) * step,
          land,
          land ? 2.2 + Math.random() * 2.4 : 1.6 + Math.random() * 1.4,
        );
      }
    }
  }
  for (let i = 0; i < 34; i++) {
    add(Math.random() * 360 - 180, (Math.random() - 0.5) * 160, Math.random() > 0.4, 6 + Math.random() * 12);
  }
  return list;
}

/**
 * Campo de partículas que se aglomeram formando o planeta ao rolar.
 * Envolve as seções de topo (hero + globo). O canvas é `sticky` DENTRO desse
 * wrapper — nunca vaza para as seções seguintes (que ficam opacas por cima).
 */
export function ParticleField({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const particles = buildParticles();
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const progress = () => {
      const r = wrap.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    };

    const draw = (time: number) => {
      const p = reduce ? 0.55 : progress();
      const appear = smoothstep(0.0, 0.16, p);
      const formed = easeInOut(smoothstep(0.14, 0.66, p));
      const fade = 1 - smoothstep(0.8, 1.0, p);
      const visible = appear * fade;

      ctx.clearRect(0, 0, w, h);
      if (visible <= 0.003) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const cx = w / 2;
      const cy = h * 0.5;
      const R = Math.min(w, h) * (w < 720 ? 0.44 : 0.4);
      const rot = (reduce ? 0.4 : p * 2) + time * 0.00003;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);

      if (formed > 0.06) {
        const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 1.6);
        g.addColorStop(0, `rgba(219,245,112,${(0.13 * formed * visible).toFixed(3)})`);
        g.addColorStop(1, "rgba(219,245,112,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      for (const pt of particles) {
        const rx = pt.gx * cosR + pt.gz * sinR;
        const rz = -pt.gx * sinR + pt.gz * cosR;
        const gpx = cx + rx * R;
        const gpy = cy - pt.gy * R;

        const drift = reduce ? 0 : Math.sin(time * 0.0004 + pt.drift) * 6;
        const spx = pt.sx * w + drift;
        const spy = pt.sy * h + Math.cos(time * 0.0003 + pt.drift) * 6;

        const x = spx + (gpx - spx) * formed;
        const y = spy + (gpy - spy) * formed;

        const depth = (rz + 1) / 2;
        let alpha = pt.land ? 0.4 + depth * 0.55 : 0.14 + depth * 0.26;
        alpha = (0.16 + (alpha - 0.16) * formed) * visible;

        const s = pt.size * (0.7 + depth * 0.5);
        ctx.fillStyle = `rgba(219,245,112,${alpha.toFixed(3)})`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      raf = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none sticky top-0 left-0 z-0 block h-[100svh] w-full"
        style={{ marginBottom: "-100svh" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
