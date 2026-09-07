"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type Pillar = {
  id: string;
  tab: string;
  heading: string;
  body: string;
  cta: string;
  href: string;
  panel: "territorio" | "cenario" | "propostas";
  tint: string;
};

const PANEL_BG: Record<Pillar["panel"], string> = {
  territorio: "#c9bcf5",
  cenario: "#dbf570",
  propostas: "#e7e2d7",
};

function MiniTerritorio() {
  return (
    <div className="w-full max-w-xs rounded-[12px] border border-ash bg-paper p-4">
      <p className="font-ui text-caption text-fossil">Perfil territorial</p>
      <div className="mt-3 grid grid-cols-8 gap-1">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-[2px]"
            style={{
              background: i % 5 === 0 ? "var(--color-negative)" : i % 3 === 0 ? "#c9a227" : "var(--color-olive)",
              opacity: 0.3 + ((i * 7) % 10) / 14,
            }}
          />
        ))}
      </div>
      <div className="font-ui mt-3 space-y-1.5 text-caption">
        {["Região metropolitana", "Interior norte", "Litoral"].map((r, i) => (
          <div key={r} className="flex items-center justify-between">
            <span className="text-smoke">{r}</span>
            <span className="text-fossil">prioridade {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCenario() {
  const rows = [
    { n: "Objetivo", a: 44, b: 57, m: 51 },
    { n: "Base", a: 38, b: 52, m: 45 },
    { n: "Sem coligação", a: 31, b: 44, m: 37 },
  ];
  return (
    <div className="w-full max-w-xs rounded-[12px] border border-ash bg-paper p-4">
      <p className="font-ui text-caption text-fossil">Cenário estatístico</p>
      <div className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.n}>
            <div className="font-ui mb-1 flex justify-between text-caption">
              <span>{r.n}</span>
              <span className="text-fossil">{r.a}–{r.b}%</span>
            </div>
            <div className="relative h-3 rounded-[3px] bg-sand">
              <div className="absolute inset-y-0 rounded-[3px] bg-olive/25" style={{ left: `${r.a}%`, width: `${r.b - r.a}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${r.m}%` }} />
              <div className="absolute inset-y-0 w-px bg-negative" style={{ left: "50%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniPropostas() {
  const rows = [
    { t: "Saúde", p: 82, d: 91 },
    { t: "Segurança", p: 40, d: 74 },
    { t: "Educação", p: 68, d: 63 },
    { t: "Emprego", p: 30, d: 70 },
  ];
  return (
    <div className="w-full max-w-xs rounded-[12px] border border-ash bg-paper p-4">
      <p className="font-ui text-caption text-fossil">Mapa de propostas</p>
      <div className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <div key={r.t}>
            <div className="font-ui mb-1 flex justify-between text-caption">
              <span>{r.t}</span>
              {r.d - r.p > 25 && <span className="text-negative">lacuna</span>}
            </div>
            <div className="relative h-3 rounded-[3px] bg-sand">
              <div className="absolute inset-y-0 left-0 rounded-[3px] bg-chartreuse" style={{ width: `${r.d}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-[3px] bg-ink/85" style={{ width: `${r.p}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PillarsShowcase({
  kicker,
  title,
  pillars,
  fluid = "w-full px-5 sm:px-10 lg:px-20",
}: {
  kicker: string;
  title: string;
  pillars: Pillar[];
  fluid?: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.35,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !inView) return;
    const id = setInterval(() => setActive((a) => (a + 1) % pillars.length), 4200);
    return () => clearInterval(id);
  }, [paused, inView, pillars.length]);

  const p = pillars[active];

  return (
    <section
      ref={wrapRef}
      className={`${fluid} py-24`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p className="t-eyebrow mb-3">{kicker}</p>
      <h2 className="t-heading-lg max-w-2xl">{title}</h2>

      <div className="mt-10 rounded-[var(--radius-card-lg)] border border-ash bg-paper p-6 sm:p-10">
        <div className="flex flex-wrap gap-3">
          {pillars.map((pillar, i) => (
            <button
              key={pillar.id}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              className={
                "font-display rounded-[8px] px-4 py-2 text-[clamp(1.6rem,4vw,2.6rem)] font-light tracking-[-0.03em] transition-colors " +
                (i === active ? "bg-sand text-ink" : "text-pebble hover:text-fossil")
              }
            >
              {pillar.tab}
            </button>
          ))}
        </div>

        <div key={p.id} className="mt-8 grid items-center gap-8 rise lg:grid-cols-2">
          <div>
            <h3 className="t-heading">{p.heading}</h3>
            <p className="mt-4 max-w-md text-body text-fossil">{p.body}</p>
            <Link href={p.href} className="nav-link mt-6 inline-flex items-center gap-1.5 text-[15px]">
              {p.cta} <ArrowRight size={15} />
            </Link>
          </div>
          <div
            className="flex min-h-[300px] items-center justify-center rounded-[12px] p-8"
            style={{ background: PANEL_BG[p.panel] }}
          >
            {p.panel === "territorio" && <MiniTerritorio />}
            {p.panel === "cenario" && <MiniCenario />}
            {p.panel === "propostas" && <MiniPropostas />}
          </div>
        </div>
      </div>
    </section>
  );
}
