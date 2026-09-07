import type { Metadata } from "next";
import { ToolShell } from "@/components/app/ToolShell";
import { ScenarioBands } from "@/components/viz/mocks";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Cenários Estatísticos" };

export default async function Page() {
  const pt = (await getLocale()) === "pt";
  return (
    <ToolShell
      id="cenarios"
      updatedAt="2024-10-06"
      howItWorks={
        pt
          ? [
              "Você declara o objetivo (ex.: vencer no 1º turno, eleger N cadeiras).",
              "O motor monta um modelo com histórico eleitoral, contexto do IBGE e composição de coligações.",
              "Roda milhares de simulações variando premissas (comparecimento, transferência, cenário nacional).",
              "Retorna faixas de resultado com probabilidade e a ficha técnica de cada cenário.",
            ]
          : [
              "You declare the objective (e.g. win in the first round, elect N seats).",
              "The engine builds a model from electoral history, IBGE context and coalition composition.",
              "Runs thousands of simulations varying assumptions (turnout, transfer, national mood).",
              "Returns result ranges with probability and a technical sheet per scenario.",
            ]
      }
      outputs={
        pt
          ? [
              "Distribuição de resultado (p10 / mediana / p90) por cenário.",
              "Sensibilidade: quais premissas mais mudam o resultado.",
              "Comparação entre o cenário-objetivo e o cenário-base.",
            ]
          : [
              "Result distribution (p10 / median / p90) per scenario.",
              "Sensitivity: which assumptions move the result most.",
              "Comparison between the objective scenario and the base scenario.",
            ]
      }
    >
      <ScenarioBands />
    </ToolShell>
  );
}
