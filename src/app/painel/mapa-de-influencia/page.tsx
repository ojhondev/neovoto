import type { Metadata } from "next";
import { ToolShell } from "@/components/app/ToolShell";
import { InfluenceNetwork } from "@/components/viz/InfluenceNetwork";
import { influenceMapMock } from "@/lib/mock/influence-map";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Mapa de Influência" };

export default async function Page() {
  const locale = await getLocale();
  const pt = locale === "pt";
  return (
    <ToolShell
      id="mapa-de-influencia"
      updatedAt={influenceMapMock.updatedAt}
      howItWorks={
        pt
          ? [
              "Carrega resultados eleitorais por município e zona do TSE para o recorte escolhido.",
              "Cruza com coligações, federações e mandatos ativos (Câmara e Senado).",
              "Estima peso de cada ator e a força dos vínculos a partir de votação conjunta histórica.",
              "Posiciona a rede sobre o território e destaca pontos de decisão.",
            ]
          : [
              "Loads TSE electoral results by municipality and zone for the chosen scope.",
              "Cross-references coalitions, federations and active mandates (Chamber and Senate).",
              "Estimates each actor's weight and tie strength from historical joint vote.",
              "Places the network over the territory and highlights decision points.",
            ]
      }
      outputs={
        pt
          ? [
              "Rede de atores dimensionada por peso eleitoral.",
              "Vínculos classificados (coligação, histórico, territorial).",
              "Alertas de base a disputar e de pontes entre blocos.",
              "Exportação com ficha técnica e fontes.",
            ]
          : [
              "Actor network sized by electoral weight.",
              "Classified ties (coalition, historical, territorial).",
              "Alerts on contested bases and bridges between blocs.",
              "Export with technical sheet and sources.",
            ]
      }
    >
      <InfluenceNetwork />
    </ToolShell>
  );
}
