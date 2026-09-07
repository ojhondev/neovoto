import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { candidacies, type Candidacy } from "@/db/schema";
import { montarPerfil, type Fonte, type PerfilPolitico } from "@/lib/politico";
import type { Cargo } from "@/lib/cargos";

export const CANDIDACY_COOKIE = "neovoto_candidacy";

export async function getCurrentCandidacyId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CANDIDACY_COOKIE)?.value ?? null;
}

export async function getCurrentCandidacy(): Promise<Candidacy | null> {
  const id = await getCurrentCandidacyId();
  if (!id) return null;
  try {
    const rows = await db.select().from(candidacies).where(eq(candidacies.id, id)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Perfil tipado a partir do snapshot salvo (candidacies.raw). */
export function perfilFrom(c: Candidacy): PerfilPolitico | null {
  const raw = c.raw as unknown;
  if (raw && typeof raw === "object" && "nome" in raw) return raw as PerfilPolitico;
  return null;
}

/** Cargo canônico da candidatura (hoje derivado da casa; brasil.io grava o real). */
export function cargoOf(c: Candidacy): Cargo {
  const raw = (c.raw ?? {}) as { cargo?: Cargo };
  if (raw.cargo) return raw.cargo;
  return c.source === "senado" ? "senador" : "deputado-federal";
}

/**
 * Cria (ou atualiza) a candidatura em análise a partir de uma fonte oficial e
 * aponta o cookie para ela. Puxa o perfil real na hora.
 */
export async function selectCandidacy(
  source: Fonte,
  externalId: string,
  objective: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const perfil = await montarPerfil(source, externalId);
  if (!perfil) return { ok: false, error: "Não foi possível carregar o perfil oficial." };

  try {
    const existing = await db
      .select({ id: candidacies.id })
      .from(candidacies)
      .where(eq(candidacies.externalId, externalId))
      .limit(1);

    let id: string;
    if (existing[0]) {
      id = existing[0].id;
      await db
        .update(candidacies)
        .set({
          name: perfil.nome,
          party: perfil.partido,
          uf: perfil.uf,
          house: source,
          photoUrl: perfil.foto,
          email: perfil.email,
          objective,
          raw: perfil as unknown as Record<string, unknown>,
          refreshedAt: new Date(),
        })
        .where(eq(candidacies.id, id));
    } else {
      const inserted = await db
        .insert(candidacies)
        .values({
          source,
          externalId,
          name: perfil.nome,
          party: perfil.partido,
          uf: perfil.uf,
          house: source,
          photoUrl: perfil.foto,
          email: perfil.email,
          objective,
          raw: perfil as unknown as Record<string, unknown>,
        })
        .returning({ id: candidacies.id });
      id = inserted[0].id;
    }

    const store = await cookies();
    store.set(CANDIDACY_COOKIE, id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
      sameSite: "lax",
    });
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Falha ao gravar a candidatura." };
  }
}

export async function clearCandidacy() {
  const store = await cookies();
  store.delete(CANDIDACY_COOKIE);
}
