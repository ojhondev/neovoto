import {
  getEstadoPorSigla,
  getMalhaMunicipiosUF,
  getPopulacaoMunicipiosUF,
  type GeoFeatureCollection,
} from "@/lib/data-sources/ibge";
import { getVotosByIbge } from "@/lib/data-sources/eleitoral";

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
};

/** Territórios pesados: um por UF, cacheado no servidor (fetch do IBGE). */
export async function getTerritorioUF(
  ufSigla: string,
  candidacyId?: string,
): Promise<TerritorioUF | null> {
  const estado = await getEstadoPorSigla(ufSigla);
  if (!estado) return null;

  const [geojson, pops] = await Promise.all([
    getMalhaMunicipiosUF(estado.id),
    getPopulacaoMunicipiosUF(estado.id),
  ]);

  const municipios: MunicipioTerritorio[] = Object.entries(pops).map(
    ([code, v]) => ({ code, nome: v.nome, populacao: v.populacao }),
  );
  municipios.sort((a, b) => b.populacao - a.populacao);

  const populacaoByCode: Record<string, number> = {};
  const nomeByCode: Record<string, string> = {};
  for (const m of municipios) {
    populacaoByCode[m.code] = m.populacao;
    nomeByCode[m.code] = m.nome;
  }

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
  };
}
