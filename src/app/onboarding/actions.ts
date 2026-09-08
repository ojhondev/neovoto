"use server";

import { redirect } from "next/navigation";
import {
  selectCandidacy,
  selectCandidacyTSE,
  selectCandidacyManual,
} from "@/lib/candidacy";
import type { CandidatoEleitoral } from "@/lib/data-sources/eleitoral";

export type OnboardingState = { error?: string };

export async function finalizarOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const source = String(formData.get("source") ?? "");
  const objective = String(formData.get("objective") ?? "avaliando");
  const cargoAlvo = String(formData.get("cargoAlvo") ?? "");

  if (source === "camara" || source === "senado") {
    const externalId = String(formData.get("externalId") ?? "");
    if (!externalId) return { error: "Seleção inválida." };
    const res = await selectCandidacy(source, externalId, objective, cargoAlvo);
    if (!res.ok) return { error: res.error };
    redirect("/painel");
  }

  if (source === "tse") {
    let cand: CandidatoEleitoral;
    try {
      cand = JSON.parse(String(formData.get("candidato") ?? "")) as CandidatoEleitoral;
    } catch {
      return { error: "Seleção inválida." };
    }
    if (!cand?.externalId || !cand?.cargo) return { error: "Seleção inválida." };
    const res = await selectCandidacyTSE(cand, objective, cargoAlvo);
    if (!res.ok) return { error: res.error };
    redirect("/painel");
  }

  if (source === "manual") {
    const res = await selectCandidacyManual(
      {
        nome: String(formData.get("nome") ?? ""),
        partido: String(formData.get("partido") ?? ""),
        uf: String(formData.get("uf") ?? ""),
        cargo: cargoAlvo || "deputado-estadual",
      },
      objective,
    );
    if (!res.ok) return { error: res.error };
    redirect("/painel");
  }

  return { error: "Seleção inválida." };
}
