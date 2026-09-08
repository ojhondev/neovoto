import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { Info } from "@/components/app/Info";
import { ModuloRoadmap } from "@/components/app/ModuloRoadmap";
import { CenariosScatter } from "@/components/app/CenariosScatter";
import { getDictionary } from "@/lib/i18n";
import { FichaMetodologica } from "@/components/app/FichaMetodologica";
import { FICHAS } from "@/lib/intel/fichas";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { carregarCenarios } from "@/lib/intel/cenarios-load";
import { escopoNacional } from "@/lib/escopo";
import { IfetInfo } from "@/components/app/IfetInfo";
import { type ResultadoCenario } from "@/lib/intel/cenarios";
import { URGENCIA_RESULTADO, urgVar } from "@/lib/viz/colors";
import type { Cargo } from "@/lib/cargos";

export const metadata: Metadata = { title: "Cenários" };

function fmt(n: number, locale: string) {
  return Math.round(n).toLocaleString(locale);
}

const RES_COR: Record<ResultadoCenario, string> = {
  vitoria: urgVar(URGENCIA_RESULTADO.vitoria),
  disputa: urgVar(URGENCIA_RESULTADO.disputa),
  derrota: urgVar(URGENCIA_RESULTADO.derrota),
};

export default async function Page() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;
  const cargo = (candidacy?.cargo as Cargo | null) ?? perfil?.cargo ?? null;

  const howItWorks = pt
    ? [
        "Parte da votação real por município — ou, sem histórico, do alcance territorial do candidato (cidade-base, rede do partido, apoios) × uma taxa de captação amostrada.",
        "Define a barra: maioria dos válidos (majoritária) ou voto do último eleito (proporcional).",
        "Roda 4.000 simulações de Monte Carlo amostrando maré nacional, comparecimento, conversão das lacunas e um choque de execução.",
        "Devolve a distribuição do total (p10…p90), a chance de eleger nas premissas do modelo e o que mais move o ponteiro.",
      ]
    : [
        "Starts from the real vote by municipality — or, with no history, from the candidate's territorial reach (home base, party network, endorsements) × a sampled capture rate.",
        "Sets the bar: majority of valid votes (majority race) or the last-elected's vote (proportional).",
        "Runs 4,000 Monte Carlo simulations sampling national mood, turnout, gap conversion and an execution shock.",
        "Returns the total's distribution (p10…p90), the chance to get elected under the model's assumptions, and the biggest lever.",
      ];
  const outputs = pt
    ? ["Distribuição do total de votos (p10 / mediana / p90).", "Chance de eleger condicionada às premissas.", "Municípios que mais encurtam o caminho.", "Sensibilidade a cada premissa."]
    : ["Distribution of the total vote (p10 / median / p90).", "Chance to get elected, conditional on the assumptions.", "Municipalities that shorten the path most.", "Sensitivity to each assumption."];

  if (!candidacy || !perfil || !cargo || (!perfil.uf && !escopoNacional(cargo))) {
    return (
      <ToolShell id="cenarios" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <div className="card">
          <p className="text-body-sm text-fossil">{t.cenarios.needCandidate}</p>
          <Link href="/onboarding" className="btn btn-primary mt-4">
            {t.maps.goOnboarding} <ArrowRight size={16} />
          </Link>
        </div>
      </ToolShell>
    );
  }

  const nacional = escopoNacional(cargo);
  const carregado = await carregarCenarios(candidacy, perfil, t);

  if (!carregado.ok) {
    const semBase = carregado.motivo === "sem-base";
    return (
      <ToolShell id="cenarios" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <ModuloRoadmap
          pergunta={pt ? "Quanto falta para você ganhar?" : "How much is missing to win?"}
          entrega={
            semBase
              ? pt
                ? "Numa disputa proporcional, projetar o voto de um candidato sem histórico e sem apoios é chute. Volte ao onboarding e declare os políticos eleitos que apoiam a campanha — a base é projetada a partir do voto deles nos redutos deles. Enquanto isso, o Mapa de Calor e o Mapa de Propostas já mostram onde está a oportunidade."
                : "In a proportional race, projecting the vote of a candidate with no history and no backers is a guess. Go back to onboarding and declare the elected officials backing the campaign. Meanwhile, the Heatmap and Proposal Map already show where the opportunity is."
              : pt
                ? "Não foi possível carregar a votação de referência para este recorte agora."
                : "Couldn't load the reference vote for this scope right now."
          }
          etapas={[
            { label: pt ? "Território e temas (IFET, Radar)" : "Territory and themes (IFET, Radar)", feito: carregado.motivo !== "sem-dados" },
            { label: pt ? "Histórico de votação do candidato" : "Candidate's own vote history", feito: false },
            { label: pt ? "Apoios de políticos eleitos declarados no onboarding" : "Elected backers declared in onboarding", feito: false },
          ]}
        />
      </ToolShell>
    );
  }

  const cen = carregado.cenarios;
  const baseTipo = carregado.baseTipo;

  const resLabel: Record<ResultadoCenario, string> = {
    vitoria: t.cenarios.resVitoria,
    disputa: t.cenarios.resDisputa,
    derrota: t.cenarios.resDerrota,
  };

  const falta = cen.faltam;
  const topFator = cen.sensibilidade[0]?.fator ?? "";
  const alvos3 = cen.municipiosAlvo.slice(0, 3).map((m) => m.nome).join(", ");
  const pv = Math.round(cen.probVitoria * 100);
  const conclusao = pt
    ? `${pv}% de chance de eleger ${perfil.nome} nas premissas do modelo — mediana ${fmt(cen.votosBase, locale)} de ${fmt(cen.votosNecessarios, locale)} (${falta > 0 ? `faltam ${fmt(falta, locale)}` : `folga de ${fmt(-falta, locale)}`}). O que mais move o ponteiro: ${topFator}${alvos3 ? ` — comece por ${alvos3}` : ""}.`
    : `${pv}% chance to elect ${perfil.nome} under the model's assumptions — median ${fmt(cen.votosBase, locale)} of ${fmt(cen.votosNecessarios, locale)} (${falta > 0 ? `${fmt(falta, locale)} missing` : `${fmt(-falta, locale)}-vote cushion`}). Biggest lever: ${topFator}${alvos3 ? ` — start with ${alvos3}` : ""}.`;

  const maxSens = Math.max(...cen.sensibilidade.map((s) => s.impacto), 1);

  return (
    <ToolShell
      id="cenarios"
      realData
      conclusao={conclusao}
      conclusaoTexto={conclusao}
      updatedAt={cen.version}
      howItWorks={howItWorks}
      outputs={outputs}
    >
      <h2 className="t-heading flex items-center text-[22px]">
        {t.tools.scenarios.name} <span className="mark ml-1 text-caption">{t.cenarios.tag}</span>
        <Info label={t.cenarios.tag}>{t.cenarios.disclaimer}</Info>
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-fossil">
        {t.cenarios.intro.replace("{nome}", perfil.nome)}
        {nacional ? (pt ? " Escopo: Brasil — 27 UFs." : " Scope: Brazil — 27 states.") : ""}
      </p>
      <p className="font-ui mt-2 flex items-center text-caption text-pebble">
        {cen.tipoDisputa === "majoritaria" ? t.cenarios.disputaMajoritaria : t.cenarios.disputaProporcional}{" "}
        {baseTipo === "propria"
          ? t.cenarios.basePropria
          : baseTipo === "alcance"
            ? pt
              ? "Base: alcance territorial do candidato (cidade-base, rede do partido, apoios) × captação amostrada."
              : "Basis: the candidate's territorial reach (home base, party network, endorsements) × sampled capture rate."
            : baseTipo === "apoios"
              ? pt
                ? "Base: fração transferível do voto dos políticos eleitos que apoiam a campanha."
                : "Basis: transferable fraction of the vote of the elected officials backing the campaign."
              : t.cenarios.basePartido}
        <IfetInfo />
      </p>

      {/* distribuição + probabilidade */}
      {(() => {
        const d = cen.distribuicao;
        const scaleMax = Math.max(d.p90, cen.votosNecessarios) * 1.12;
        const pos = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;
        const pv = Math.round(cen.probVitoria * 100);
        return (
          <div className="card mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-ui text-caption text-pebble">
                {pt ? "Faixa provável" : "Likely range"} (p10–p90):{" "}
                <span className="text-ink">
                  {fmt(d.p10, locale)} – {fmt(d.p90, locale)}
                </span>{" "}
                · {t.cenarios.necessarios}:{" "}
                <span className="text-ink">{fmt(cen.votosNecessarios, locale)}</span>
              </p>
              <p
                className="font-ui flex items-center text-body font-medium"
                style={{ color: pv >= 50 ? urgVar("low") : pv >= 25 ? urgVar("high") : urgVar("crit") }}
              >
                {pt ? "Chance de eleger" : "Chance to get elected"}: {pv}%
                <Info label={pt ? "Chance de eleger" : "Chance to get elected"}>{t.cenarios.probHint}</Info>
              </p>
            </div>
            <div className="relative mt-4 h-8">
              {/* faixa p10–p90 */}
              <div
                className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[3px] bg-sand"
                style={{ left: pos(d.p10), width: `calc(${pos(d.p90)} - ${pos(d.p10)})` }}
              />
              {/* faixa p25–p75 (mais densa) */}
              <div
                className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[3px]"
                style={{
                  left: pos(d.p25),
                  width: `calc(${pos(d.p75)} - ${pos(d.p25)})`,
                  background: "var(--color-cat-4)",
                  opacity: 0.5,
                }}
              />
              {/* mediana */}
              <div className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 bg-ink" style={{ left: pos(d.p50) }} />
              {/* barra p/ eleger */}
              <div
                className="absolute inset-y-0 w-px border-l border-dashed border-negative"
                style={{ left: pos(cen.votosNecessarios) }}
              />
              <span
                className="font-ui absolute -top-0.5 text-[10px] text-negative"
                style={{ left: `calc(${pos(cen.votosNecessarios)} + 4px)` }}
              >
                {pt ? "eleito" : "elected"}
              </span>
            </div>
            <p className="font-ui mt-2 text-caption text-pebble">
              {pt
                ? `Mediana ${fmt(cen.votosBase, locale)} · ${falta > 0 ? `faltam ${fmt(falta, locale)}` : `folga de ${fmt(-falta, locale)}`} · ${cen.sims.toLocaleString(locale)} simulações sobre premissas amostradas`
                : `Median ${fmt(cen.votosBase, locale)} · ${falta > 0 ? `${fmt(falta, locale)} missing` : `${fmt(-falta, locale)}-vote cushion`} · ${cen.sims.toLocaleString(locale)} simulations over sampled assumptions`}
            </p>
            <p
              className="font-ui mt-2 rounded-[6px] border-l-2 px-3 py-2 text-caption"
              style={{
                borderColor: baseTipo === "propria" ? "var(--color-olive)" : "var(--color-negative)",
                background: "var(--color-sand)",
              }}
            >
              {baseTipo === "propria" ? t.cenarios.confiancaAlta : t.cenarios.confiancaBaixa}
            </p>
          </div>
        );
      })()}

      {/* cenários */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {cen.cenarios.map((c) => (
          <div key={c.chave} className="card flex flex-col">
            <div className="flex items-center justify-between">
              <p className="t-eyebrow">{c.nome}</p>
              <span
                className="font-ui rounded-[3px] px-1.5 py-0.5 text-[11px] text-paper"
                style={{ background: RES_COR[c.resultado] }}
              >
                {resLabel[c.resultado]}
              </span>
            </div>
            <p className="font-ui mt-3 text-[26px] font-light leading-none text-ink">
              {fmt(c.votos, locale)}
            </p>
            <p className="font-ui mt-1 text-caption text-pebble">
              {fmt(c.faixa[0], locale)} – {fmt(c.faixa[1], locale)} {t.cenarios.votos}
            </p>
            <ul className="font-ui mt-3 flex-1 space-y-1 text-caption text-fossil">
              {c.premissas.map((p) => (
                <li key={p}>— {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* sensibilidade */}
      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.cenarios.sensTitle}</h3>
        <div className="mt-3 space-y-2">
          {cen.sensibilidade.map((s) => (
            <div key={s.fator} className="font-ui flex items-center gap-3 text-body-sm">
              <span className="w-52 shrink-0 text-smoke">{s.fator}</span>
              <span className="h-2 flex-1 rounded-[2px] bg-sand">
                <span
                  className="block h-full rounded-[2px]"
                  style={{
                    width: `${Math.round((s.impacto / maxSens) * 100)}%`,
                    background: "var(--color-cat-4)",
                  }}
                />
              </span>
              <span className="w-24 shrink-0 text-right text-fossil">
                ±{fmt(s.impacto, locale)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* dispersão */}
      {cen.dispersao.length > 5 && (
        <div className="card mt-6">
          <h3 className="t-heading text-[20px]">{t.cenarios.scatterTitle}</h3>
          <div className="mt-3">
            <CenariosScatter
              pontos={cen.dispersao}
              labels={{ x: t.cenarios.scatterX, y: t.cenarios.scatterY, alvo: t.cenarios.scatterAlvo }}
              locale={locale}
              nome={perfil.nome}
            />
          </div>
        </div>
      )}

      {/* municípios-alvo */}
      {cen.municipiosAlvo.length > 0 && (
        <div className="card mt-6">
          <h3 className="t-heading text-[20px]">{t.cenarios.targetTitle}</h3>
          <p className="font-ui mt-1 text-caption text-pebble">{t.cenarios.targetSub}</p>
          <ol className="font-ui mt-3 divide-y divide-ash text-body-sm">
            {cen.municipiosAlvo.map((m, i) => (
              <li key={m.code} className="flex items-center gap-3 py-2">
                <span className="w-5 shrink-0 text-pebble">{i + 1}</span>
                <span className="flex-1 truncate text-smoke">{m.nome}</span>
                <span className="w-16 shrink-0 text-right text-pebble">IFET {m.ifet}</span>
                <span className="w-28 shrink-0 text-right text-fossil">
                  +{fmt(m.ganhoPotencial, locale)} {t.cenarios.potentialGain}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <FichaMetodologica ficha={FICHAS.cenarios(pt)} locale={locale} labels={t.ficha} />
      <p className="font-ui mt-3 text-caption text-pebble">{t.cenarios.disclaimer}</p>
    </ToolShell>
  );
}
