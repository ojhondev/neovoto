"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCandidacyId } from "@/lib/candidacy";
import {
  clipInsight,
  unclipInsight,
  clearInsights,
  generateReport,
  type ClipInput,
} from "@/lib/report";

export async function clipAction(item: ClipInput): Promise<{ ok: boolean }> {
  const id = await getCurrentCandidacyId();
  if (!id) return { ok: false };
  await clipInsight(id, item);
  revalidatePath("/painel/relatorio");
  revalidatePath("/painel", "layout");
  return { ok: true };
}

export async function unclipAction(formData: FormData): Promise<void> {
  const itemId = String(formData.get("id") ?? "");
  if (itemId) await unclipInsight(itemId);
  revalidatePath("/painel/relatorio");
}

export async function clearAction(): Promise<void> {
  const id = await getCurrentCandidacyId();
  if (id) await clearInsights(id);
  revalidatePath("/painel/relatorio");
}

export async function gerarAction(): Promise<void> {
  const res = await generateReport();
  if (res.ok) redirect(`/painel/relatorio/${res.code}`);
  redirect("/painel/relatorio?erro=1");
}
