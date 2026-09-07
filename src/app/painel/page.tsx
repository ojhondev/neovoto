import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, UserRound, Sparkles } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { TOOLS, toolPath } from "@/lib/tools";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { analisarCandidatura, type DimensaoLeitura, type NivelProntidao } from "@/lib/intel/motor";
import { Info } from "@/components/app/Info";

export const metadata: Metadata = { title: "Painel" };

const NIVEL_COR: Record<NivelProntidao, string> = {
  critico: "#8a3b2f",
  atencao: "#c9772f",
  competitivo: "#8ba33a",
  favoravel: "#4b5b0a",
};

function nivelLabel(n: NivelProntidao, t: Awaited<ReturnType<typeof getDictionary>>["t"]) {
  return { critico: t.motor.critico, atencao: t.motor.atencao, competitivo: t.motor.competitivo, favoravel: t.motor.favoravel }[n];
}

function StatusDot({ status }: { status: DimensaoLeitura["status"] }) {
  const c = status === "ok" ? "#4b5b0a" : status === "atencao" ? "#c9772f" : "#a8a29a";
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: c }} />;
}

export default async function PainelHome() {
  const { locale, t } = await getDictionary();
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  if (!candidacy || !perfil) {
    return (
      <>
        <p className="t-eyebrow mb-3">{t.motor.name}</p>
        <h1 className="t-heading-lg">{t.dash.emptyTitle}</h1>
        <p className="mt-3 max-w-xl text-body text-fossil">{t.dash.emptyBody}</p>
        <Link href="/onboarding" className="btn btn-primary mt-6">
          {t.dash.emptyCta} <ArrowRight size={16} />
        </Link>

        <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-card-lg)] border border-ash bg-ash sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const meta = t.tools[tool.key];
            const Icon = tool.icon;
            return (
              <div key={tool.id} className="flex flex-col bg-paper p-6">
                <Icon size={20} strokeWidth={1.5} className="text-ink" />
                <h2 className="t-heading mt-3 text-[19px]">{meta.name}</h2>
                <p className="mt-2 text-body-sm text-fossil">{meta.short}</p>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const objectiveLabel =
    t.onboarding.objectives.find((o) => o.value === candidacy.objective)?.label ??
    candidacy.objective;

  const leitura = await analisarCandidatura(
    candidacy,
    perfil,
    t,
    locale === "pt" ? "pt" : "en",
  );

  const scoreCor = NIVEL_COR[leitura.prontidao.nivel];

  return (
    <>
      {/* ---- Cabeçalho da candidatura ---- */}
      <div className="flex flex-wrap items-start gap-4">
        {perfil.foto ? (
          <Image
            src={perfil.foto}
            alt={perfil.nome}
            width={56}
            height={72}
            unoptimized
            className="h-[72px] w-14 shrink-0 rounded-[8px] border border-ash object-cover"
          />
        ) : (
          <span className="flex h-[72px] w-14 shrink-0 items-center justify-center rounded-[8px] border border-ash bg-sand">
            <UserRound size={24} className="text-fossil" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="t-eyebrow mb-1">{perfil.casa}</p>
          <h1 className="t-heading-lg">{perfil.nome}</h1>
          <p className="font-ui mt-1 text-body-sm text-fossil">
            {perfil.partido}
            {perfil.uf ? `-${perfil.uf}` : ""}
            {perfil.territorio ? ` · ${perfil.territorio.ufNome}` : ""}
            {" · "}
            {t.dash.objectiveLabel}: {objectiveLabel}
          </p>
        </div>
        <Link href="/painel/candidato" className="nav-link shrink-0 text-body-sm">
          {t.dash.changeCandidate}
        </Link>
      </div>

      {/* ---- Leitura NeoVoto (o "algoritmo" visível) ---- */}
      <section className="mt-6 rounded-[var(--radius-card-lg)] border border-ash bg-paper p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles size={16} className="text-ink" />
          <span className="t-eyebrow">{t.motor.name}</span>
          <span className="font-ui text-caption text-pebble">· {t.motor.tagline}</span>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[200px_1fr]">
          {/* score */}
          <div className="shrink-0">
            <p className="font-ui flex items-center text-caption text-pebble">
              {t.motor.readiness}
              <Info label={t.motor.readiness}>
                {locale === "pt"
                  ? "Índice 0–100 do Motor NeoVoto. Combina a concentração da sua força no território (IFET), quantas lacunas de agenda estão abertas no seu campo e o seu capital político. Quanto maior, mais a estratégia 'fecha'."
                  : "0–100 index from the NeoVoto Engine. Combines how concentrated your territorial strength is (IFET), how many agenda gaps are open on your side, and your political capital. Higher means the strategy 'closes' better."}
              </Info>
            </p>
            <p className="font-ui mt-1 text-[52px] font-light leading-none" style={{ color: scoreCor }}>
              {leitura.prontidao.score}
            </p>
            <p className="font-ui mt-1 text-body-sm font-medium" style={{ color: scoreCor }}>
              {nivelLabel(leitura.prontidao.nivel, t)}
            </p>
            <div className="mt-3 h-2 rounded-[2px] bg-sand">
              <div
                className="h-full rounded-[2px]"
                style={{ width: `${leitura.prontidao.score}%`, background: scoreCor }}
              />
            </div>
            <p className="font-ui mt-2 text-caption text-pebble">{leitura.prontidao.leitura}</p>
          </div>

          {/* síntese */}
          <div>
            <p className="t-eyebrow mb-2">{t.motor.reading}</p>
            <p className="text-body text-ink">{leitura.sintese}</p>
            <p className="font-ui mt-3 text-caption text-pebble">
              {t.motor.crossed
                .replace("{n}", leitura.sinaisAnalisados.toLocaleString(locale))
                .replace("{m}", String(leitura.fontes.length))}
              {" · "}
              {t.motor.recalc}
            </p>
          </div>
        </div>
      </section>

      {/* ---- Ações prioritárias ---- */}
      {leitura.acoes.length > 0 && (
        <section className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="t-heading text-[20px]">{t.motor.actions}</h2>
            <Link href="/painel/como-ganhar" className="nav-link inline-flex items-center gap-1 text-[13px]">
              {t.comoGanhar.title} <ArrowRight size={13} />
            </Link>
          </div>
          <p className="font-ui mt-1 text-caption text-pebble">{t.motor.actionsSub}</p>
          <ol className="mt-4 space-y-2">
            {leitura.acoes.map((a) => (
              <li key={a.ordem} className="card flex items-start gap-4 p-4">
                <span
                  className="font-ui mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption text-ink-accent"
                  style={{ background: "var(--color-chartreuse)" }}
                >
                  {a.ordem}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-ui text-body text-ink">{a.titulo}</p>
                  <p className="mt-1 text-body-sm text-fossil">
                    <span className="text-pebble">{t.motor.why}: </span>
                    {a.porque}
                  </p>
                </div>
                <Link
                  href={a.href}
                  className="nav-link mt-1 inline-flex shrink-0 items-center gap-1 text-[13px]"
                >
                  {t.motor.openModule} <ArrowRight size={13} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ---- Dimensões ---- */}
      <section className="mt-8">
        <h2 className="t-heading text-[20px]">{t.motor.dimensions}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {leitura.dimensoes.map((d) => (
            <div key={d.chave} className="card flex flex-col">
              <div className="flex items-center justify-between">
                <p className="t-eyebrow">{d.titulo}</p>
                <StatusDot status={d.status} />
              </div>
              <p className="font-ui mt-3 text-[30px] font-light leading-none text-ink">{d.valor}</p>
              <p className="font-ui mt-1 text-caption text-pebble">{d.rotulo}</p>
              {d.barras && d.barras.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {d.barras.map((b, bi) => (
                    <div key={b.label} className="font-ui flex items-center gap-2 text-[11px]">
                      <span className="w-24 shrink-0 truncate text-pebble">{b.label}</span>
                      <span className="h-1.5 flex-1 rounded-[2px] bg-sand">
                        <span
                          className="block h-full rounded-[2px]"
                          style={{
                            width: `${Math.round(b.v * 100)}%`,
                            background: `var(--color-cat-${(bi % 6) + 1})`,
                          }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 flex-1 text-body-sm text-fossil">{d.leitura}</p>
              <Link
                href={d.href}
                className="nav-link mt-4 inline-flex items-center gap-1 text-[13px]"
              >
                {t.motor.openModule} <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Todos os módulos ---- */}
      <h2 className="t-heading mt-10 text-[20px]">
        {t.dash.toolsForCandidate.replace("{name}", perfil.nome)}
      </h2>
      <div className="mt-4 grid gap-px overflow-hidden rounded-[var(--radius-card-lg)] border border-ash bg-ash sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const meta = t.tools[tool.key];
          const Icon = tool.icon;
          return (
            <Link key={tool.id} href={toolPath(tool.id)} className="flex flex-col bg-paper p-5 hover:bg-bone">
              <Icon size={18} strokeWidth={1.5} className="text-ink" />
              <h3 className="t-heading mt-3 text-[18px]">{meta.name}</h3>
              <p className="mt-1.5 text-body-sm text-fossil">{meta.short}</p>
            </Link>
          );
        })}
      </div>

      <p className="font-ui mt-8 border-t border-ash pt-4 text-caption text-pebble">
        {t.motor.disclaimer}
        {" "}
        {t.dash.refreshedAt} {new Date(candidacy.refreshedAt).toLocaleDateString(locale)}.
        {" "}
        {leitura.fontes.join(" · ")}
      </p>
    </>
  );
}
