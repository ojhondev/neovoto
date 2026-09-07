"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { TOOLS, toolPath, type ToolId } from "@/lib/tools";

export function Sidebar({
  labels,
  toolNames,
}: {
  labels: { dashboard: string; tools: string };
  toolNames: Record<ToolId, string>;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/painel" ? pathname === "/painel" : pathname.startsWith(href);

  return (
    <aside className="sticky top-0 flex h-dvh w-64 shrink-0 flex-col border-r border-ash bg-bone px-4 py-5">
      <div className="px-2">
        <Logo />
      </div>
      <nav className="font-ui mt-8 flex flex-1 flex-col gap-1 text-body-sm">
        <Link
          href="/painel"
          className={
            "flex items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors " +
            (isActive("/painel") && pathname === "/painel"
              ? "bg-sand text-ink"
              : "text-fossil hover:bg-sand/60 hover:text-ink")
          }
        >
          <LayoutDashboard size={16} strokeWidth={1.6} />
          {labels.dashboard}
        </Link>

        <p className="t-eyebrow mt-6 mb-1 px-3">{labels.tools}</p>
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const href = toolPath(tool.id);
          const active = isActive(href);
          return (
            <Link
              key={tool.id}
              href={href}
              className={
                "flex items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors " +
                (active
                  ? "bg-sand text-ink"
                  : "text-fossil hover:bg-sand/60 hover:text-ink")
              }
            >
              <Icon size={16} strokeWidth={1.6} />
              <span className="truncate">{toolNames[tool.id]}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
