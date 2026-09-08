/**
 * Leitores cacheados de dados regionais pesados (BigQuery) para os módulos
 * do painel. Resultado eleitoral histórico não muda — cache longo.
 */
import { unstable_cache } from "next/cache";
import {
  votacaoPartidoPorMunicipio,
  votacaoPartidoNacionalPorUF,
  votosCorteEleito,
  comparecimentoPorMunicipio,
  comparecimentoPorZona,
  perfilEleitoradoPorMunicipio,
  votacaoPorZona,
} from "@/lib/data-sources/basedosdados";

export const getVotacaoPartidoUF = unstable_cache(
  async (ano: number, turno: number, uf: string, cargo: string) =>
    votacaoPartidoPorMunicipio({ ano, turno, uf, cargo }),
  ["votacao-partido-uf-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

/**
 * Votação por partido agregada por UF num pleito nacional (Presidência).
 * `idMunicipio` carrega a SIGLA da UF — mesmo formato de `getVotacaoPartidoUF`,
 * para os motores rodarem sem alteração.
 */
export const getVotacaoPartidoNacional = unstable_cache(
  async (ano: number, turno: number, cargo: string) => {
    const rows = await votacaoPartidoNacionalPorUF({ ano, turno, cargo });
    return rows.map((r) => ({ idMunicipio: r.uf, sigla: r.sigla, votos: r.votos }));
  },
  ["votacao-partido-nacional-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

export const getVotosCorteEleito = unstable_cache(
  async (ano: number, turno: number, uf: string, cargo: string) =>
    votosCorteEleito({ ano, turno, uf, cargo }),
  ["votos-corte-eleito-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

/** Comparecimento e aptos por município (choropleth de abstenção, normalização). */
export const getComparecimentoUF = unstable_cache(
  async (ano: number, turno: number, uf: string, cargo: string) =>
    comparecimentoPorMunicipio({ ano, turno, uf, cargo }),
  ["comparecimento-uf-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

/** Perfil do eleitorado (escolaridade, idade) por município. */
export const getPerfilEleitoradoUF = unstable_cache(
  async (ano: number, uf: string) => perfilEleitoradoPorMunicipio({ ano, uf }),
  ["perfil-eleitorado-uf-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

/** Comparecimento por zona (normaliza o voto do candidato por zona). */
export const getComparecimentoZonaUF = unstable_cache(
  async (ano: number, turno: number, uf: string, cargo: string) =>
    comparecimentoPorZona({ ano, turno, uf, cargo }),
  ["comparecimento-zona-uf-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

/** Votos do candidato por zona (chave por sequencial). */
export const getVotacaoPorZona = unstable_cache(
  async (sequencial: string, ano: number, turno: number, uf: string) =>
    votacaoPorZona({ sequencial, ano, turno, uf }),
  ["votacao-por-zona-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);
