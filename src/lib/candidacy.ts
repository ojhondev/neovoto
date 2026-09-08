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
export const COMPARE_COOKIE = "neovoto_compare";

export async function getCurrentCandidacyId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CANDIDACY_COOKIE)?.value ?? null;
}

/** Ids das candidaturas na "arena" de comparação (concorrentes). */
export async function getCompareIds(): Promise<string[]> {
  const store = await cookies();
  const raw = store.get(COMPARE_COOKIE)?.value ?? "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
}

async function setCompareIds(ids: string[]) {
  const store = await cookies();
  const uniq = [...new Set(ids)].slice(0, 4);
  if (uniq.length === 0) store.delete(COMPARE_COOKIE);
  else store.set(COMPARE_COOKIE, uniq.join(","), { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
}

export async function addCompareId(id: string) {
  const ids = await getCompareIds();
  if (!ids.includes(id)) await setCompareIds([...ids, id]);
}

export async function removeCompareId(id: string) {
  const ids = await getCompareIds();
  await setCompareIds(ids.filter((x) => x !== id));
}

export async function clearCompare() {
  await setCompareIds([]);
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

type Apoio = { source: string; externalId: string; nome: string; uf: string; cargo: string };

async function persist(
  perfil: PerfilPolitico,
  source: Fonte,
  externalId: string,
  objective: string,
  extra: {
    cargo?: string;
    electionYear?: number;
    electoralStatus: string;
    apoios?: Apoio[];
    anchorIbge?: string | null;
    birthMunicipio?: string | null;
    birthUf?: string | null;
  },
  opts: { setCookie?: boolean } = {},
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
    apoios: extra.apoios ?? [],
    ...(extra.anchorIbge !== undefined ? { anchorIbge: extra.anchorIbge } : {}),
    ...(extra.birthMunicipio !== undefined ? { birthMunicipio: extra.birthMunicipio } : {}),
    ...(extra.birthUf !== undefined ? { birthUf: extra.birthUf } : {}),
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

  if (opts.setCookie !== false) {
    const store = await cookies();
    store.set(CANDIDACY_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
  }
  return id;
}

/** Candidatura a partir de Câmara ou Senado (dados de mandato federal atual). */
export async function selectCandidacy(
  source: "camara" | "senado",
  externalId: string,
  objective: string,
  cargoAlvo?: string,
  apoios?: Apoio[],
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const perfil = await montarPerfil(source, externalId);
  if (!perfil) return { ok: false, error: "Não foi possível carregar o perfil oficial." };
  try {
    const id = await persist(perfil, source, externalId, objective, {
      cargo: cargoAlvo || perfil.cargo,
      electoralStatus: "na",
      apoios,
    });
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Falha ao gravar a candidatura." };
  }
}

/** Candidatura de um candidato cadastrado manualmente (1ª campanha). */
export async function selectCandidacyManual(
  input: { nome: string; partido: string; uf: string; cargo: string; municipioBase?: string },
  objective: string,
  apoios?: Apoio[],
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { perfilManual } = await import("@/lib/politico");
  if (!input.nome.trim() || !input.partido.trim() || !input.uf.trim()) {
    return { ok: false, error: "Preencha nome, partido e UF." };
  }
  try {
    const perfil = await perfilManual({
      nome: input.nome.trim(),
      partido: input.partido,
      uf: input.uf,
      cargo: input.cargo as Cargo,
    });
    const ext = perfil.externalId;
    const base = input.municipioBase?.trim();
    let anchorIbge: string | null = null;
    if (base) {
      try {
        const { getGeoUF, codeFromNome } = await import("@/lib/data-sources/geo");
        anchorIbge = codeFromNome(await getGeoUF(input.uf.toUpperCase()), base);
      } catch {
        /* resolve depois */
      }
    }
    const id = await persist(perfil, "manual", ext, objective, {
      cargo: input.cargo,
      electionYear: 2026,
      electoralStatus: "na",
      apoios,
      anchorIbge,
      birthMunicipio: base || null,
      birthUf: base ? input.uf.toUpperCase() : null,
    });
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Falha ao gravar a candidatura." };
  }
}

/** Atualiza a base territorial (âncora + municípios onde já atua) de uma candidatura. */
export async function updateBaseTerritorial(
  candidacyId: string,
  municipioBase: string,
  extras: string[],
): Promise<{ ok: boolean; anchor: string | null }> {
  const rows = await db.select().from(candidacies).where(eq(candidacies.id, candidacyId)).limit(1);
  const c = rows[0];
  if (!c || !c.uf) return { ok: false, anchor: null };
  const { getGeoUF, codeFromNome } = await import("@/lib/data-sources/geo");
  const geo = await getGeoUF(c.uf.toUpperCase()).catch(() => []);
  const anchor = municipioBase.trim() ? codeFromNome(geo, municipioBase.trim()) : null;
  const baseIbge = extras
    .map((n) => codeFromNome(geo, n.trim()))
    .filter((v): v is string => !!v);
  await db
    .update(candidacies)
    .set({
      anchorIbge: anchor,
      baseIbge,
      birthMunicipio: municipioBase.trim() || c.birthMunicipio,
      birthUf: municipioBase.trim() ? c.uf.toUpperCase() : c.birthUf,
      refreshedAt: new Date(),
    })
    .where(eq(candidacies.id, candidacyId));
  return { ok: true, anchor };
}

/** Candidatura a partir do espelho do TSE (brasil.io) — qualquer cargo. */
export async function selectCandidacyTSE(
  cand: CandidatoEleitoral,
  objective: string,
  cargoAlvo?: string,
  apoios?: Apoio[],
): Promise<{ ok: true; id: string; electoral: string } | { ok: false; error: string }> {
  try {
    const perfil = await perfilFromCandidatoEleitoral(cand);
    const id = await persist(perfil, "tse", cand.externalId, objective, {
      cargo: cargoAlvo || cand.cargo,
      electionYear: cand.ano,
      electoralStatus: "pendente",
      apoios,
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

/** Adiciona um concorrente à arena de comparação (TSE — qualquer cargo). */
export async function adicionarConcorrenteTSE(
  cand: CandidatoEleitoral,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const perfil = await perfilFromCandidatoEleitoral(cand);
    const id = await persist(
      perfil,
      "tse",
      cand.externalId,
      "concorrente",
      { cargo: cand.cargo, electionYear: cand.ano, electoralStatus: "pendente" },
      { setCookie: false },
    );
    try {
      await setEleitoralStatus(id, await ingestVotacao(id));
    } catch {
      /* ingest best-effort */
    }
    await addCompareId(id);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Falha ao adicionar o concorrente." };
  }
}

/** Adiciona um concorrente à arena (Câmara/Senado — mandato federal atual). */
export async function adicionarConcorrente(
  source: "camara" | "senado",
  externalId: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const perfil = await montarPerfil(source, externalId);
  if (!perfil) return { ok: false, error: "Não foi possível carregar o perfil oficial." };
  try {
    const id = await persist(
      perfil,
      source,
      externalId,
      "concorrente",
      { cargo: perfil.cargo, electoralStatus: "na" },
      { setCookie: false },
    );
    try {
      await setEleitoralStatus(id, await ingestVotacao(id));
    } catch {
      /* best-effort */
    }
    await addCompareId(id);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Falha ao adicionar o concorrente." };
  }
}

/** Adiciona um apoiador (padrinho) à candidatura ativa e recalcula a Base. */
export async function adicionarApoio(
  candidacyId: string,
  apoio: { externalId: string; nome: string; uf: string; cargo: string },
): Promise<{ ok: boolean }> {
  const rows = await db.select().from(candidacies).where(eq(candidacies.id, candidacyId)).limit(1);
  const c = rows[0];
  if (!c) return { ok: false };
  const atuais = (c.apoios as Apoio[] | null) ?? [];
  if (atuais.some((a) => a.externalId === apoio.externalId || a.nome.toUpperCase() === apoio.nome.toUpperCase())) {
    return { ok: true };
  }
  await db
    .update(candidacies)
    .set({
      apoios: [...atuais, { source: "tse", ...apoio }].slice(0, 12),
      refreshedAt: new Date(),
    })
    .where(eq(candidacies.id, candidacyId));
  return { ok: true };
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
