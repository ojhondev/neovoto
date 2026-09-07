import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { TerritoryMap } from "@/components/viz/TerritoryMap";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom, cargoOf } from "@/lib/candidacy";
import { getTerritorioUF } from "@/lib/territory";
import { CARGO_LABEL } from "@/lib/cargos";
import { RetryVotacao } from "@/components/app/RetryVotacao";

export const metadata: Metadata = { title: "Mapa de Calor de Influência" };

export default async function Page() {
  const { locale, t } = await getDictionary();
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  if (!candidacy || !perfil || !perfil.uf) {
    return (
      <ToolShell id="mapa-de-calor" updatedAt="—" howItWorks={[]} outputs={[]}>
        <div className="card">
          <p className="text-body-sm text-fossil">{t.maps.needCandidate}</p>
          <Link href="/onboarding" className="btn btn-primary mt-4">
            {t.maps.goOnboarding} <ArrowRight size={16} />
          </Link>
        </div>
      </ToolShell>
    );
  }

  const cargo = cargoOf(candidacy);
  const territorio = await getTerritorioUF(perfil.uf, candidacy.id);

  if (!territorio) {
    return (
      <ToolShell id="mapa-de-calor" updatedAt="—" howItWorks={[]} outputs={[]}>
        <div className="card">
          <p className="text-body-sm text-fossil">
            {locale === "pt"
              ? "Não foi possível carregar a malha territorial do IBGE agora."
              : "Could not load the IBGE territorial mesh right now."}
          </p>
        </div>
      </ToolShell>
    );
  }

  const eleitoral = territorio.eleitoralByCode;
  const cargoLabel = CARGO_LABEL[cargo][locale];
  const metricLabel = eleitoral
    ? t.maps.layerElectoral
        .replace("{ano}", String(territorio.eleitoralAno ?? ""))
        .replace("{cargo}", cargoLabel)
    : t.maps.layerPopulation;

  const valueByCode = eleitoral ?? territorio.populacaoByCode;
  const throttled = candidacy.source === "tse" && candidacy.electoralStatus === "indisponivel";
  const banner = eleitoral
    ? t.maps.electoralActive
        .replace("{name}", perfil.nome)
        .replace("{ano}", String(territorio.eleitoralAno ?? ""))
    : throttled
      ? t.maps.electoralThrottled
      : t.maps.electoralPending;

  const sortedTop = [...territorio.municipios]
    .map((m) => ({ ...m, metric: valueByCode[m.code] ?? 0 }))
    .sort((a, b) => b.metric - a.metric)
    .slice(0, 12);

  const unit = eleitoral ? t.maps.votes : t.maps.inhabitants;

  return (
    <ToolShell
      id="mapa-de-calor"
      realData
      updatedAt={territorio.eleitoralAno ? String(territorio.eleitoralAno) : "IBGE 2022"}
      howItWorks={
        locale === "pt"
          ? [
              "Carrega a malha municipal real do estado do candidato (IBGE, GeoJSON).",
              "Colore cada município pela métrica ativa (votação do candidato ou população).",
              "Permite navegar, dar zoom e inspecionar município a município.",
              "A camada de votação usa o espelho do TSE no brasil.io (todos os cargos).",
            ]
          : [
              "Loads the candidate state's real municipal mesh (IBGE, GeoJSON).",
              "Colours each municipality by the active metric (candidate vote or population).",
              "Lets you pan, zoom and inspect municipality by municipality.",
              "The vote layer uses the TSE mirror on brasil.io (every office).",
            ]
      }
      outputs={
        locale === "pt"
          ? [
              "Choropleth interativo por município.",
              "Ranking de municípios pela métrica ativa.",
              "Base pronta para comparar turnos e eleições (Fase 2).",
            ]
          : [
              "Interactive choropleth by municipality.",
              "Municipality ranking by the active metric.",
              "Base ready to compare rounds and elections (Phase 2).",
            ]
      }
    >
      <p className="font-ui mb-3 text-body-sm text-fossil">{banner}</p>
      {throttled && <RetryVotacao label={t.maps.retryVotacao} />}
      <TerritoryMap
        geojson={territorio.geojson}
        valueByCode={valueByCode}
        nameByCode={territorio.nomeByCode}
        metricLabel={metricLabel}
        scale={eleitoral ? "heat" : "sequential"}
        height={480}
      />
      <p className="font-ui mt-2 text-caption text-pebble">{t.maps.interact}</p>

      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">
          {eleitoral
            ? locale === "pt"
              ? "Municípios por votação"
              : "Municipalities by vote"
            : t.maps.topMunicipios}
          {" "}
          — {territorio.ufNome}
        </h3>
        <ol className="font-ui mt-3 space-y-1.5 text-body-sm">
          {sortedTop.map((m, i) => (
            <li key={m.code} className="flex items-center justify-between gap-3">
              <span className="text-smoke">
                <span className="mr-2 text-pebble">{i + 1}</span>
                {m.nome}
              </span>
              <span className="text-fossil">
                {m.metric.toLocaleString(locale)} {unit}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </ToolShell>
  );
}
