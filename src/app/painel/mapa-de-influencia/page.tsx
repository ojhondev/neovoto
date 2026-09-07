import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { TerritoryMap } from "@/components/viz/TerritoryMap";
import { InfluenceNetwork } from "@/components/viz/InfluenceNetwork";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom, cargoOf } from "@/lib/candidacy";
import { getTerritorioUF } from "@/lib/territory";

export const metadata: Metadata = { title: "Mapa de Influência" };

export default async function Page() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  const territorio =
    candidacy && perfil?.uf
      ? await getTerritorioUF(perfil.uf, {
          nome: perfil.nome,
          uf: perfil.uf,
          cargo: cargoOf(candidacy),
        })
      : null;

  const eleitoral = territorio?.eleitoralByCode ?? null;

  return (
    <ToolShell
      id="mapa-de-influencia"
      realData={!!territorio}
      updatedAt={territorio ? (territorio.eleitoralAno ? String(territorio.eleitoralAno) : "IBGE 2022") : "—"}
      howItWorks={
        pt
          ? [
              "Carrega o território real do estado do candidato (malha municipal do IBGE).",
              "Dimensiona cada município pela presença eleitoral (votação) ou, na ausência dela, pela população.",
              "Cruza com coligações, federações e mandatos ativos (Câmara e Senado).",
              "Sobrepõe a rede de atores e os pontos de decisão.",
            ]
          : [
              "Loads the candidate state's real territory (IBGE municipal mesh).",
              "Sizes each municipality by electoral presence (vote) or, absent it, by population.",
              "Cross-references coalitions, federations and active mandates (Chamber and Senate).",
              "Overlays the actor network and decision points.",
            ]
      }
      outputs={
        pt
          ? [
              "Território do candidato dimensionado por peso.",
              "Rede de atores e vínculos (coligação, histórico, territorial).",
              "Alertas de base a disputar e de pontes entre blocos.",
            ]
          : [
              "Candidate territory sized by weight.",
              "Actor network and ties (coalition, historical, territorial).",
              "Alerts on contested bases and bridges between blocs.",
            ]
      }
    >
      {territorio ? (
        <>
          <p className="font-ui mb-3 text-body-sm text-fossil">
            {eleitoral
              ? pt
                ? `Municípios de ${territorio.ufNome} dimensionados pela votação de ${perfil!.nome}.`
                : `${territorio.ufNome} municipalities sized by ${perfil!.nome}'s vote.`
              : pt
                ? `Base territorial de ${territorio.ufNome} (população, Censo 2022). A camada de votação entra com a fonte eleitoral — ver docs/DADOS-TSE.md.`
                : `${territorio.ufNome} territorial base (population, 2022 Census). The vote layer arrives with the electoral source — see docs/DADOS-TSE.md.`}
          </p>
          <TerritoryMap
            geojson={territorio.geojson}
            valueByCode={eleitoral ?? territorio.populacaoByCode}
            nameByCode={territorio.nomeByCode}
            metricLabel={
              eleitoral
                ? pt
                  ? "votação"
                  : "vote"
                : pt
                  ? "população — Censo 2022"
                  : "population — 2022 Census"
            }
            scale={eleitoral ? "heat" : "sequential"}
            height={460}
          />
          <div className="mt-8">
            <p className="t-eyebrow mb-2">
              {pt ? "Rede de atores (ilustrativa)" : "Actor network (illustrative)"}
            </p>
            <InfluenceNetwork compact />
          </div>
        </>
      ) : (
        <div className="card">
          <p className="text-body-sm text-fossil">{t.maps.needCandidate}</p>
          <Link href="/onboarding" className="btn btn-primary mt-4">
            {t.maps.goOnboarding} <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </ToolShell>
  );
}
