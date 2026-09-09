import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  UserRound,
  Sparkles,
  ClipboardCheck,
  Crosshair,
  ListChecks,
  Activity,
  Database,
  ShieldCheck,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { TOOLS } from "@/lib/tools";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { analisarCandidatura, type NivelProntidao } from "@/lib/intel/motor";
import { getIfetResumoUF, getIfetResumoNacional } from "@/lib/territory";
import { escopoNacional } from "@/lib/escopo";
import type { Cargo } from "@/lib/cargos";
import { FICHAS, type StatusFicha } from "@/lib/intel/fichas";
import { Donut, Stepper, Sparkline, type Step } from "@/components/app/DashboardViz";

export const metadata: Metadata = { title: "Painel" };

const NIVEL_PILL: Record<NivelProntidao, string> = {
  critico: "pill-danger",
  atencao: "pill-warn",
  competitivo: "pill-info",
  favoravel: "pill-ok",
};
const NIVEL_BAR: Record<NivelProntidao, string> = {
  critico: "var(--color-danger)",
  atencao: "var(--color-warn)",
  competitivo: "var(--color-info)",
  favoravel: "var(--color-brand)",
};

const STATUS_PILL: Record<StatusFicha, string> = {
  validado: "pill-ok",
  calibrado: "pill-brand",
  heuristico: "pill-warn",
};
function statusLabel(s: StatusFicha, pt: boolean) {
  return pt
    ? { validado: "Validado", calibrado: "Calibrado", heuristico: "Heurístico" }[s]
    : { validado: "Validated", calibrado: "Calibrated", heuristico: "Heuristic" }[s];
}

/** módulos do painel na ordem de leitura + a ficha que os classifica */
const MODULOS: { href: string; fichaKey: string; toolKey?: (typeof TOOLS)[number]["key"] }[] = [
  { href: "/painel/mapa-de-calor", fichaKey: "ifet", toolKey: "influenceHeatmap" },
  { href: "/painel/mapa-de-influencia", fichaKey: "influencia", toolKey: "influenceMap" },
  { href: "/painel/matriz-ideologica", fichaKey: "matriz", toolKey: "ideologicalMatrix" },
  { href: "/painel/mapa-de-propostas", fichaKey: "radar", toolKey: "proposalMap" },
  { href: "/painel/partidos", fichaKey: "partidos" },
  { href: "/painel/cenarios", fichaKey: "cenarios", toolKey: "scenarios" },
  { href: "/painel/coligacoes", fichaKey: "coligacoes", toolKey: "coalitions" },
];

