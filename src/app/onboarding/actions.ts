"use server";

import { redirect } from "next/navigation";
import { selectCandidacy } from "@/lib/candidacy";
import type { Fonte } from "@/lib/politico";

export type OnboardingState = { error?: string };

export async function finalizarOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const source = String(formData.get("source") ?? "") as Fonte;
  const externalId = String(formData.get("externalId") ?? "");
  const objective = String(formData.get("objective") ?? "avaliando");

  if ((source !== "camara" && source !== "senado") || !externalId) {
    return { error: "Seleção inválida." };
  }

  const res = await selectCandidacy(source, externalId, objective);
  if (!res.ok) return { error: res.error };

  redirect("/painel");
}
