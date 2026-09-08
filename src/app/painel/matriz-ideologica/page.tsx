import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { Info } from "@/components/app/Info";
import { MatrizViews } from "@/components/app/MatrizViews";
import { ModuloRoadmap } from "@/components/app/ModuloRoadmap";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getEstadoPorSigla, getPopulacaoMunicipiosUF, getPibMunicipiosUF } from "@/lib/data-sources/ibge";
import { getIfetResumoNacional } from "@/lib/territory";
import { getVotacaoPartidoUF, getVotacaoPartidoNacional } from "@/lib/data-sources/regional";
import { escopoNacional, PLEITO_NACIONAL, pleitoNacionalLabel } from "@/lib/escopo";
import type { Cargo } from "@/lib/cargos";
import { computeMatriz, MATRIZ_PLEITO } from "@/lib/intel/matriz";

export const metadata: Metadata = { title: "Matriz Ideológica por Região" };

function fill(t: string, v: Record<string, string | number>) {
  return Object.entries(v).reduce((s, [k, val]) => s.replaceAll(`{${k}}`, String(val)), t);
}

export default async function Page() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  const howItWorks = pt
    ? [
        "Puxa a votação por partido em cada município no último pleito presidencial (Base dos Dados).",
        "Aplica a escala ideológica de partido — transparente e editável.",
        "Ajusta levemente o eixo econômico pelo PIB per capita do município (IBGE).",
        "Projeta cada município nos eixos e mede a distância até o candidato.",
      ]
    : [
        "Pulls party vote in each municipality in the last presidential election (Base dos Dados).",
        "Applies the party ideology scale — transparent and editable.",
        "Lightly adjusts the economic axis by the municipality's GDP per capita (IBGE).",
        "Projects each municipality onto the axes and measures the distance to the candidate.",
      ];
  const outputs = pt
    ? ["Posição de cada município nos eixos econômico e de costumes.", "Regiões mais afins e mais distantes do candidato.", "Média ideológica do estado."]
    : ["Each municipality's position on the economic and social-values axes.", "Regions most and least aligned with the candidate.", "The state's ideological average."];

  const cargo = (candidacy?.cargo as Cargo | null) ?? perfil?.cargo ?? null;
  const nacional = escopoNacional(cargo);

  if (!candidacy || !perfil || (!perfil.uf && !nacional)) {
    return (
      <ToolShell id="matriz-ideologica" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <div className="card">
          <p className="text-body-sm text-fossil">{t.maps.needCandidate}</p>
          <Link href="/onboarding" className="btn btn-primary mt-4">
            {t.maps.goOnboarding} <ArrowRight size={16} />
          </Link>
        </div>
      </ToolShell>
    );
  }

  const estado = nacional ? null : await getEstadoPorSigla(perfil.uf!);
  const resumoNac = nacional ? await getIfetResumoNacional(candidacy.id) : null;
  const [votacao, pops, pib] = await Promise.all([
    nacional
      ? getVotacaoPartidoNacional(PLEITO_NACIONAL.ano, PLEITO_NACIONAL.turno, PLEITO_NACIONAL.cargo)
      : getVotacaoPartidoUF(MATRIZ_PLEITO.ano, MATRIZ_PLEITO.turno, perfil.uf!, MATRIZ_PLEITO.cargo),
    nacional
      ? Promise.resolve(
          Object.fromEntries(
            Object.entries(resumoNac?.populacaoByCode ?? {}).map(([c, populacao]) => [
              c,
              { nome: resumoNac?.nomeByCode[c] ?? c, populacao },
            ]),
          ),
        )
      : estado
        ? getPopulacaoMunicipiosUF(estado.id)
        : Promise.resolve({}),
    nacional
      ? Promise.resolve(resumoNac?.pibByCode ?? {})
      : estado
        ? getPibMunicipiosUF(estado.id).catch(() => ({}) as Record<string, number>)
        : Promise.resolve({}),
  ]);

  if ((!estado && !nacional) || votacao.length < 100) {
    return (
      <ToolShell id="matriz-ideologica" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <ModuloRoadmap
          pergunta={pt ? "O que cada região quer ouvir?" : "What does each region want to hear?"}
          entrega={t.coligacoes.empty}
          etapas={[
            { label: pt ? "Votação por partido e município (Base dos Dados)" : "Vote by party and municipality (Base dos Dados)", feito: true },
            { label: pt ? "Escala ideológica de partido" : "Party ideology scale", feito: true },
            { label: pt ? "Dados carregados para este estado" : "Data loaded for this state", feito: false },
          ]}
        />
      </ToolShell>
    );
  }

  const nomeByCode: Record<string, string> = {};
  const populacaoByCode: Record<string, number> = {};
  for (const [code, v] of Object.entries(pops)) {
    nomeByCode[code] = (v as { nome: string }).nome;
    populacaoByCode[code] = (v as { populacao: number }).populacao;
  }

  const matriz = computeMatriz(
    votacao,
    { nomeByCode, populacaoByCode, pibByCode: pib },
    perfil.partido,
  );

  const nomeYou = perfil.nome;
  const ufNome = nacional ? "Brasil" : estado!.nome;
  const ufSigla = nacional ? "BR" : estado!.sigla;
  const pleito = nacional
    ? pleitoNacionalLabel(locale)
    : pt
      ? `presidente 2022 · 1º turno`
      : `president 2022 · 1st round`;
  const conclusao = pt
    ? `${ufNome} tende ${matriz.ufMedia.eco >= 0 ? "ao mercado" : "ao Estado"} no eixo econômico e ${matriz.ufMedia.soc >= 0 ? "ao conservadorismo" : "ao progressismo"} nos costumes. ${matriz.candidato.conhecido ? `Suas ${nacional ? "UFs" : "regiões"} mais afins são ${matriz.maisAfins.slice(0, 3).map((m) => m.nome).join(", ")}; o discurso precisa de tradução em ${matriz.maisDistantes.slice(0, 2).map((m) => m.nome).join(" e ")}.` : `O partido ${matriz.candidato.partido} não está na escala — ajuste a ficha para calibrar.`}`
    : `${ufNome} leans ${matriz.ufMedia.eco >= 0 ? "to the market" : "to the State"} economically and ${matriz.ufMedia.soc >= 0 ? "conservative" : "progressive"} on social values. ${matriz.candidato.conhecido ? `Your most aligned ${nacional ? "states" : "regions"} are ${matriz.maisAfins.slice(0, 3).map((m) => m.nome).join(", ")}; the message needs translation in ${matriz.maisDistantes.slice(0, 2).map((m) => m.nome).join(" and ")}.` : `Party ${matriz.candidato.partido} isn't in the scale — adjust the sheet to calibrate.`}`;

  return (
    <ToolShell
      id="matriz-ideologica"
      realData
      conclusao={conclusao}
      conclusaoTexto={conclusao}
      updatedAt={matriz.version}
      howItWorks={howItWorks}
      outputs={outputs}
    >
      <h2 className="t-heading flex items-center text-[22px]">
        {t.tools.ideologicalMatrix.name} <span className="mark ml-1 text-caption">{t.matriz.tag}</span>
        <Info label={t.matriz.tag}>{t.matriz.method}</Info>
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-fossil">
        {fill(
          nacional
            ? pt
              ? "Cada UF posicionada nos eixos econômico e de costumes, a partir da votação por partido no {pleito}. Quanto mais perto de {nome}, mais o discurso tende a ressoar ali."
              : "Each state placed on the economic and social-values axes, from party vote in the {pleito}. The closer to {nome}, the more the message resonates there."
            : t.matriz.intro,
          { uf: ufNome, pleito, nome: nomeYou },
        )}
      </p>
      {!matriz.candidato.conhecido && (
        <p className="font-ui mt-2 rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
          {fill(t.matriz.unknownParty, { partido: matriz.candidato.partido })}
        </p>
      )}
      <p className="font-ui mt-2 text-caption text-pebble">
        {fill(t.matriz.coverage, { pct: Math.round(matriz.cobertura * 100) })}
      </p>

      <div className="mt-6">
        <MatrizViews
          municipios={matriz.municipios}
          candidato={matriz.candidato}
          ufMedia={matriz.ufMedia}
          nomeYou={nomeYou}
          quadLabels={t.matriz.quadrants}
          labels={{
            axisEcoLeft: t.matriz.axisEcoLeft,
            axisEcoRight: t.matriz.axisEcoRight,
            axisSocLeft: t.matriz.axisSocLeft,
            axisSocRight: t.matriz.axisSocRight,
            you: nomeYou,
            ufAverage: fill(t.matriz.ufAverage, { uf: ufSigla }),
            distance: t.matriz.distance,
            quadrants: t.matriz.quadrants,
          }}
          locale={locale}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          { title: t.matriz.closest, list: matriz.maisAfins },
          { title: t.matriz.farthest, list: matriz.maisDistantes },
        ].map((col) => (
          <div key={col.title} className="card">
            <h3 className="t-heading text-[18px]">{col.title}</h3>
            <ol className="font-ui mt-3 divide-y divide-ash text-body-sm">
              {col.list.map((m) => (
                <li key={m.code} className="flex items-center justify-between py-2">
                  <span className="text-smoke">{m.nome}</span>
                  <span className="text-fossil">
                    {t.matriz.distance} {m.distancia}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.matriz.fichaTitle}</h3>
        <dl className="font-ui mt-3 grid gap-x-8 gap-y-3 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-pebble">{t.matriz.version}</dt>
            <dd className="text-smoke">{matriz.version}</dd>
          </div>
          <div>
            <dt className="text-pebble">{t.matriz.sources}</dt>
            <dd className="text-smoke">{matriz.fontes.join(" · ")}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-pebble">{t.matriz.pending}</dt>
          </div>
        </dl>
      </div>
    </ToolShell>
  );
}
