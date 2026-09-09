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
import Image from "next/image";
import { toolPath, type ToolId } from "@/lib/tools";
import markDark from "../../../public/brand/mark-dark.png";
import logoDark from "../../../public/brand/logo-dark.png";

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

function RailMark({ withWordmark = false }: { withWordmark?: boolean }) {
  if (withWordmark) {
    return (
      <Image
        src={logoDark}
        alt="NeoVoto"
        height={20}
        width={Math.round((logoDark.width / logoDark.height) * 20)}
        priority
      />
    );
  }
  return (
    <Image
      src={markDark}
      alt="NeoVoto"
      height={22}
      width={Math.round((markDark.width / markDark.height) * 22)}
      priority
    />
  );
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

  const groups = buildGroups(labels, toolNames, relatorioCount);

  return (
    <nav className="font-ui flex flex-1 flex-col gap-1 px-2 text-body-sm">
      {groups.map((g, gi) => (
        <div key={g.title} className={gi > 0 ? "mt-4" : ""}>
          {collapsed ? (
            gi > 0 && <div className="mx-2 my-2 h-px bg-white/10" />
          ) : (
            <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">
              {g.title}
            </p>
          )}
          {g.items.map((it) => {
            const Icon = it.icon;
            const active = isActive(it.href, it.exact);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                title={it.label}
                className={
                  "group relative flex items-center gap-2.5 rounded-none px-2.5 py-2 transition-colors " +
                  (active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/[0.06] hover:text-white") +
                  (collapsed ? " justify-center px-0" : "")
                }
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-brand" />
                )}
                <Icon
                  size={16}
                  strokeWidth={1.9}
                  className={"shrink-0 " + (active ? "text-brand" : "")}
                />
                {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                {!collapsed && it.badge ? (
                  <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold leading-4 text-[#04211a]">
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
        className="fixed left-3 top-3 z-30 rounded-none border border-line bg-surface p-2 text-ink shadow-[var(--shadow-card)] lg:hidden"
      >
        <Menu size={18} />
      </button>

      <aside
        className={
          "thin-scroll sticky top-0 hidden h-svh shrink-0 flex-col bg-rail py-4 transition-[width] duration-200 lg:flex " +
          (collapsed ? "w-[64px]" : "w-[236px]")
        }
      >
        <div className={"flex items-center px-4 pb-5 pt-1 " + (collapsed ? "justify-center px-0" : "")}>
          <RailMark withWordmark={!collapsed} />
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          <NavItems labels={labels} toolNames={toolNames} collapsed={collapsed} relatorioCount={relatorioCount} />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={labels.collapse}
          className={
            "font-ui mx-2 mt-2 flex items-center gap-2 rounded-none px-2.5 py-2 text-caption text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/80 " +
            (collapsed ? "justify-center" : "")
          }
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && labels.collapse}
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setMobileOpen(false)} />
          <div className="thin-scroll absolute inset-y-0 left-0 flex w-[264px] flex-col overflow-y-auto bg-rail py-4">
            <div className="flex items-center justify-between px-4 pb-4 pt-1">
              <RailMark withWordmark />
              <button type="button" aria-label="Fechar" onClick={() => setMobileOpen(false)} className="p-1.5 text-white/70">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-1 flex-col">
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
