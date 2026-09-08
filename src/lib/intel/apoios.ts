/**
 * Base eleitoral a partir de APOIOS declarados (padrinhos políticos).
 * Para um candidato sem histórico próprio, a propensão de voto realista NÃO é
 * a do partido inteiro — é uma fração transferível da base dos eleitos que
 * apoiam ativamente a campanha, concentrada nos redutos deles.
 */
import { unstable_cache } from "next/cache";
import { buscarCandidatos, votacaoPorMunicipio, basedosdadosDisponivel } from "@/lib/data-sources/basedosdados";

export type Apoio = {
  source: string;
  externalId: string;
  nome: string;
  uf: string;
  cargo: string;
};

/** fração da base de um apoiador que tende a migrar para o afilhado */
const TRANSFERENCIA = 0.1;

const votosDoApoio = unstable_cache(
  async (nome: string, uf: string): Promise<{ idMunicipio: string; votos: number }[]> => {
    if (!basedosdadosDisponivel()) return [];
    try {
      const cands = await buscarCandidatos(nome);
      // resultado mais recente na UF do apoiador COM apuração (≤ 2024)
      const hit = cands
        .filter((c) => c.siglaUf === uf.toUpperCase() && c.ano <= 2024)
        .sort((a, b) => b.ano - a.ano)[0];
      if (!hit?.sequencial) return [];
      return await votacaoPorMunicipio({
        sequencial: hit.sequencial,
        ano: hit.ano,
        turno: 1,
        uf: uf.toUpperCase(),
      });
    } catch {
      return [];
    }
  },
  ["votos-do-apoio-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

export type BaseApoios = {
  byCode: Record<string, number>;
  total: number;
  detalhe: { nome: string; votos: number; transferido: number }[];
};

export async function basePorApoios(apoios: Apoio[]): Promise<BaseApoios | null> {
  if (!apoios || apoios.length === 0) return null;
  const byCode: Record<string, number> = {};
  const detalhe: BaseApoios["detalhe"] = [];
  for (const a of apoios) {
    const votos = await votosDoApoio(a.nome, a.uf);
    const totalApoio = votos.reduce((s, v) => s + v.votos, 0);
    let transferido = 0;
    for (const v of votos) {
      const t = Math.round(v.votos * TRANSFERENCIA);
      byCode[v.idMunicipio] = (byCode[v.idMunicipio] ?? 0) + t;
      transferido += t;
    }
    detalhe.push({ nome: a.nome, votos: totalApoio, transferido });
  }
  const total = Object.values(byCode).reduce((s, v) => s + v, 0);
  return total > 0 ? { byCode, total, detalhe } : null;
}
