import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacyId } from "@/lib/candidacy";
import { PreparandoScreen } from "@/components/onboarding/PreparandoScreen";

export const metadata: Metadata = { title: "Preparando", robots: { index: false } };

export default async function PreparandoPage() {
  const candId = await getCurrentCandidacyId();
  if (!candId) redirect("/onboarding");

  const { t } = await getDictionary();
  return <PreparandoScreen dict={t.preparando} />;
}
