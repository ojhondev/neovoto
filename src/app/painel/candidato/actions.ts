"use server";

import { redirect } from "next/navigation";
import { clearCandidacy } from "@/lib/candidacy";

export async function trocarCandidato() {
  await clearCandidacy();
  redirect("/onboarding");
}
