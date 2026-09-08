import { NextResponse } from "next/server";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getDictionary } from "@/lib/i18n";
import { analisarCandidatura } from "@/lib/intel/motor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Aquece os caches do Motor NeoVoto logo após o onboarding, enquanto a tela
 * `/preparando` roda a animação. Roda a mesma análise que o painel faria — assim
 * o primeiro carregamento do `/painel` já vem quente. Nunca falha "para fora":
 * se algo der errado, devolve ok e o painel recalcula normalmente.
 */
export async function GET() {
  try {
    const candidacy = await getCurrentCandidacy();
    if (!candidacy) return NextResponse.json({ ok: false, reason: "no-candidacy" });
    const perfil = perfilFrom(candidacy);
    if (!perfil) return NextResponse.json({ ok: false, reason: "no-perfil" });

    const { locale, t } = await getDictionary();
    await analisarCandidatura(candidacy, perfil, t, locale === "pt" ? "pt" : "en").catch(
      () => null,
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, warmed: false });
  }
}
