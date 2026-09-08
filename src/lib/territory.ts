import {
  getEstadoPorSigla,
  getMalhaMunicipiosUF,
  getMalhaBrasilUFs,
  getPopulacaoMunicipiosUF,
  getPibMunicipiosUF,
  getPibUF,
  getPopulacaoUFBySigla,
  getUFSiglaByCode,
  type GeoFeatureCollection,
} from "@/lib/data-sources/ibge";
import { getVotosByIbge, getVotosByUF } from "@/lib/data-sources/eleitoral";
import { computeIFET, type IfetResultado } from "@/lib/intel/ifet";
import { db } from "@/db";
import { candidacies, type Candidacy } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PerfilPolitico } from "@/lib/politico";
import { getBaseCandidato } from "@/lib/intel/base-candidato-load";
import type { BaseCandidato } from "@/lib/intel/base-candidato";

/** Carrega a Base do Candidato (alcance territorial) a partir do id da candidatura. */
async function loadBase(candidacyId?: string): Promise<BaseCandidato | null> {
  if (!candidacyId) return null;
  try {
    const rows = await db.select().from(candidacies).where(eq(candidacies.id, candidacyId)).limit(1);
    const c: Candidacy | undefined = rows[0];
    if (!c) return null;
    const raw = c.raw as unknown;
    const perfil =
      raw && typeof raw === "object" && "nome" in raw ? (raw as PerfilPolitico) : null;
    if (!perfil) return null;
    return await getBaseCandidato(c, perfil);
  } catch {
    return null;
  }
}

export type MunicipioTerritorio = {
  code: string;
  nome: string;
  populacao: number;
};

export type TerritorioUF = {
  ufSigla: string;
  ufNome: string;
  ufId: number;
  regiao: string;
  geojson: GeoFeatureCollection;
  municipios: MunicipioTerritorio[];
  populacaoByCode: Record<string, number>;
  nomeByCode: Record<string, string>;
  /** votos do candidato por código IBGE — null até a ingestão do brasil.io rodar */
  eleitoralByCode: Record<string, number> | null;
  eleitoralAno: number | null;
  eleitoralTotal: number | null;
  /** IFET v2 — Índice de Força Eleitoral Territorial (peso × alcance) */
  ifet: IfetResultado;
  base: BaseCandidato | null;
};

export type IfetResumoUF = {
  ufNome: string;
  regiao: string;
  ifet: IfetResultado;
  base: BaseCandidato | null;
  eleitoralByCode: Record<string, number> | null;
  eleitoralAno: number | null;
  eleitoralTotal: number | null;
  nomeByCode: Record<string, string>;
  populacaoByCode: Record<string, number>;
  pibByCode: Record<string, number>;
};

/**
 * Versão leve do território para o painel/motor: computa o IFET sem baixar a
 * malha geográfica (só população + PIB + votação). Rápido o suficiente para
 * rodar no dashboard.
 */
export async function getIfetResumoUF(
  ufSigla: string,
  candidacyId?: string,
): Promise<IfetResumoUF | null> {
  const estado = await getEstadoPorSigla(ufSigla);
  if (!estado) return null;

  const [pops, pib, base] = await Promise.all([
    getPopulacaoMunicipiosUF(estado.id),
    getPibMunicipiosUF(estado.id).catch(() => ({}) as Record<string, number>),
    loadBase(candidacyId),
  ]);
  const municipios = Object.entries(pops).map(([code, v]) => ({
    code,
    nome: v.nome,
    populacao: v.populacao,
  }));

  let eleitoralByCode: Record<string, number> | null = null;
  let eleitoralAno: number | null = null;
  let eleitoralTotal: number | null = null;
  if (candidacyId) {
    const v = await getVotosByIbge(candidacyId).catch(() => null);
    if (v && Object.keys(v.byCode).length > 0) {
      eleitoralByCode = v.byCode;
      eleitoralAno = v.ano;
      eleitoralTotal = v.total;
    }
  }

  const ifet = computeIFET(
    municipios.map((m) => ({
      code: m.code,
      nome: m.nome,
      populacao: m.populacao,
      pibTotal: pib[m.code] ?? 0,
      votosCandidato: eleitoralByCode?.[m.code],
      alcance: base?.alcanceByCode[m.code],
      confianca: base?.confiancaByCode[m.code],
    })),
    { modo: base?.modo ?? "contexto" },
  );

  const nomeByCode: Record<string, string> = {};
  const populacaoByCode: Record<string, number> = {};
  for (const m of municipios) {
    nomeByCode[m.code] = m.nome;
    populacaoByCode[m.code] = m.populacao;
  }

  return {
    ufNome: estado.nome,
    regiao: estado.regiao.nome,
    ifet,
    base,
    eleitoralByCode,
    eleitoralAno,
    eleitoralTotal,
    nomeByCode,
    populacaoByCode,
    pibByCode: pib,
  };
}

/**
 * Versão NACIONAL do resumo (disputa presidencial): a unidade de análise é a
 * UF, não o município. Mesmo formato de `getIfetResumoUF` — `code` carrega a
 * sigla da UF ("SP", "RJ", …) —, então os motores rodam sem alteração.
 */
