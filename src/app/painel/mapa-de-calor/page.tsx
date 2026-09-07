import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { HeatmapExplorer } from "@/components/app/HeatmapExplorer";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getTerritorioUF } from "@/lib/territory";
import { QUADRANTE_INFO, type Quadrante } from "@/lib/intel/ifet";

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

  const { ifet } = territorio;
  const quad = Object.fromEntries(
    (Object.keys(QUADRANTE_INFO) as Quadrante[]).map((q) => [q, QUADRANTE_INFO[q][locale]]),
  ) as Record<Quadrante, { label: string; acao: string }>;

  const pt = locale === "pt";

  return (
    <ToolShell
      id="mapa-de-calor"
      realData
      updatedAt={`IFET ${ifet.version}`}
      howItWorks={
        pt
          ? [
              "Carrega a malha municipal real e o contexto socioeconômico do estado (IBGE).",
              "Calcula o IFET de cada município: peso eleitoral, perfil econômico e disputabilidade.",
              "Agrega os pilares e classifica cada município num quadrante estratégico.",
              "Colore o mapa pelo índice e permite inspecionar a decomposição município a município.",
            ]
          : [
              "Loads the real municipal mesh and the state's socioeconomic context (IBGE).",
              "Computes each municipality's IFET: electoral weight, economic profile and contestability.",
              "Aggregates the pillars and classifies each municipality into a strategic quadrant.",
              "Colours the map by the index and lets you inspect the breakdown municipality by municipality.",
            ]
      }
      outputs={
        pt
          ? [
              "Choropleth por prioridade estratégica (IFET 0–100).",
              "Quadrantes: onde concentrar, consolidar, buscar oportunidade ou não gastar.",
              "Ficha de cada município com a decomposição e as fontes.",
            ]
          : [
              "Choropleth by strategic priority (IFET 0–100).",
              "Quadrants: where to concentrate, consolidate, seek opportunity or not spend.",
              "Per-municipality sheet with the breakdown and the sources.",
            ]
      }
    >
      <h2 className="t-heading text-[22px]">
        {t.ifet.name} <span className="mark ml-1 text-caption">{t.ifet.tag} {ifet.version}</span>
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-fossil">
        {t.ifet.intro.replace("{name}", perfil.nome)}
      </p>

      <div className="mt-6">
        <HeatmapExplorer
          geojson={territorio.geojson}
          nameByCode={territorio.nomeByCode}
          ifet={{ municipios: ifet.municipios, byCode: ifet.byCode }}
          votos={
            territorio.eleitoralByCode && territorio.eleitoralAno != null
              ? {
                  byCode: territorio.eleitoralByCode,
                  ano: territorio.eleitoralAno,
                  total: territorio.eleitoralTotal ?? 0,
                }
              : null
          }
          quad={quad}
          dict={{ ...t.ifet, interact: t.maps.interact }}
          ufNome={territorio.ufNome}
          locale={locale}
        />
      </div>

      {/* Ficha técnica */}
      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.ifet.fichaTitle}</h3>
        <dl className="font-ui mt-3 grid gap-x-8 gap-y-3 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-pebble">{t.ifet.version}</dt>
            <dd className="text-smoke">IFET {ifet.version}</dd>
          </div>
          <div>
            <dt className="text-pebble">{t.ifet.weights}</dt>
            <dd className="text-smoke">
              {t.ifet.pesoEleitoral} {Math.round(ifet.pesos.pesoEleitoral * 100)}% · {t.ifet.perfilEconomico}{" "}
              {Math.round(ifet.pesos.perfilEconomico * 100)}% · {t.ifet.disputabilidade}{" "}
              {Math.round(ifet.pesos.disputabilidade * 100)}%
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-pebble">{t.ifet.sources}</dt>
            <dd className="mt-1 flex flex-wrap gap-2">
              {ifet.fontes.map((f) => (
                <span key={f} className="rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
                  {f}
                </span>
              ))}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-pebble">{t.ifet.pending}</dt>
            <dd className="mt-1 space-y-1 text-caption text-fossil">
              {ifet.pendencias.map((p) => (
                <p key={p}>— {p}</p>
              ))}
            </dd>
          </div>
        </dl>
      </div>
    </ToolShell>
  );
}
