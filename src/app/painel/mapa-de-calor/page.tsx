import type { Metadata } from "next";
import { ToolShell } from "@/components/app/ToolShell";
import { HeatGrid } from "@/components/viz/mocks";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Mapa de Calor de Influência" };

export default async function Page() {
  const pt = (await getLocale()) === "pt";
  return (
    <ToolShell
      id="mapa-de-calor"
      updatedAt="2024-10-06"
      howItWorks={
        pt
          ? [
              "Seleciona cargo, turno e recorte territorial.",
              "Busca votação por seção/zona/município no TSE (série histórica).",
              "Normaliza por eleitorado apto e compara turnos.",
              "Renderiza a intensidade sobre a malha do IBGE.",
            ]
          : [
              "Select office, round and territorial scope.",
              "Fetch vote by precinct/zone/municipality from the TSE (historical series).",
              "Normalise by eligible electorate and compare rounds.",
              "Render intensity over the IBGE mesh.",
            ]
      }
      outputs={
        pt
          ? [
              "Mapa de calor por zona e município.",
              "Bolsões de crescimento e de perda entre eleições.",
              "Ranking de prioridade territorial para alocação de recursos.",
            ]
          : [
              "Heatmap by zone and municipality.",
              "Pockets of growth and loss between elections.",
              "Territorial priority ranking for resource allocation.",
            ]
      }
    >
      <HeatGrid />
    </ToolShell>
  );
}
