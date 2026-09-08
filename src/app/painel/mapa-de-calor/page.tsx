import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { HeatmapExplorer } from "@/components/app/HeatmapExplorer";
import { IfetInfo } from "@/components/app/IfetInfo";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getTerritorioUF, getTerritorioNacional } from "@/lib/territory";
import { escopoNacional } from "@/lib/escopo";
import type { Cargo } from "@/lib/cargos";
import { QUADRANTE_INFO, type Quadrante } from "@/lib/intel/ifet";

export const metadata: Metadata = { title: "Mapa de Calor de Influência" };

export default async function Page() {
  const { locale, t } = await getDictionary();
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  const cargo = (candidacy?.cargo as Cargo | null) ?? perfil?.cargo ?? null;
  const nacional = escopoNacional(cargo);

  if (!candidacy || !perfil || (!perfil.uf && !nacional)) {
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

  const territorio = nacional
    ? await getTerritorioNacional(candidacy.id)
    : await getTerritorioUF(perfil.uf!, candidacy.id);
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

  const prioridade = ifet.municipios.filter((m) => m.quadrante === "prioridade-maxima");
  const top3 = prioridade.slice(0, 3).map((m) => m.nome);
  const popPrioridade = prioridade.reduce((s, m) => s + m.populacao, 0);
  const popTotal = ifet.municipios.reduce((s, m) => s + m.populacao, 0) || 1;
  const pctEleitorado = Math.round((popPrioridade / popTotal) * 100);
  const unidade = nacional
    ? { s: pt ? "estado" : "state", p: pt ? "estados" : "states", conc: pt ? "estado concentra" : "state concentrates", concp: pt ? "estados concentram" : "states concentrate", pop: pt ? "população do país" : "country's population", load: pt ? "O mapa pode alternar entre o índice e a votação real por UF." : "The map can toggle between the index and the real vote by state." }
    : { s: pt ? "município" : "municipality", p: pt ? "municípios" : "municipalities", conc: pt ? "município concentra" : "municipality concentrates", concp: pt ? "municípios concentram" : "municipalities concentrate", pop: pt ? "população do estado" : "state's population", load: pt ? "O mapa pode alternar entre o índice e a votação real." : "The map can toggle between the index and the real vote." };
  const conclusao = pt
    ? `${prioridade.length} ${prioridade.length === 1 ? unidade.conc : unidade.concp} a prioridade máxima da campanha de ${perfil.nome} — cerca de ${pctEleitorado}% da ${unidade.pop}.${top3.length ? ` Comece por ${top3.join(", ")}.` : ""} ${territorio.eleitoralByCode ? unidade.load : `Carregue a votação por ${unidade.s} para o índice ganhar o pilar de desempenho histórico.`}`
    : `${prioridade.length} ${prioridade.length === 1 ? unidade.conc : unidade.concp} the campaign's top priority for ${perfil.nome} — about ${pctEleitorado}% of the ${unidade.pop}.${top3.length ? ` Start with ${top3.join(", ")}.` : ""} ${territorio.eleitoralByCode ? unidade.load : `Load the vote by ${unidade.s} to add the track-record pillar.`}`;

  return (
    <ToolShell
      id="mapa-de-calor"
      realData
      conclusao={conclusao}
      conclusaoTexto={conclusao}
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
      <h2 className="t-heading flex items-center text-[22px]">
        {t.ifet.name} <span className="mark ml-1 text-caption">{t.ifet.tag} {ifet.version}</span>
        <IfetInfo />
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-fossil">
        {(nacional
          ? pt
            ? "Cada UF recebe um score de 0 a 100 de prioridade estratégica para {name} na disputa presidencial, a partir do contexto territorial oficial. O mapa está colorido por esse índice."
            : "Each state gets a 0–100 strategic-priority score for {name} in the presidential race, from official territorial context. The map is coloured by this index."
          : t.ifet.intro
        ).replace("{name}", perfil.nome)}
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
          dict={{
            ...t.ifet,
            interact: t.maps.interact,
            ...(nacional
              ? {
                  ranking: pt ? "UFs por IFET" : "States by IFET",
                  clickHint: pt ? "Clique numa UF no mapa para ver a ficha." : "Click a state on the map to see the sheet.",
                  selected: pt ? "UF selecionada" : "Selected state",
                  votosTotal: pt ? "Total no país" : "Country total",
                  pesoEleitoralHint: pt ? "Quanto voto está em jogo na UF (população)." : "Votes at stake in the state (population).",
                }
              : {}),
          }}
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
              {ifet.pesos.desempenhoHistorico > 0 && (
                <>
                  {" "}
                  · {t.ifet.desempenhoHistorico} {Math.round(ifet.pesos.desempenhoHistorico * 100)}%
                </>
              )}
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
