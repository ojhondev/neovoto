"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  clearCandidacy,
  getCurrentCandidacyId,
  updateBaseTerritorial,
  adicionarApoio,
} from "@/lib/candidacy";

export async function trocarCandidato() {
  await clearCandidacy();
  redirect("/onboarding");
}

export async function salvarBaseTerritorial(
  _prev: { ok?: boolean; error?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const id = await getCurrentCandidacyId();
  if (!id) return { error: "Sem candidatura ativa." };
  const municipioBase = String(formData.get("municipioBase") ?? "").trim();
  const extras = String(formData.get("extras") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  const res = await updateBaseTerritorial(id, municipioBase, extras);
  if (!res.ok) return { error: "Não foi possível salvar." };
  revalidarPainel();
  return { ok: true };
}

export async function adicionarApoioSugerido(formData: FormData): Promise<void> {
  const id = await getCurrentCandidacyId();
  if (!id) return;
  await adicionarApoio(id, {
    externalId: String(formData.get("externalId") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    cargo: String(formData.get("cargo") ?? ""),
  });
  revalidarPainel();
}

function revalidarPainel() {
  for (const p of [
    "/painel",
    "/painel/candidato",
    "/painel/mapa-de-calor",
    "/painel/mapa-de-influencia",
    "/painel/cenarios",
    "/painel/como-ganhar",
    "/painel/relatorio",
  ]) {
    revalidatePath(p);
  }
}
