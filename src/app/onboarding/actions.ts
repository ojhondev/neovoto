"use server";

import { redirect } from "next/navigation";
import { selectCandidacy, selectCandidacyTSE } from "@/lib/candidacy";
import type { CandidatoEleitoral } from "@/lib/data-sources/eleitoral";

export type OnboardingState = { error?: string };

export async function finalizarOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const source = String(formData.get("source") ?? "");
  const objective = String(formData.get("objective") ?? "avaliando");

  if (source === "camara" || source === "senado") {
    const externalId = String(formData.get("externalId") ?? "");
    if (!externalId) return { error: "Seleção inválida." };
    const res = await selectCandidacy(source, externalId, objective);
    if (!res.ok) return { error: res.error };
    redirect("/painel");
  }

  if (source === "tse") {
    const payload = String(formData.get("candidato") ?? "");
    let cand: CandidatoEleitoral;
    try {
      cand = JSON.parse(payload) as CandidatoEleitoral;
    } catch {
      return { error: "Seleção inválida." };
    }
    if (!cand?.externalId || !cand?.cargo) return { error: "Seleção inválida." };
    const res = await selectCandidacyTSE(cand, objective);
    if (!res.ok) return { error: res.error };
    redirect("/painel");
  }

  return { error: "Seleção inválida." };
}
