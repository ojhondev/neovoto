/**
 * Leitores cacheados de dados regionais pesados (BigQuery) para os módulos
 * do painel. Resultado eleitoral histórico não muda — cache longo.
 */
import { unstable_cache } from "next/cache";
import {
  votacaoPartidoPorMunicipio,
  votacaoPartidoNacionalPorUF,
  votosCorteEleito,
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
