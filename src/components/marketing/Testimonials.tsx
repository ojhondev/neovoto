"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";

type Item = { quote: string; name: string; role: string };

export function Testimonials({
  kicker,
  title,
  items,
  note,
}: {
  kicker: string;
  title: string;
  items: Item[];
  note: string;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.3,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !inView) return;
    const id = setInterval(() => setI((n) => (n + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [paused, inView, items.length]);

  const go = (d: number) => setI((n) => (n + d + items.length) % items.length);

  return (
    <section
      ref={wrapRef}
      className="relative z-10 bg-paper"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="w-full overflow-hidden px-5 py-24 sm:px-10 lg:px-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="t-eyebrow mb-3">{kicker}</p>
            <h2 className="t-heading-lg max-w-2xl">{title}</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="rounded-none border border-ink p-2 text-ink transition-colors hover:bg-sand"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próximo"
              className="rounded-none border border-ink p-2 text-ink transition-colors hover:bg-sand"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-12">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${i * 100}%)` }}
          >
            {items.map((t) => (
              <figure key={t.name} className="w-full shrink-0 px-1">
                <div className="max-w-3xl">
                  <Quote size={28} className="text-chartreuse" />
                  <blockquote className="mt-4 font-display text-[clamp(1.4rem,3vw,2rem)] font-light leading-snug tracking-[-0.02em] text-ink">
                    {t.quote}
                  </blockquote>
                  <figcaption className="font-ui mt-6 text-body-sm">
                    <span className="text-ink">{t.name}</span>
                    <span className="text-fossil"> — {t.role}</span>
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2">
          {items.map((_, n) => (
            <button
              key={n}
              type="button"
              aria-label={`Depoimento ${n + 1}`}
              onClick={() => setI(n)}
              className={
                "h-1.5 rounded-full transition-all " +
                (n === i ? "w-8 bg-ink" : "w-3 bg-ash")
              }
            />
          ))}
        </div>

        <p className="font-ui mt-8 text-caption text-pebble">{note}</p>
      </div>
    </section>
  );
}
