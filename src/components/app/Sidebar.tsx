"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";
import {
  LayoutDashboard,
  Trophy,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  UserRound,
  FileText,
  Flame,
  Network,
  MessageSquareText,
  LayoutGrid,
  Sigma,
  Handshake,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { toolPath, type ToolId } from "@/lib/tools";

type Labels = {
  dashboard: string;
  comoGanhar: string;
  concorrentes: string;
  relatorio: string;
  candidate: string;
  collapse: string;
  partidos: string;
  groupOverview: string;
  groupTerritory: string;
  groupPositioning: string;
  groupProjection: string;
};

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number };

function buildGroups(labels: Labels, toolNames: Record<ToolId, string>, relatorioCount: number) {
  const tool = (id: ToolId, icon: LucideIcon): Item => ({
    href: toolPath(id),
    label: toolNames[id],
    icon,
  });
  return [
    {
      title: labels.groupOverview,
      items: [
        { href: "/painel", label: labels.dashboard, icon: LayoutDashboard, exact: true },
        { href: "/painel/como-ganhar", label: labels.comoGanhar, icon: Trophy },
        { href: "/painel/concorrentes", label: labels.concorrentes, icon: Users },
        { href: "/painel/relatorio", label: labels.relatorio, icon: FileText, badge: relatorioCount || undefined },
        { href: "/painel/candidato", label: labels.candidate, icon: UserRound },
      ] as Item[],
    },
    {
      title: labels.groupTerritory,
      items: [tool("mapa-de-calor", Flame), tool("mapa-de-influencia", Network)],
    },
    {
      title: labels.groupPositioning,
      items: [
        tool("mapa-de-propostas", MessageSquareText),
        tool("matriz-ideologica", LayoutGrid),
        { href: "/painel/partidos", label: labels.partidos, icon: Landmark },
      ],
    },
    {
      title: labels.groupProjection,
      items: [tool("cenarios", Sigma), tool("coligacoes", Handshake)],
    },
  ];
}

function NavItems({
  labels,
  toolNames,
  collapsed,
  onNavigate,
  relatorioCount,
}: {
  labels: Labels;
  toolNames: Record<ToolId, string>;
  collapsed: boolean;
  onNavigate?: () => void;
  relatorioCount: number;
}) {
  const pathname = usePathname();
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const row = (active: boolean) =>
    "flex items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors " +
    (active ? "bg-sand text-ink" : "text-fossil hover:bg-sand/60 hover:text-ink") +
    (collapsed ? " justify-center px-0" : "");

  const groups = buildGroups(labels, toolNames, relatorioCount);

  return (
    <nav className="font-ui flex flex-1 flex-col gap-1 text-body-sm">
      {groups.map((g, gi) => (
        <div key={g.title} className={gi > 0 ? "mt-5" : ""}>
          {collapsed ? (
            gi > 0 && <div className="mx-2 my-2 h-px bg-ash" />
          ) : (
            <p className="t-eyebrow mb-1 px-3">{g.title}</p>
          )}
          {g.items.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                className={row(isActive(it.href, it.exact))}
                title={it.label}
              >
                <Icon size={16} strokeWidth={1.6} className="shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                {!collapsed && it.badge ? (
                  <span className="font-ui rounded-full bg-olive px-1.5 text-[10px] leading-4 text-white">
                    {it.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({
  labels,
  toolNames,
  relatorioCount = 0,
}: {
  labels: Labels;
  toolNames: Record<ToolId, string>;
  relatorioCount?: number;
}) {
  const [collapsed, setCollapsed] = useLocalStorageBoolean("neovoto:sidebar", false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 rounded-[8px] border border-ash bg-bone p-2 text-ink lg:hidden"
      >
        <Menu size={18} />
      </button>

      <aside
        className={
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-ash bg-bone px-3 py-4 transition-[width] duration-200 lg:flex " +
          (collapsed ? "w-16" : "w-64")
        }
      >
        <div className={"px-1 " + (collapsed ? "flex justify-center" : "")}>
          {collapsed ? <Logo markOnly height={22} /> : <Logo height={22} />}
        </div>
        <div className="mt-7 flex flex-1 flex-col overflow-y-auto">
          <NavItems labels={labels} toolNames={toolNames} collapsed={collapsed} relatorioCount={relatorioCount} />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={labels.collapse}
          className="font-ui mt-2 flex items-center gap-2 rounded-[8px] px-3 py-2 text-caption text-fossil hover:bg-sand/60"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && labels.collapse}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto border-r border-ash bg-bone px-3 py-4">
            <div className="flex items-center justify-between px-1">
              <Logo height={22} />
              <button type="button" aria-label="Fechar" onClick={() => setMobileOpen(false)} className="p-1.5">
                <X size={20} />
              </button>
            </div>
            <div className="mt-6 flex flex-1 flex-col">
              <NavItems
                labels={labels}
                toolNames={toolNames}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
                relatorioCount={relatorioCount}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