export async function getIfetResumoNacional(
  candidacyId?: string,
): Promise<IfetResumoUF | null> {
  const [pops, pib] = await Promise.all([
    getPopulacaoUFBySigla(),
    getPibUF().catch(() => ({}) as Record<string, number>),
  ]);
  const siglas = Object.keys(pops);
  if (siglas.length < 20) return null;

  let eleitoralByCode: Record<string, number> | null = null;
  let eleitoralAno: number | null = null;
  let eleitoralTotal: number | null = null;
  if (candidacyId) {
    const v = await getVotosByUF(candidacyId).catch(() => null);
    if (v && Object.keys(v.byUF).length > 0) {
      eleitoralByCode = v.byUF;
      eleitoralAno = v.ano;
      eleitoralTotal = v.total;
    }
  }

  const ifet = computeIFET(
    siglas.map((sigla) => ({
      code: sigla,
      nome: pops[sigla].nome,
      populacao: pops[sigla].populacao,
      pibTotal: pib[sigla] ?? 0,
      votosCandidato: eleitoralByCode?.[sigla],
    })),
  );

  const nomeByCode: Record<string, string> = {};
  const populacaoByCode: Record<string, number> = {};
  for (const sigla of siglas) {
    nomeByCode[sigla] = pops[sigla].nome;
    populacaoByCode[sigla] = pops[sigla].populacao;
  }

  return {
    ufNome: "Brasil",
    regiao: "Nacional",
    ifet,
    base: null,
    eleitoralByCode,
    eleitoralAno,
    eleitoralTotal,
    nomeByCode,
    populacaoByCode,
    pibByCode: pib,
  };
}

/** Território NACIONAL pesado: malha das 27 UFs + IFET por UF. `code` = sigla. */
export async function getTerritorioNacional(
  candidacyId?: string,
): Promise<TerritorioUF | null> {
  const [malha, siglaByCode, resumo] = await Promise.all([
    getMalhaBrasilUFs(),
    getUFSiglaByCode(),
    getIfetResumoNacional(candidacyId),
  ]);
  if (!resumo) return null;

  // normaliza o codarea da malha (2 dígitos IBGE) para a sigla da UF
  const geojson: GeoFeatureCollection = {
    type: "FeatureCollection",
    features: (malha.features ?? []).map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        codarea: siglaByCode[String(f.properties.codarea)] ?? String(f.properties.codarea),
      },
    })),
  };

  const municipios: MunicipioTerritorio[] = Object.entries(resumo.populacaoByCode)
    .map(([code, populacao]) => ({ code, nome: resumo.nomeByCode[code] ?? code, populacao }))
    .sort((a, b) => b.populacao - a.populacao);

  return {
    ufSigla: "BR",
    ufNome: "Brasil",
    ufId: 0,
    regiao: "Nacional",
    geojson,
    municipios,
    populacaoByCode: resumo.populacaoByCode,
    nomeByCode: resumo.nomeByCode,
    eleitoralByCode: resumo.eleitoralByCode,
    eleitoralAno: resumo.eleitoralAno,
    eleitoralTotal: resumo.eleitoralTotal,
    ifet: resumo.ifet,
    base: null,
  };
}

/** Territórios pesados: um por UF, cacheado no servidor (fetch do IBGE). */
export async function getTerritorioUF(
  ufSigla: string,
  candidacyId?: string,
): Promise<TerritorioUF | null> {
  const estado = await getEstadoPorSigla(ufSigla);
  if (!estado) return null;

  const [geojson, pops, pib, base] = await Promise.all([
    getMalhaMunicipiosUF(estado.id),
    getPopulacaoMunicipiosUF(estado.id),
    getPibMunicipiosUF(estado.id).catch(() => ({}) as Record<string, number>),
    loadBase(candidacyId),
  ]);

  const municipios: MunicipioTerritorio[] = Object.entries(pops).map(
    ([code, v]) => ({ code, nome: v.nome, populacao: v.populacao }),
  );
  municipios.sort((a, b) => b.populacao - a.populacao);

  let eleitoralByCode: Record<string, number> | null = null;
  let eleitoralAno: number | null = null;
  let eleitoralTotal: number | null = null;
  if (candidacyId) {
    const v = await getVotosByIbge(candidacyId).catch(() => null);
    if (v && Object.keys(v.byCode).length > 0) {
      eleitoralByCode = v.byCode;
      eleitoralAno = v.ano;
      eleitoralTotal = v.total;
    }
  }

  const ifet = computeIFET(
    municipios.map((m) => ({
      code: m.code,
      nome: m.nome,
      populacao: m.populacao,
      pibTotal: pib[m.code] ?? 0,
      votosCandidato: eleitoralByCode?.[m.code],
      alcance: base?.alcanceByCode[m.code],
      confianca: base?.confiancaByCode[m.code],
    })),
    { modo: base?.modo ?? "contexto" },
  );

  const populacaoByCode: Record<string, number> = {};
  const nomeByCode: Record<string, string> = {};
  for (const m of municipios) {
    populacaoByCode[m.code] = m.populacao;
    nomeByCode[m.code] = m.nome;
  }

  return {
    ufSigla: estado.sigla,
    ufNome: estado.nome,
    ufId: estado.id,
    regiao: estado.regiao.nome,
    geojson,
    municipios,
    populacaoByCode,
    nomeByCode,
    eleitoralByCode,
    eleitoralAno,
    eleitoralTotal,
    ifet,
    base,
  };
}
