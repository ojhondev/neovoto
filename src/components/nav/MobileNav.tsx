"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type Item = { href: string; label: string };

export function MobileNav({
  items,
  ctaLabel,
  ctaHref,
  enterLabel,
}: {
  items: Item[];
  ctaLabel: string;
  ctaHref: string;
  enterLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="p-1.5 text-ink"
      >
        <Menu size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-bone">
          <div className="flex h-16 items-center justify-end px-5">
            <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="p-1.5">
              <X size={22} />
            </button>
          </div>
          <nav className="font-ui flex flex-col gap-1 px-5 pt-4">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="border-b border-ash py-4 text-heading-sm"
              >
                {it.label}
              </Link>
            ))}
            <Link
              href="/entrar"
              onClick={() => setOpen(false)}
              className="py-4 text-body"
            >
              {enterLabel}
            </Link>
            <Link
              href={ctaHref}
              onClick={() => setOpen(false)}
              className="btn btn-primary mt-4 justify-center"
            >
              {ctaLabel}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
