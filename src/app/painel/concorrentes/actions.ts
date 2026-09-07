"use server";

import { revalidatePath } from "next/cache";
import {
  adicionarConcorrente,
  adicionarConcorrenteTSE,
  removeCompareId,
  clearCompare,
} from "@/lib/candidacy";
import type { CandidatoEleitoral } from "@/lib/data-sources/eleitoral";

export type ConcorrenteState = { error?: string; ok?: boolean };

export async function adicionarConcorrenteAction(
  _prev: ConcorrenteState,
  formData: FormData,
): Promise<ConcorrenteState> {
  const source = String(formData.get("source") ?? "");
  if (source === "camara" || source === "senado") {
    const externalId = String(formData.get("externalId") ?? "");
    if (!externalId) return { error: "Seleção inválida." };
    const res = await adicionarConcorrente(source, externalId);
    if (!res.ok) return { error: res.error };
  } else if (source === "tse") {
    let cand: CandidatoEleitoral;
    try {
      cand = JSON.parse(String(formData.get("candidato") ?? "")) as CandidatoEleitoral;
    } catch {
      return { error: "Seleção inválida." };
    }
    if (!cand?.externalId || !cand?.cargo) return { error: "Seleção inválida." };
    const res = await adicionarConcorrenteTSE(cand);
    if (!res.ok) return { error: res.error };
  } else {
    return { error: "Seleção inválida." };
  }
  revalidatePath("/painel/concorrentes");
  return { ok: true };
}

export async function removerConcorrenteAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await removeCompareId(id);
  revalidatePath("/painel/concorrentes");
}

export async function limparConcorrentesAction(): Promise<void> {
  await clearCompare();
  revalidatePath("/painel/concorrentes");
}
