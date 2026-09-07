"use client";

import { useEffect, useRef } from "react";
import { WORLD_ROWS, WORLD_COLS, WORLD_LINES } from "@/lib/worldmap";

type P = {
  sx: number; // posição espalhada (fração do viewport 0..1)
  sy: number;
  size: number;
  // alvo na esfera (coords unitárias, antes da rotação)
  gx: number;
  gy: number;
  gz: number;
  land: boolean;
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
  // 1 partícula por célula de terra + amostragem esparsa de água/atmosfera
  for (let row = 0; row < WORLD_LINES; row++) {
    const line = WORLD_ROWS[row];
    for (let col = 0; col < WORLD_COLS; col++) {
      const land = line[col] === "#";
      if (!land && (col + row) % 3 !== 0) continue; // água: ~1/3 da grade
      const lon = (col / WORLD_COLS) * Math.PI * 2 - Math.PI;
      const lat = Math.PI / 2 - (row / (WORLD_LINES - 1)) * Math.PI;
      const cl = Math.cos(lat);
      list.push({
        sx: Math.random(),
        sy: Math.random(),
        size: land ? 2.6 + Math.random() * 2.4 : 1.8 + Math.random() * 1.4,
        gx: cl * Math.sin(lon),
        gy: Math.sin(lat),
        gz: cl * Math.cos(lon),
        land,
      });
    }
  }
  // alguns quadrados maiores dispersos (eco do hero)
  for (let i = 0; i < 26; i++) {
    const lon = Math.random() * Math.PI * 2;
    const lat = (Math.random() - 0.5) * Math.PI;
    const cl = Math.cos(lat);
    list.push({
      sx: Math.random(),
      sy: Math.random(),
      size: 6 + Math.random() * 10,
      gx: cl * Math.sin(lon),
      gy: Math.sin(lat),
      gz: cl * Math.cos(lon),
      land: Math.random() > 0.5,
    });
  }
  return list;
}

export function ScrollGlobe({
  title,
  subtitle,
  scrollCue,
}: {
  title: [string, string];
  subtitle: string;
  scrollCue: string;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headlineRef = useRef<HTMLDivElement | null>(null);
  const cueRef = useRef<HTMLDivElement | null>(null);
  const progress = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = buildParticles();
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      progress.current = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
    };
    readProgress();

    const draw = (time: number) => {
      const p = reduce ? 1 : progress.current;
      const formed = easeInOut(smoothstep(0.04, 0.82, p));
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h * 0.46;
      const R = Math.min(w, h) * (w < 640 ? 0.4 : 0.34);
      const rot = (reduce ? 0.6 : p * 1.7) + time * 0.00004;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);

      // brilho de fundo quando formado
      if (formed > 0.05) {
        const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
        g.addColorStop(0, `rgba(219,245,112,${0.16 * formed})`);
        g.addColorStop(1, "rgba(219,245,112,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      for (const pt of particles) {
        // rotação em Y
        const rx = pt.gx * cosR + pt.gz * sinR;
        const rz = -pt.gx * sinR + pt.gz * cosR;
        const ry = pt.gy;
        const gpx = cx + rx * R;
        const gpy = cy - ry * R;

        const spx = pt.sx * w;
        const spy = pt.sy * h;

        const x = spx + (gpx - spx) * formed;
        const y = spy + (gpy - spy) * formed;

        // profundidade: frente (rz>0) mais forte
        const depth = (rz + 1) / 2;
        let alpha: number;
        if (pt.land) {
          alpha = 0.25 + depth * 0.7;
        } else {
          alpha = 0.06 + depth * 0.16;
        }
        // no espalhamento, opacidade baixa e uniforme
        alpha = 0.14 + (alpha - 0.14) * formed;

        // esmaece atrás do headline quando formado
        if (formed > 0.4) {
          const dxh = (x - cx) / (w * 0.42);
          const dyh = (y - cy) / (h * 0.16);
          if (dxh * dxh + dyh * dyh < 1) alpha *= 0.28;
        }

        const s = pt.size * (0.7 + depth * 0.5);
        ctx.fillStyle = `rgba(219,245,112,${alpha.toFixed(3)})`;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }

      if (headlineRef.current) {
        const o = reduce ? 1 : smoothstep(0.5, 0.92, p);
        headlineRef.current.style.opacity = String(o);
        headlineRef.current.style.transform = `translateY(${(1 - o) * 18}px)`;
      }
      if (cueRef.current) {
        cueRef.current.style.opacity = String(reduce ? 0 : 1 - smoothstep(0.6, 0.95, p));
      }

      raf = requestAnimationFrame(draw);
    };

    const onScroll = () => readProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative z-0 h-[240vh]">
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
        <div
          ref={headlineRef}
          className="relative z-10 mx-auto max-w-3xl px-5 text-center"
          style={{ opacity: 0 }}
        >
          <h2 className="t-display">
            {title[0]}
            <br />
            <span className="mark">{title[1]}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-body text-fossil">{subtitle}</p>
        </div>
        <div
          ref={cueRef}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <span className="font-ui inline-flex items-center gap-2 rounded-[8px] border border-ink/30 bg-bone/70 px-3 py-1.5 text-body-sm backdrop-blur">
            {scrollCue}
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2 4l4 4 4-4" stroke="currentColor" fill="none" strokeWidth="1.5" />
            </svg>
          </span>
        </div>
      </div>
    </section>
  );
}
