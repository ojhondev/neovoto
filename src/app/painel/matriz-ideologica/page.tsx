import type { Metadata } from "next";
import { ToolShell } from "@/components/app/ToolShell";
import { IdeologyScatter } from "@/components/viz/mocks";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Matriz Ideológica por Região" };

export default async function Page() {
  const pt = (await getLocale()) === "pt";
  return (
    <ToolShell
      id="matriz-ideologica"
      updatedAt="2022-10-30"
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
      <IdeologyScatter />
    </ToolShell>
  );
}
