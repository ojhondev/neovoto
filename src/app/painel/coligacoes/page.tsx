import type { Metadata } from "next";
import { ToolShell } from "@/components/app/ToolShell";
import { CoalitionBars } from "@/components/viz/mocks";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Coligações" };

export default async function Page() {
  const pt = (await getLocale()) === "pt";
  return (
    <ToolShell
      id="coligacoes"
      updatedAt="2024-08-15"
      howItWorks={
        pt
          ? [
              "Escolhe os partidos e federações candidatos à composição.",
              "Soma votação histórica, bases municipais, fundo partidário e tempo de propaganda.",
              "Desconta a sobreposição de bases para estimar o ganho marginal real.",
              "Compara as composições possíveis lado a lado.",
            ]
          : [
              "Pick the parties and federations in the candidate composition.",
              "Sum historical vote, municipal footholds, party fund and broadcast time.",
              "Discount base overlap to estimate the real marginal gain.",
              "Compare the possible compositions side by side.",
            ]
      }
      outputs={
        pt
          ? [
              "Alcance estimado de cada composição.",
              "Sobreposição de base entre parceiros.",
              "Ganho marginal por partido adicionado.",
              "Efeito no tempo de TV e no fundo.",
            ]
          : [
              "Estimated reach of each composition.",
              "Base overlap between partners.",
              "Marginal gain per added party.",
              "Effect on broadcast time and fund.",
            ]
      }
    >
      <CoalitionBars />
    </ToolShell>
  );
}
