"use client";

import { Sun, Moon } from "lucide-react";
import { THEME_COOKIE, isTheme } from "@/lib/theme";

/** Alterna claro/escuro. Sem estado React: os dois ícones existem e o CSS mostra
 *  o certo por [data-theme] (mesma técnica do logo) — sem flash, sem hydration mismatch. */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const attr = root.getAttribute("data-theme");
    const current = isTheme(attr)
      ? attr
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema"
      className="rounded-none p-1.5 text-fossil transition-colors hover:text-ink"
    >
      <Moon size={16} className="theme-icon-light" />
      <Sun size={16} className="theme-icon-dark" />
    </button>
  );
}
