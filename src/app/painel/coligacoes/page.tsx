import type { Metadata } from "next";
import { ToolShell } from "@/components/app/ToolShell";
import { ModuloRoadmap } from "@/components/app/ModuloRoadmap";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Coligações" };

export default async function Page() {
  const pt = (await getLocale()) === "pt";
  return (
    <ToolShell
      id="coligacoes"
      updatedAt="—"
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
      <ModuloRoadmap
        pergunta={
          pt
            ? "Que aliança te elege — e qual só divide o palanque?"
            : "Which alliance elects you — and which one just splits the stage?"
        }
        entrega={
          pt
            ? "O módulo vai comparar composições possíveis somando a votação histórica dos partidos por município (Base dos Dados), descontando a sobreposição de base, e cruzando com fundo e tempo de TV. Coligação proporcional é proibida desde 2020 (EC 97/2017) — o foco é a majoritária."
            : "The module will compare possible compositions by summing parties' historical vote by municipality (Base dos Dados), discounting base overlap, and crossing with fund and broadcast time. Proportional coalitions have been banned since 2020 — the focus is majority races."
        }
        etapas={[
          { label: pt ? "Votação por partido e município (Base dos Dados)" : "Vote by party and municipality (Base dos Dados)", feito: true },
          { label: pt ? "Cadastro de partidos e federações (TSE)" : "Party and federation registry (TSE)", feito: true },
          { label: pt ? "Cálculo de ganho marginal e sobreposição de base" : "Marginal-gain and base-overlap calculation", feito: false },
          { label: pt ? "Fundo partidário e tempo de propaganda por composição" : "Party fund and broadcast time per composition", feito: false },
        ]}
      />
    </ToolShell>
  );
}
