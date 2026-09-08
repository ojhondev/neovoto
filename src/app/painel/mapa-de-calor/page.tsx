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
  const contexto = ifet.modo === "contexto";
  const ancora = territorio.base?.ancora ?? null;

  const prioridade = ifet.municipios.filter((m) => m.quadrante === "prioridade");
  const expansao = ifet.municipios.filter((m) => m.quadrante === "expansao");
  const top3 = prioridade.slice(0, 3).map((m) => m.nome);
  const un = nacional
    ? { p: pt ? "UFs" : "states" }
    : { p: pt ? "municípios" : "municipalities" };
  const conclusao = contexto
    ? pt
      ? `Sem histórico de campanha, município-base ou apoios de ${perfil.nome}, a plataforma só sabe o peso de cada ${nacional ? "UF" : "município"} — não onde a candidatura tira voto. Informe o domicílio eleitoral no perfil para o mapa mostrar a prioridade real.`
      : `Without ${perfil.nome}'s campaign history, home base or endorsements, the platform only knows each place's weight — not where the campaign wins votes. Set the electoral domicile to get real priority.`
    : pt
      ? `${prioridade.length} ${prioridade.length === 1 ? (nacional ? "UF é" : "município é") : `${un.p} são`} prioridade de ${perfil.nome}: muito voto E alcance real${ancora ? `, a partir da base em ${ancora.nome}` : ""}.${top3.length ? ` Comece por ${top3.join(", ")}.` : ""} Outros ${expansao.length} têm voto mas exigem estrutura para entrar.`
      : `${prioridade.length} priority ${un.p} for ${perfil.nome}: votes at stake AND real reach${ancora ? `, from the base in ${ancora.nome}` : ""}.${top3.length ? ` Start with ${top3.join(", ")}.` : ""} Another ${expansao.length} have votes but need structure.`;

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
              "Monta a Base do Candidato: histórico de campanhas próprias, cidade-base (domicílio/nascimento) e região imediata, rede de mandatos do partido e apoios.",
              "Calcula, por município, o peso do território (voto em jogo) e o alcance do candidato (0–1).",
              "Agrega os dois por média geométrica não-compensatória: alcance baixo derruba a prioridade por mais populoso que seja o município.",
              "Classifica cada município em prioridade / expansão / reduto / fora do alcance.",
            ]
          : [
              "Builds the Candidate Base: own campaign history, home city (domicile/birth) and immediate region, party's elected network, endorsements.",
              "Computes per municipality the territorial weight (votes at stake) and the candidate's reach (0–1).",
              "Aggregates both by non-compensatory geometric mean: low reach drags priority down regardless of population.",
              "Classifies each municipality as priority / expansion / stronghold / out of reach.",
            ]
      }
      outputs={
        pt
          ? [
              "Choropleth por prioridade (peso × alcance), com camadas de peso, alcance e votos reais.",
              "Quadrantes: onde concentrar, onde só entrar com estrutura, o que defender, o que ignorar.",
              "Ficha de cada município com a decomposição, a confiança do alcance e as fontes.",
            ]
          : [
              "Choropleth by priority (weight × reach), with weight, reach and actual-vote layers.",
              "Quadrants: where to concentrate, where to enter only with structure, what to defend, what to ignore.",
              "Per-municipality sheet with the breakdown, reach confidence and sources.",
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
          ifet={{
            municipios: ifet.municipios,
            byCode: ifet.byCode,
            pesoByCode: ifet.pesoByCode,
            alcanceByCode: ifet.alcanceByCode,
            modo: ifet.modo,
          }}
          base={territorio.base}
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
              {t.ifet.pesoEleitoral} {Math.round(ifet.pesos.pesoEleitoral * 100)}% · {t.ifet.disputabilidade}{" "}
              {Math.round(ifet.pesos.disputabilidade * 100)}%
              {ifet.pesos.alcance > 0 && (
                <>
                  {" "}
                  · {t.ifet.desempenhoHistorico} {Math.round(ifet.pesos.alcance * 100)}%
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
