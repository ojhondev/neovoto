"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Dict = {
  title: string;
  sub: string;
  steps: readonly string[];
  ready: string;
  openPanel: string;
};

/**
 * Interstício animado entre o onboarding e o painel. Enquanto o servidor aquece
 * os caches do Motor NeoVoto (`/api/preparar`), a tela mostra uma rede de nós
 * (o "algoritmo"), a marca pulsando e uma barra 0→100%. O progresso é encenado
 * numa curva suave que trava perto do fim até a chamada real resolver — aí
 * completa e navega. `prefers-reduced-motion` desliga a animação de partículas.
 */
export function PreparandoScreen({ dict }: { dict: Dict }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const readyRef = useRef(false);

  // ---- aquece o servidor + libera a conclusão da barra ----
  useEffect(() => {
    const started = Date.now();
    const MIN_MS = 3200;
    let cancelled = false;

    const finish = () => {
      if (cancelled || doneRef.current) return;
      doneRef.current = true;
      setDone(true);
      setPct(100);
      window.setTimeout(() => {
        if (!cancelled) router.replace("/painel");
      }, 650);
    };

    fetch("/api/preparar", { cache: "no-store" })
      .catch(() => {})
      .finally(() => {
        readyRef.current = true;
        window.setTimeout(finish, Math.max(0, MIN_MS - (Date.now() - started)));
      });

    const hard = window.setTimeout(finish, 20000);
    return () => {
      cancelled = true;
      window.clearTimeout(hard);
    };
  }, [router]);

  // ---- curva de progresso encenada ----
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(120, now - last) / 1000;
      last = now;
      setPct((p) => {
        if (doneRef.current) return 100;
        const ceil = readyRef.current ? 99 : 92;
        if (p >= ceil) return p;
        const speed = (ceil - p) * 0.55 + 3.5;
        return Math.min(ceil, p + speed * dt);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- rede de nós no canvas ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    type Node = { x: number; y: number; vx: number; vy: number; r: number };
    let nodes: Node[] = [];

    const seed = () => {
      const count = Math.round(Math.min(110, Math.max(44, (w * h) / 17000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16,
        r: Math.random() * 1.9 + 1.4,
      }));
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        canvas.clientWidth ||
        1;
      h =
        window.innerHeight ||
        document.documentElement.clientHeight ||
        canvas.clientHeight ||
        1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };
    resize();
    requestAnimationFrame(resize);
    window.addEventListener("resize", resize);

    const LINK = 150;
    let last = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const dt = reduce ? 0 : Math.min(60, now - last) / 1000;
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x <= 0 || n.x >= w) n.vx *= -1;
        if (n.y <= 0 || n.y >= h) n.vy *= -1;
        n.x = Math.max(0, Math.min(w, n.x));
        n.y = Math.max(0, Math.min(h, n.y));
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK) {
            const alpha = (1 - d / LINK) * 0.85;
            ctx.strokeStyle = `rgba(198, 228, 108, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ctx.shadowColor = "rgba(219, 245, 112, 0.85)";
      ctx.shadowBlur = 7;
      for (const n of nodes) {
        ctx.fillStyle = "rgba(247, 246, 242, 0.95)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";

      if (reduce) return;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const shown = Math.round(pct);
  const steps = dict.steps.length ? dict.steps : [dict.title];
  const stepIdx = done
    ? steps.length - 1
    : Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));
  const R = 52;
  const CIRC = 2 * Math.PI * R;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 60,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(125% 85% at 50% 0%, #23231c 0%, #17150f 55%, #100f0a 100%)",
        color: "#f5f4f0",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(56% 46% at 50% 50%, rgba(16,15,10,0.5) 0%, rgba(16,15,10,0.1) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "min(92vw, 30rem)",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div
          className={done ? "prep-mark prep-mark-done" : "prep-mark"}
          style={{
            display: "inline-flex",
            filter: "drop-shadow(0 0 26px rgba(219, 245, 112, 0.3))",
          }}
        >
          <svg width="128" height="128" viewBox="0 0 128 128" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="prepG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#dbf570" />
                <stop offset="1" stopColor="#a9c93f" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r={R} stroke="rgba(245,244,240,0.14)" strokeWidth="4" />
            <circle
              cx="64"
              cy="64"
              r={R}
              stroke="url(#prepG)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - pct / 100)}
              transform="rotate(-90 64 64)"
              style={{ transition: "stroke-dashoffset 120ms linear" }}
            />
            <g className="prep-glyph" style={{ transformOrigin: "64px 64px" }}>
              <rect x="42" y="42" width="44" height="44" rx="7" fill="#f5f4f0" />
              <ellipse cx="64" cy="64" rx="9" ry="17" transform="rotate(-32 64 64)" fill="#1c1c1c" />
            </g>
          </svg>
        </div>

        <div
          style={{
            marginTop: "1.4rem",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: "3.5rem", fontWeight: 300, letterSpacing: "-0.03em" }}>
            {shown}
          </span>
          <span style={{ fontSize: "1.4rem", fontWeight: 300, color: "#dbf570", marginLeft: "0.15rem" }}>
            %
          </span>
        </div>

        <h1
          style={{
            margin: "1.1rem 0 0",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontWeight: 300,
            fontSize: "1.5rem",
            letterSpacing: "-0.02em",
            color: "#f5f4f0",
          }}
        >
          {dict.title}
        </h1>
        <p
          style={{
            margin: "0.55rem 0 0",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "0.9rem",
            lineHeight: 1.5,
            color: "rgba(245, 244, 240, 0.62)",
          }}
        >
          {dict.sub}
        </p>

        <div
          style={{
            margin: "1.6rem auto 0",
            height: 3,
            width: "100%",
            borderRadius: 3,
            background: "rgba(245, 244, 240, 0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 3,
              width: `${pct}%`,
              background: "linear-gradient(90deg, #a9c93f, #dbf570)",
              transition: "width 140ms linear",
            }}
          />
        </div>

        <p
          key={done ? "ready" : stepIdx}
          className="prep-step"
          style={{
            margin: "0.85rem 0 0",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: "0.8rem",
            color: "rgba(245, 244, 240, 0.5)",
            minHeight: "1.2em",
          }}
        >
          {done ? dict.ready : steps[stepIdx]}
        </p>
      </div>
    </div>
  );
}
