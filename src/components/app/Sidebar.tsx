"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocalStorageBoolean } from "@/lib/use-local-storage";
import {
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { TOOLS, toolPath, type ToolId } from "@/lib/tools";

type Labels = {
  dashboard: string;
  tools: string;
  candidate: string;
  collapse: string;
};

function NavItems({
  labels,
  toolNames,
  collapsed,
  onNavigate,
}: {
  labels: Labels;
  toolNames: Record<ToolId, string>;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const row = (isActive: boolean) =>
    "flex items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors " +
    (isActive ? "bg-sand text-ink" : "text-fossil hover:bg-sand/60 hover:text-ink") +
    (collapsed ? " justify-center px-0" : "");

  return (
    <nav className="font-ui flex flex-1 flex-col gap-1 text-body-sm">
      <Link href="/painel" onClick={onNavigate} className={row(active("/painel", true))} title={labels.dashboard}>
        <LayoutDashboard size={16} strokeWidth={1.6} className="shrink-0" />
        {!collapsed && labels.dashboard}
      </Link>
      <Link
        href="/painel/candidato"
        onClick={onNavigate}
        className={row(active("/painel/candidato"))}
        title={labels.candidate}
      >
        <UserRound size={16} strokeWidth={1.6} className="shrink-0" />
        {!collapsed && labels.candidate}
      </Link>

      {!collapsed && <p className="t-eyebrow mt-6 mb-1 px-3">{labels.tools}</p>}
      {collapsed && <div className="my-3 h-px bg-ash" />}

      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const href = toolPath(tool.id);
        return (
          <Link
            key={tool.id}
            href={href}
            onClick={onNavigate}
            className={row(active(href))}
            title={toolNames[tool.id]}
          >
            <Icon size={16} strokeWidth={1.6} className="shrink-0" />
            {!collapsed && <span className="truncate">{toolNames[tool.id]}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  labels,
  toolNames,
}: {
  labels: Labels;
  toolNames: Record<ToolId, string>;
}) {
  const [collapsed, setCollapsed] = useLocalStorageBoolean("neovoto:sidebar", false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = () => setCollapsed(!collapsed);

  return (
    <>
      {/* Trigger mobile — flutua sobre a topbar do layout (que reserva padding à esquerda) */}
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 rounded-[8px] border border-ash bg-bone p-2 text-ink lg:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Rail desktop */}
      <aside
        className={
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-ash bg-bone px-3 py-4 transition-[width] duration-200 lg:flex " +
          (collapsed ? "w-16" : "w-64")
        }
      >
        <div className={"px-1 " + (collapsed ? "flex justify-center" : "")}>
          {collapsed ? <Logo markOnly height={22} /> : <Logo height={22} />}
        </div>
        <div className="mt-7 flex flex-1 flex-col">
          <NavItems labels={labels} toolNames={toolNames} collapsed={collapsed} />
        </div>
        <button
          type="button"
          onClick={toggle}
          title={labels.collapse}
          className="font-ui mt-2 flex items-center gap-2 rounded-[8px] px-3 py-2 text-caption text-fossil hover:bg-sand/60"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && labels.collapse}
        </button>
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-ash bg-bone px-3 py-4">
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
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
