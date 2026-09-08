/**
 * Relatório recortável: a equipe "aplica ao relatório" insights de qualquer
 * módulo; ao gerar, a NeoVoto monta o documento completo + os recortes, calcula
 * um hash e emite um código curto de verificação (QR).
 */
import { createHash, randomBytes } from "node:crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { reportItems, reports } from "@/db/schema";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getDictionary } from "@/lib/i18n";
import { computeRelatorio, type RelatorioNeoVoto } from "@/lib/intel/relatorio";

export type ClipInput = {
  modulo: string;
  titulo: string;
  texto: string;
  payload?: Record<string, unknown>;
};

export async function clipInsight(candidacyId: string, item: ClipInput) {
  await db.insert(reportItems).values({
    candidacyId,
    modulo: item.modulo,
    titulo: item.titulo,
    texto: item.texto,
    payload: item.payload ?? {},
  });
}

export async function unclipInsight(id: string) {
  await db.delete(reportItems).where(eq(reportItems.id, id));
}

export async function clearInsights(candidacyId: string) {
  await db.delete(reportItems).where(eq(reportItems.candidacyId, candidacyId));
}

export async function listInsights(candidacyId: string) {
  return db
    .select()
    .from(reportItems)
    .where(eq(reportItems.candidacyId, candidacyId))
    .orderBy(desc(reportItems.createdAt));
}

export async function countInsights(candidacyId: string): Promise<number> {
  const rows = await listInsights(candidacyId).catch(() => []);
  return rows.length;
}

function code6(): string {
  const b = randomBytes(5).toString("hex").toUpperCase();
  return `${b.slice(0, 4)}-${b.slice(4, 8)}`;
}

export type ReportContent = {
  relatorio: RelatorioNeoVoto;
  recortes: { modulo: string; titulo: string; texto: string }[];
  geradoEm: string;
};

/** Gera o relatório da candidatura ativa. Retorna o código de verificação. */
export async function generateReport(): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;
  if (!candidacy || !perfil) return { ok: false, error: "sem candidatura" };
  const { locale, t } = await getDictionary();

  let relatorio: RelatorioNeoVoto;
  try {
    relatorio = await computeRelatorio(candidacy, perfil, t, locale === "pt" ? "pt" : "en");
  } catch {
    return { ok: false, error: "falha ao computar o relatório" };
  }

  const itens = await listInsights(candidacy.id).catch(() => []);
  const conteudo: ReportContent = {
    relatorio,
    recortes: itens.map((i) => ({ modulo: i.modulo, titulo: i.titulo, texto: i.texto })),
    geradoEm: new Date().toISOString(),
  };

  const hash = createHash("sha256").update(JSON.stringify(conteudo)).digest("hex").slice(0, 16);
  const code = code6();
  await db.insert(reports).values({
    code,
    candidacyId: candidacy.id,
    candidatoNome: perfil.nome,
    hash,
    conteudo: conteudo as unknown as Record<string, unknown>,
  });
  return { ok: true, code };
}

export async function getReport(code: string) {
  const rows = await db.select().from(reports).where(eq(reports.code, code.toUpperCase())).limit(1);
  return rows[0] ?? null;
}
