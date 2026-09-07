import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { candidacies, type Candidacy } from "@/db/schema";
import {
  montarPerfil,
  perfilFromCandidatoEleitoral,
  type Fonte,
  type PerfilPolitico,
} from "@/lib/politico";
import type { CandidatoEleitoral } from "@/lib/data-sources/eleitoral";
import { ingestVotacao, setEleitoralStatus } from "@/lib/data-sources/eleitoral";
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

export function perfilFrom(c: Candidacy): PerfilPolitico | null {
  const raw = c.raw as unknown;
  if (raw && typeof raw === "object" && "nome" in raw) return raw as PerfilPolitico;
  return null;
}

export function cargoOf(c: Candidacy): Cargo {
  if (c.cargo) return c.cargo as Cargo;
  const raw = (c.raw ?? {}) as { cargo?: Cargo };
  if (raw.cargo) return raw.cargo;
  return c.source === "senado" ? "senador" : "deputado-federal";
}

async function persist(
  perfil: PerfilPolitico,
  source: Fonte,
  externalId: string,
  objective: string,
  extra: { cargo?: string; electionYear?: number; electoralStatus: string },
): Promise<string> {
  const existing = await db
    .select({ id: candidacies.id })
    .from(candidacies)
    .where(eq(candidacies.externalId, externalId))
    .limit(1);

  const values = {
    name: perfil.nome,
    party: perfil.partido,
    uf: perfil.uf,
    house: source,
    cargo: extra.cargo ?? null,
    electionYear: extra.electionYear ?? null,
    photoUrl: perfil.foto || null,
    email: perfil.email,
    objective,
    raw: perfil as unknown as Record<string, unknown>,
    electoralStatus: extra.electoralStatus,
    refreshedAt: new Date(),
  };

  let id: string;
  if (existing[0]) {
    id = existing[0].id;
    await db.update(candidacies).set(values).where(eq(candidacies.id, id));
  } else {
    const inserted = await db
      .insert(candidacies)
      .values({ source, externalId, ...values })
      .returning({ id: candidacies.id });
    id = inserted[0].id;
  }

  const store = await cookies();
  store.set(CANDIDACY_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
  return id;
}

/** Candidatura a partir de Câmara ou Senado (dados de mandato federal atual). */
export async function selectCandidacy(
  source: "camara" | "senado",
  externalId: string,
  objective: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const perfil = await montarPerfil(source, externalId);
  if (!perfil) return { ok: false, error: "Não foi possível carregar o perfil oficial." };
  try {
    const id = await persist(perfil, source, externalId, objective, {
      cargo: perfil.cargo,
      electoralStatus: "na",
    });
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Falha ao gravar a candidatura." };
  }
}

/** Candidatura a partir do espelho do TSE (brasil.io) — qualquer cargo. */
export async function selectCandidacyTSE(
  cand: CandidatoEleitoral,
  objective: string,
): Promise<{ ok: true; id: string; electoral: string } | { ok: false; error: string }> {
  try {
    const perfil = await perfilFromCandidatoEleitoral(cand);
    const id = await persist(perfil, "tse", cand.externalId, objective, {
      cargo: cand.cargo,
      electionYear: cand.ano,
      electoralStatus: "pendente",
    });
    // ingestão da votação (uma vez, cacheada). Pode falhar por rate limit.
    let electoral = "pendente";
    try {
      electoral = await ingestVotacao(id);
    } catch {
      electoral = "indisponivel";
    }
    await setEleitoralStatus(id, electoral);
    return { ok: true, id, electoral };
  } catch {
    return { ok: false, error: "Falha ao gravar a candidatura." };
  }
}

export async function clearCandidacy() {
  const store = await cookies();
  store.delete(CANDIDACY_COOKIE);
}

/** Reprocessa a votação de uma candidatura TSE (quando ficou "indisponivel"). */
export async function retryVotacao(candidacyId: string): Promise<string> {
  let status: string;
  try {
    status = await ingestVotacao(candidacyId);
  } catch {
    status = "indisponivel";
  }
  await setEleitoralStatus(candidacyId, status);
  return status;
}
