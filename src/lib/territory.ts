import {
  getEstadoPorSigla,
  getMalhaMunicipiosUF,
  getPopulacaoMunicipiosUF,
  type GeoFeatureCollection,
} from "@/lib/data-sources/ibge";
import { getVotosPorMunicipioNome } from "@/lib/data-sources/eleitoral";
import type { Cargo } from "@/lib/cargos";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['´`^~]/g, "")
    .trim();
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
  /** métrica territorial por código IBGE (população do Censo 2022) */
  populacaoByCode: Record<string, number>;
  nomeByCode: Record<string, string>;
  /**
   * Camada eleitoral por código IBGE — votos do candidato por município.
   * `null` até a fonte eleitoral estar conectada (ver docs/DADOS-TSE.md).
   */
  eleitoralByCode: Record<string, number> | null;
  eleitoralAno: number | null;
};

/** Territórios pesados: um por UF, cacheado bem no servidor. */
export async function getTerritorioUF(
  ufSigla: string,
  candidato?: { nome: string; uf: string; cargo?: Cargo },
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
  if (candidato) {
    const votos = await getVotosPorMunicipioNome(candidato).catch(() => null);
    if (votos) {
      const nameToCode = new Map<string, string>();
      for (const [code, nome] of Object.entries(nomeByCode)) {
        nameToCode.set(norm(nome), code);
      }
      const map: Record<string, number> = {};
      for (const [nome, v] of Object.entries(votos.byName)) {
        const code = nameToCode.get(nome);
        if (code) map[code] = v;
      }
      if (Object.keys(map).length > 0) {
        eleitoralByCode = map;
        eleitoralAno = votos.ano;
      }
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
  };
}
