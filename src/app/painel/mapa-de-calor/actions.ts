"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCandidacyId } from "@/lib/candidacy";
import { retryVotacao } from "@/lib/candidacy";

export async function retryVotacaoAction(): Promise<string> {
  const id = await getCurrentCandidacyId();
  if (!id) return "vazio";
  const status = await retryVotacao(id);
  revalidatePath("/painel/mapa-de-calor");
  revalidatePath("/painel/mapa-de-influencia");
  revalidatePath("/painel");
  return status;
}