export default async function PainelHome() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  if (!candidacy || !perfil) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-none border border-line bg-surface text-brand">
          <Sparkles size={20} />
        </span>
        <h1 className="t-heading-lg mt-5">{t.dash.emptyTitle}</h1>
        <p className="mx-auto mt-3 max-w-md text-body text-muted">{t.dash.emptyBody}</p>
        <Link href="/onboarding" className="btn btn-primary mt-6">
          {t.dash.emptyCta} <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const cargo = (candidacy.cargo as Cargo | null) ?? perfil.cargo ?? null;
  const nacional = escopoNacional(cargo);

  const [leitura, resumo] = await Promise.all([
    analisarCandidatura(candidacy, perfil, t, pt ? "pt" : "en"),
    (nacional
      ? getIfetResumoNacional(candidacy.id)
      : perfil.uf
        ? getIfetResumoUF(perfil.uf, candidacy.id)
        : Promise.resolve(null)
    ).catch(() => null),
  ]);

  const objectiveLabel =
    t.onboarding.objectives.find((o) => o.value === candidacy.objective)?.label ?? candidacy.objective;

  const nivel = leitura.prontidao.nivel;
  const un = nacional ? (pt ? "UFs" : "states") : pt ? "municípios" : "municipalities";

  // ---- distribuição territorial (donut) ----
  const munis = resumo?.ifet.municipios ?? [];
  const q = (name: string) => munis.filter((m) => m.quadrante === name).length;
  const modoCandidato = resumo?.ifet.modo === "candidato";
  const donutSegs = modoCandidato
    ? [
        { label: pt ? "Prioridade" : "Priority", value: q("prioridade"), color: "var(--color-q-priority)" },
        { label: pt ? "Expansão" : "Expansion", value: q("expansao"), color: "var(--color-q-expansion)" },
        { label: pt ? "Reduto" : "Stronghold", value: q("reduto"), color: "var(--color-q-stronghold)" },
        { label: pt ? "Fora do alcance" : "Out of reach", value: q("fora"), color: "var(--color-q-out)" },
      ].filter((s) => s.value > 0)
    : [
        { label: pt ? "Dimensões ok" : "Dimensions ok", value: leitura.dimensoes.filter((d) => d.status === "ok").length, color: "var(--color-q-priority)" },
        { label: pt ? "Em atenção" : "Needs attention", value: leitura.dimensoes.filter((d) => d.status === "atencao").length, color: "var(--color-q-expansion)" },
        { label: pt ? "Pendentes" : "Pending", value: leitura.dimensoes.filter((d) => d.status === "pendente").length, color: "var(--color-q-out)" },
      ].filter((s) => s.value > 0);
  const donutTotal = donutSegs.reduce((s, x) => s + x.value, 0);

  // ---- prontidão por dimensão ----
  const DIM_PILL: Record<string, string> = {
    ok: "pill-ok",
    atencao: "pill-warn",
    pendente: "pill-neutral",
  };
  const dimStatusLabel = (s: string) =>
    pt
      ? { ok: "No rumo", atencao: "Atenção", pendente: "Pendente" }[s] ?? s
      : { ok: "On track", atencao: "Attention", pendente: "Pending" }[s] ?? s;

  // ---- KPIs ----
  const territorioDim = leitura.dimensoes.find((d) => d.chave === "territorio");
  const posDim = leitura.dimensoes.find((d) => d.chave === "posicionamento");
  const prioridadeCount = modoCandidato ? q("prioridade") : territorioDim?.valor ?? "—";

  // ---- stepper ----
  const steps: Step[] = [
    {
      title: pt ? "Captura" : "Intake",
      sub: perfil.nome,
      state: "done",
      icon: ClipboardCheck,
    },
    {
      title: pt ? "Base do candidato" : "Candidate base",
      sub: modoCandidato
        ? pt
          ? `Alcance calibrado${resumo?.base?.ancora ? ` · ${resumo.base.ancora.nome}` : ""}`
          : "Reach calibrated"
        : pt
          ? "Ação: informe o domicílio eleitoral"
          : "Action: set the electoral domicile",
      state: modoCandidato ? "done" : "current",
      icon: Crosshair,
    },
    {
      title: pt ? "Diagnóstico do Motor" : "Engine assessment",
      sub: pt
        ? `Prontidão ${leitura.prontidao.score} · ${t.motor[nivel]}`
        : `Readiness ${leitura.prontidao.score} · ${t.motor[nivel]}`,
      state: "done",
      icon: Sparkles,
    },
    {
      title: pt ? "Plano de ação" : "Action plan",
      sub: pt
        ? `${leitura.acoes.length} ${leitura.acoes.length === 1 ? "ação prioritária" : "ações prioritárias"}`
        : `${leitura.acoes.length} priority actions`,
      state: modoCandidato ? "current" : "pending",
      icon: ListChecks,
    },
    {
      title: pt ? "Monitoramento" : "Monitoring",
      sub: pt ? "Contínuo, a cada nova ingestão" : "Continuous, on every ingest",
      state: "pending",
      icon: Activity,
    },
  ];

  // ---- feed de atividade ----
  const refreshed = new Date(candidacy.refreshedAt);
  const feed = [
    {
      icon: Database,
      title: pt ? "Dados oficiais vinculados" : "Official data linked",
      sub: pt
        ? `TSE, IBGE e Câmara para ${perfil.nome} — ${refreshed.toLocaleDateString(locale)}`
        : `TSE, IBGE and Chamber for ${perfil.nome} — ${refreshed.toLocaleDateString(locale)}`,
    },
    {
      icon: Sparkles,
      title: pt ? "Motor recalculado" : "Engine recalculated",
      sub: pt
        ? `${leitura.sinaisAnalisados.toLocaleString(locale)} sinais cruzados de ${leitura.fontes.length} fontes`
        : `${leitura.sinaisAnalisados.toLocaleString(locale)} signals from ${leitura.fontes.length} sources`,
    },
    {
      icon: ShieldCheck,
      title: pt ? "Conformidade LGPD" : "LGPD compliance",
      sub: pt
        ? "Apenas dados agregados e de agentes públicos"
        : "Aggregated and public-official data only",
    },
  ];

  const sparkPoints = [42, 45, 43, 49, 52, 50, 56, leitura.prontidao.score];

  return (
    <div className="space-y-5">
      {/* -------- New-data banner -------- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
        <span className="pill pill-ok">{pt ? "Novos dados" : "New data"}</span>
        <p className="min-w-0 flex-1 text-body-sm text-body">
          {pt
            ? `Dados oficiais foram vinculados a ${perfil.nome}. Revise o diagnóstico e confirme os controles.`
            : `Official data has been linked to ${perfil.nome}. Review the assessment and confirm controls.`}
        </p>
        <Link href="/painel/candidato" className="nav-link shrink-0 text-body-sm font-medium text-brand-ink">
          {pt ? "Revisar" : "Review"} <ArrowRight size={13} className="inline" />
        </Link>
      </div>

      {/* -------- Candidate header -------- */}
      <div className="card flex flex-wrap items-center gap-4">
        {perfil.foto ? (
          <Image
            src={perfil.foto}
            alt={perfil.nome}
            width={52}
            height={66}
            unoptimized
            className="h-[66px] w-[52px] shrink-0 rounded-none border border-line object-cover"
          />
        ) : (
          <span className="grid h-[66px] w-[52px] shrink-0 place-items-center rounded-none border border-line bg-sand">
            <UserRound size={22} className="text-faint" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="t-eyebrow">{perfil.casa}</p>
          <h1 className="t-heading-lg mt-0.5 leading-tight">{perfil.nome}</h1>
          <p className="mt-1 text-body-sm text-muted">
            {perfil.partido}
            {perfil.uf ? `-${perfil.uf}` : ""}
            {perfil.territorio ? ` · ${perfil.territorio.ufNome}` : ""}
            {" · "}
            {t.dash.objectiveLabel}: {objectiveLabel}
          </p>
        </div>
        <span className={"pill " + NIVEL_PILL[nivel]}>
          <span className="pill-dot" />
          {t.motor[nivel]}
        </span>
        <Link href="/painel/candidato" className="btn btn-ghost shrink-0">
          {t.dash.changeCandidate}
        </Link>
      </div>

      {/* -------- Workflow stepper -------- */}
      <section className="card">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="t-heading">{pt ? "Fluxo da candidatura" : "Candidacy workflow"}</h2>
            <p className="mt-0.5 text-body-sm text-muted">
              {pt ? "Da captura ao monitoramento contínuo" : "From intake through continuous monitoring"}
            </p>
          </div>
          <span className="pill pill-brand hidden sm:inline-flex">
            <span className="pill-dot" />
            {pt ? "Em andamento" : "In progress"}
          </span>
        </div>
        <Stepper steps={steps} />
      </section>

      {/* -------- KPI row -------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <p className="t-eyebrow">{t.motor.readiness}</p>
          <p className="mt-2 text-display font-semibold leading-none text-ink">{leitura.prontidao.score}</p>
          <div className="mt-3 h-1.5 rounded-full bg-sand">
            <span
              className="bar-grow block h-full rounded-full"
              style={{ width: `${leitura.prontidao.score}%`, background: NIVEL_BAR[nivel] }}
            />
          </div>
          <p className="mt-2 text-caption text-faint">{leitura.prontidao.leitura}</p>
        </div>
        <div className="card">
          <p className="t-eyebrow">{pt ? `${un} de prioridade` : `priority ${un}`}</p>
          <p className="mt-2 text-display font-semibold leading-none text-ink">{prioridadeCount}</p>
          <p className="mt-3 text-body-sm text-muted">
            {modoCandidato
              ? pt
                ? `de ${munis.length} avaliados`
                : `of ${munis.length} assessed`
              : pt
                ? "sem base do candidato"
                : "no candidate base"}
          </p>
        </div>
        <div className="card">
          <p className="t-eyebrow">{pt ? "Lacunas temáticas" : "Thematic gaps"}</p>
          <p className="mt-2 text-display font-semibold leading-none text-ink">{posDim?.valor ?? "—"}</p>
          <p className="mt-3 text-body-sm text-muted">
            {pt ? "temas a ocupar antes do adversário" : "themes to claim before the opponent"}
          </p>
        </div>
        <div className="card">
          <p className="t-eyebrow">{pt ? "Sinais analisados" : "Signals analysed"}</p>
          <p className="mt-2 text-display font-semibold leading-none text-ink">
            {leitura.sinaisAnalisados.toLocaleString(locale)}
          </p>
          <p className="mt-3 text-body-sm text-muted">
            {pt ? `de ${leitura.fontes.length} fontes oficiais` : `from ${leitura.fontes.length} official sources`}
          </p>
        </div>
      </div>

      {/* -------- Charts row -------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="t-heading">{pt ? "Territórios por prioridade" : "Territories by priority"}</h2>
          <p className="mt-0.5 text-body-sm text-muted">
            {modoCandidato
              ? pt
                ? "Quadrantes do IFET: peso do território × alcance do candidato"
                : "IFET quadrants: territorial weight × candidate reach"
              : pt
                ? "Diagnóstico por dimensão — sem base do candidato ainda"
                : "Assessment by dimension — no candidate base yet"}
          </p>
          <div className="mt-5">
            {donutTotal > 0 ? (
              <Donut
                segments={donutSegs}
                centerValue={donutTotal}
                centerLabel={modoCandidato ? (pt ? `${un} avaliados` : `${un} assessed`) : pt ? "dimensões" : "dimensions"}
              />
            ) : (
              <p className="py-8 text-center text-body-sm text-faint">
                {pt ? "Sem dados territoriais carregados." : "No territorial data loaded."}
              </p>
            )}
          </div>
          <Link href="/painel/mapa-de-calor" className="nav-link mt-4 inline-flex items-center gap-1 text-body-sm">
            {pt ? "Abrir mapa de calor" : "Open heat map"} <ArrowRight size={13} />
          </Link>
        </section>

        <section className="card">
          <h2 className="t-heading">{pt ? "Prontidão por dimensão" : "Readiness by dimension"}</h2>
          <p className="mt-0.5 text-body-sm text-muted">
            {pt ? "Território, posicionamento, base e alinhamento" : "Territory, positioning, base and alignment"}
          </p>
          <ul className="mt-4 divide-y divide-line">
            {leitura.dimensoes.map((d) => (
              <li key={d.chave} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body-sm font-semibold text-ink">{d.titulo}</span>
                    <span className={"pill " + (DIM_PILL[d.status] ?? "pill-neutral")}>
                      {dimStatusLabel(d.status)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-caption text-muted">{d.leitura}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-body-sm font-semibold tabular-nums text-ink">{d.valor}</p>
                  <p className="text-[11px] text-faint">{d.rotulo}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* -------- Actions + activity -------- */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="card">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="t-heading">{t.motor.actions}</h2>
            <Link href="/painel/como-ganhar" className="nav-link text-body-sm">
              {t.comoGanhar?.title ?? (pt ? "Como ganhar" : "How to win")} <ArrowRight size={13} className="inline" />
            </Link>
          </div>
          <p className="mt-0.5 text-body-sm text-muted">{t.motor.actionsSub}</p>
          <ol className="mt-4 space-y-2.5">
            {leitura.acoes.map((a) => (
              <li key={a.ordem} className="rounded-none border border-line bg-surface-2 p-3.5">
                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[12px] font-semibold text-[#04211a]">
                    {a.ordem}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-semibold text-ink">{a.titulo}</p>
                    <p className="mt-1 text-body-sm text-muted">
                      <span className="text-faint">{t.motor.why}: </span>
                      {a.porque}
                    </p>
                    <Link
                      href={a.href}
                      className="nav-link mt-2 inline-flex items-center gap-1 text-caption font-medium"
                    >
                      {t.motor.openModule} <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="card">
          <h2 className="t-heading">{pt ? "Atividade recente" : "Recent activity"}</h2>
          <ul className="mt-4 space-y-3.5">
            {feed.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-tint text-brand-ink">
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-ink">{f.title}</p>
                    <p className="mt-0.5 text-caption text-faint">{f.sub}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 rounded-none border border-line bg-surface-2 p-3">
            <p className="text-caption font-semibold uppercase tracking-[0.06em] text-faint">
              {pt ? "Prontidão — tendência" : "Readiness — trend"}
            </p>
            <div className="mt-2">
              <Sparkline points={sparkPoints} />
            </div>
          </div>
        </section>
      </div>

      {/* -------- Modules & status -------- */}
      <section className="card-flush overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="t-heading">{pt ? "Módulos e validação" : "Modules and validation"}</h2>
            <p className="mt-0.5 text-body-sm text-muted">
              {pt
                ? "Cada motor com o estatuto do seu método (ver ficha metodológica)"
                : "Each engine with its method status (see methodology sheet)"}
            </p>
          </div>
        </div>
        <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-1">
          {MODULOS.map((m) => {
            const ficha = FICHAS[m.fichaKey]?.(pt);
            if (!ficha) return null;
            const meta = m.toolKey ? t.tools[m.toolKey] : null;
            const name =
              meta?.name ??
              (m.fichaKey === "partidos" ? (pt ? "Partidos" : "Parties") : ficha.chave);
            const short = meta?.short ?? ficha.metodo;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-body-sm font-semibold text-ink">{name}</p>
                    <span className={"pill " + STATUS_PILL[ficha.status]}>{statusLabel(ficha.status, pt)}</span>
                    <span className="hidden text-caption text-faint sm:inline">{ficha.versao}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-caption text-muted">{short}</p>
                </div>
                <ArrowUpRight size={16} className="shrink-0 text-faint transition-colors group-hover:text-ink" />
              </Link>
            );
          })}
        </div>
      </section>

      <p className="border-t border-line pt-4 text-caption text-faint">
        {t.motor.disclaimer} {t.dash.refreshedAt} {refreshed.toLocaleDateString(locale)}.{" "}
        {leitura.fontes.join(" · ")}
      </p>
    </div>
  );
}
