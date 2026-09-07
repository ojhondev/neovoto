import type { Metadata } from "next";
import { ToolShell } from "@/components/app/ToolShell";
import { ModuloRoadmap } from "@/components/app/ModuloRoadmap";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Matriz Ideológica por Região" };

export default async function Page() {
  const pt = (await getLocale()) === "pt";
  return (
    <ToolShell
      id="matriz-ideologica"
      updatedAt="—"
      howItWorks={
        pt
          ? [
              "Agrega votação por partido em cada região no período selecionado (TSE).",
              "Aplica pesos ideológicos de partidos revisáveis e transparentes.",
              "Ajusta pelo contexto socioeconômico da região (IBGE).",
              "Projeta cada região em eixos temáticos comparáveis.",
            ]
          : [
              "Aggregates party vote in each region over the selected period (TSE).",
              "Applies transparent, revisable party ideology weights.",
              "Adjusts for the region's socioeconomic context (IBGE).",
              "Projects each region onto comparable thematic axes.",
            ]
      }
      outputs={
        pt
          ? [
              "Posição relativa de cada região nos eixos econômico e de costumes.",
              "Distância entre a candidatura e cada região.",
              "Agrupamentos de regiões com perfil semelhante.",
            ]
          : [
              "Relative position of each region on economic and social-values axes.",
              "Distance between the campaign and each region.",
              "Clusters of regions with similar profile.",
            ]
      }
    >
      <ModuloRoadmap
        pergunta={
          pt
            ? "O que cada região quer ouvir — e onde o seu discurso ganha ou perde voto?"
            : "What does each region want to hear — and where does your message win or lose votes?"
        }
        entrega={
          pt
            ? "O módulo vai posicionar cada município nos eixos econômico e de costumes a partir da votação agregada por partido (Base dos Dados) e dos indicadores do IBGE, com uma escala de partido transparente e editável. Sem inferência sobre indivíduos."
            : "The module will place each municipality on the economic and social-values axes from aggregate party vote (Base dos Dados) and IBGE indicators, with a transparent, editable party scale. No inference about individuals."
        }
        etapas={[
          { label: pt ? "Votação por partido e município (Base dos Dados)" : "Vote by party and municipality (Base dos Dados)", feito: true },
          { label: pt ? "Indicadores socioeconômicos por município (IBGE)" : "Socioeconomic indicators by municipality (IBGE)", feito: true },
          { label: pt ? "Escala ideológica de partido (transparente, editável)" : "Party ideology scale (transparent, editable)", feito: true },
          { label: pt ? "Projeção nos eixos + distância candidato↔região" : "Axis projection + candidate↔region distance", feito: false },
        ]}
      />
    </ToolShell>
  );
}
