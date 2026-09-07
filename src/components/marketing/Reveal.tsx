"use client";

import { useEffect, useRef } from "react";

/** Fade-and-rise ao entrar no viewport (~240ms). Respeita prefers-reduced-motion.
 *  Sem estado React: alterna o estilo direto no nó para evitar cascata de renders. */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  as?: React.ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      return;
    }

    el.style.transition = `opacity 240ms ease-out ${delay}ms, transform 240ms ease-out ${delay}ms`;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <Tag ref={ref} className={className} style={{ opacity: 0, transform: "translateY(12px)" }}>
      {children}
    </Tag>
  );
}
