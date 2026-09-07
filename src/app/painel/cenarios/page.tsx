import type { Metadata } from "next";
import { ToolShell } from "@/components/app/ToolShell";
import { ModuloRoadmap } from "@/components/app/ModuloRoadmap";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Cenários Estatísticos" };

export default async function Page() {
  const pt = (await getLocale()) === "pt";
  return (
    <ToolShell
      id="cenarios"
      updatedAt="—"
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
      <ModuloRoadmap
        pergunta={
          pt
            ? "Quanto falta para você ganhar — e o que move o ponteiro mais rápido?"
            : "How much is missing for you to win — and what moves the needle fastest?"
        }
        entrega={
          pt
            ? "O módulo vai partir do seu objetivo e da votação real por município (já carregada no Mapa de Calor) para estimar faixas de resultado e a sensibilidade a cada premissa. Depende do motor estatístico (serviço separado)."
            : "The module will start from your objective and the real vote by municipality (already loaded in the Heatmap) to estimate result ranges and sensitivity to each assumption. It depends on the statistical engine (separate service)."
        }
        etapas={[
          { label: pt ? "Votação real por município (Base dos Dados)" : "Real vote by municipality (Base dos Dados)", feito: true },
          { label: pt ? "IFET e contexto territorial (IBGE)" : "IFET and territorial context (IBGE)", feito: true },
          { label: pt ? "Motor de simulação (Monte Carlo / bayesiano) — serviço Python" : "Simulation engine (Monte Carlo / Bayesian) — Python service", feito: false },
          { label: pt ? "Backtesting contra eleições anteriores" : "Backtesting against past elections", feito: false },
        ]}
      />
    </ToolShell>
  );
}
