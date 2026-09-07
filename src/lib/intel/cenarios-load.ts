/**
 * Carrega as entradas dos Cenários (eleição de referência, votação própria com
 * fallback de ingestão, IFET) e roda `computeCenarios`. Compartilhado entre a
 * página de Cenários e o módulo "Como Ganhar".
 */
import type { Candidacy } from "@/db/schema";
import type { PerfilPolitico } from "@/lib/politico";
import type { Dictionary } from "@/lib/i18n";
import type { Cargo } from "@/lib/cargos";
import { getIfetResumoUF } from "@/lib/territory";
import { ingestVotacao, getVotosByIbge } from "@/lib/data-sources/eleitoral";
import { getVotacaoPartidoUF, getVotosCorteEleito } from "@/lib/data-sources/regional";
import { computeCenarios, type CenariosResultado } from "@/lib/intel/cenarios";

export const CARGO_REF: Record<Cargo, { ano: number; turno: number; cargo: string; prop: boolean }> = {
  presidente: { ano: 2022, turno: 1, cargo: "presidente", prop: false },
  governador: { ano: 2022, turno: 1, cargo: "governador", prop: false },
  senador: { ano: 2022, turno: 1, cargo: "senador", prop: false },
  "deputado-federal": { ano: 2022, turno: 1, cargo: "deputado federal", prop: true },
  "deputado-estadual": { ano: 2022, turno: 1, cargo: "deputado estadual", prop: true },
  "deputado-distrital": { ano: 2022, turno: 1, cargo: "deputado distrital", prop: true },
  prefeito: { ano: 2024, turno: 1, cargo: "prefeito", prop: false },
  vereador: { ano: 2024, turno: 1, cargo: "vereador", prop: true },
};

export type CenariosCarregado =
  | { ok: true; cenarios: CenariosResultado }
  | { ok: false; motivo: "sem-recorte" | "sem-dados" | "sem-historico-proprio" };

export async function carregarCenarios(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
  t: Dictionary,
): Promise<CenariosCarregado> {
  const cargo = (candidacy.cargo as Cargo | null) ?? perfil.cargo ?? null;
  if (!perfil.uf || !cargo) return { ok: false, motivo: "sem-recorte" };
  const ref = CARGO_REF[cargo];

  const [resumo, votacao, corte] = await Promise.all([
    getIfetResumoUF(perfil.uf, candidacy.id),
    getVotacaoPartidoUF(ref.ano, ref.turno, perfil.uf, ref.cargo),
    ref.prop ? getVotosCorteEleito(ref.ano, ref.turno, perfil.uf, ref.cargo) : Promise.resolve(null),
  ]);

  if (!resumo || votacao.length < 100) return { ok: false, motivo: "sem-dados" };

  let votosProprios = resumo.eleitoralByCode ?? null;
  if (ref.prop && !votosProprios) {
    try {
      await ingestVotacao(candidacy.id);
      const v = await getVotosByIbge(candidacy.id);
      if (v && Object.keys(v.byCode).length > 0) votosProprios = v.byCode;
    } catch {
      /* segue */
    }
    if (!votosProprios) return { ok: false, motivo: "sem-historico-proprio" };
  }

  const cenarios = computeCenarios(
    {
      cargo,
      partido: perfil.partido,
      votosCandidatoByCode: votosProprios,
      votacaoPartido: votacao,
      ifetByCode: resumo.ifet.byCode,
      populacaoByCode: resumo.populacaoByCode,
      nomeByCode: resumo.nomeByCode,
      corteEleito: corte,
    },
    {
      base: t.cenarios.scenarioBase,
      favoravel: t.cenarios.scenarioFav,
      adverso: t.cenarios.scenarioAdv,
      premissaBase: t.cenarios.premissaBase,
      premissaMareBoa: t.cenarios.premissaMareBoa,
      premissaLacunas: t.cenarios.premissaLacunas,
      premissaCompBaixo: t.cenarios.premissaCompBaixo,
      premissaMareRuim: t.cenarios.premissaMareRuim,
      premissaAdvConsolida: t.cenarios.premissaAdvConsolida,
      fatorMare: t.cenarios.fatorMare,
      fatorComparecimento: t.cenarios.fatorComparecimento,
      fatorLacunas: t.cenarios.fatorLacunas,
    },
  );
  return { ok: true, cenarios };
}
