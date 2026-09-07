import type { Metadata } from "next";
import { ToolShell } from "@/components/app/ToolShell";
import { ProposalBars } from "@/components/viz/mocks";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Mapa de Propostas" };

export default async function Page() {
  const pt = (await getLocale()) === "pt";
  return (
    <ToolShell
      id="mapa-de-propostas"
      updatedAt="2024-08-15"
      howItWorks={
        pt
          ? [
              "Importa as propostas de governo registradas no TSE.",
              "Classifica cada proposta por tema com vocabulário controlado.",
              "Coleta temas em tramitação na Câmara e no Senado por região de origem.",
              "Compara a ênfase da candidatura com a demanda observável por tema e região.",
            ]
          : [
              "Imports the government proposals filed with the TSE.",
              "Classifies each proposal by theme with a controlled vocabulary.",
              "Collects issues in progress in the Chamber and Senate by region of origin.",
              "Compares the campaign's emphasis with observable demand by theme and region.",
            ]
      }
      outputs={
        pt
          ? [
              "Matriz tema × ênfase × demanda.",
              "Lacunas: temas com demanda alta e baixa ênfase.",
              "Sobreposições: esforço concentrado onde a demanda é baixa.",
            ]
          : [
              "Theme × emphasis × demand matrix.",
              "Gaps: high-demand, low-emphasis themes.",
              "Overlaps: effort concentrated where demand is low.",
            ]
      }
    >
      <ProposalBars />
    </ToolShell>
  );
}
