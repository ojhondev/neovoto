/**
 * Leitores cacheados de dados regionais pesados (BigQuery) para os módulos
 * do painel. Resultado eleitoral histórico não muda — cache longo.
 */
import { unstable_cache } from "next/cache";
import { votacaoPartidoPorMunicipio } from "@/lib/data-sources/basedosdados";

export const getVotacaoPartidoUF = unstable_cache(
  async (ano: number, turno: number, uf: string, cargo: string) =>
    votacaoPartidoPorMunicipio({ ano, turno, uf, cargo }),
  ["votacao-partido-uf-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);
