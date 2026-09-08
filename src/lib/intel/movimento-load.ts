/**
 * Carrega o Movimento entre eleições e as zonas fortes/fracas do candidato,
 * a partir do histórico dele na Base dos Dados. Cacheado por candidatura.
 */
import { unstable_cache } from "next/cache";
import type { Candidacy } from "@/db/schema";
import type { PerfilPolitico } from "@/lib/politico";
import type { Cargo } from "@/lib/cargos";
import { basedosdadosDisponivel, historicoDoCandidato, votacaoDeSequenciais } from "@/lib/data-sources/basedosdados";
import { getComparecimentoUF, getComparecimentoZonaUF, getVotacaoPorZona } from "@/lib/data-sources/regional";
import { computeMovimento, computeZonas, type MovimentoResultado, type ZonasResultado } from "@/lib/intel/movimento";

const CARGO_BDD: Record<Cargo, string> = {
  presidente: "presidente",
  governador: "governador",
  senador: "senador",
  "deputado-federal": "deputado federal",
  "deputado-estadual": "deputado estadual",
  "deputado-distrital": "deputado distrital",
  prefeito: "prefeito",
  vereador: "vereador",
};

export type MovimentoCarregado = {
  movimento: MovimentoResultado | null;
  zonas: ZonasResultado | null;
  motivo?: "sem-bdd" | "sem-uf" | "uma-eleicao" | "sem-dados";
};

async function build(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
  nomeByCode: Record<string, string>,
): Promise<MovimentoCarregado> {
  const uf = (perfil.uf || candidacy.uf || "").toUpperCase();
  if (!basedosdadosDisponivel()) return { movimento: null, zonas: null, motivo: "sem-bdd" };
  if (!uf) return { movimento: null, zonas: null, motivo: "sem-uf" };

  const anoAlvo = candidacy.electionYear ?? 2026;
  const rawNasc = (candidacy.raw as { nascimento?: string | null })?.nascimento ?? null;
  const hist = await historicoDoCandidato(perfil.nome, {
    dataNascimento: rawNasc,
    municipioNascimento: candidacy.birthMunicipio,
    ufNascimento: candidacy.birthUf,
  }).catch(() => []);

  const cargoAlvo = (candidacy.cargo as Cargo | null) ?? perfil.cargo ?? "deputado-estadual";
  const cargoAlvoBdd = CARGO_BDD[cargoAlvo];

  // corridas passadas na UF, com sequencial e resultado
  const passadas = hist.filter((h) => h.siglaUf === uf && h.sequencial && h.ano < anoAlvo);
  if (passadas.length === 0) return { movimento: null, zonas: null, motivo: "sem-dados" };

  // escolhe o cargo a comparar: o alvo se houver ≥2 anos, senão o cargo mais frequente
  const porCargo = new Map<string, typeof passadas>();
  for (const h of passadas) {
    const arr = porCargo.get(h.cargo) ?? [];
    arr.push(h);
    porCargo.set(h.cargo, arr);
  }
  let cargo = cargoAlvoBdd;
  let corridas = porCargo.get(cargoAlvoBdd) ?? [];
  if (corridas.length < 2) {
    let melhor: typeof passadas = [];
    for (const [c, arr] of porCargo) {
      const anos = new Set(arr.map((x) => x.ano));
      if (anos.size >= 2 && arr.length > melhor.length) {
        melhor = arr;
        cargo = c;
      }
    }
    corridas = melhor;
  }

  const anos = [...new Set(corridas.map((c) => c.ano))].sort((a, b) => b - a);
  if (anos.length < 2) {
    // uma só eleição → só dá pra mostrar zonas da última
    const unica = corridas.sort((a, b) => b.ano - a.ano)[0] ?? passadas.sort((a, b) => b.ano - a.ano)[0];
    const zonas = unica ? await carregarZonas(unica.sequencial, unica.ano, uf, CARGO_BDD[(unica.cargo as Cargo)] ?? unica.cargo, nomeByCode) : null;
    return { movimento: null, zonas, motivo: "uma-eleicao" };
  }

  const [anoAtual, anoAnterior] = anos;
  const seqAtual = corridas.find((c) => c.ano === anoAtual)!.sequencial;
  const seqAnterior = corridas.find((c) => c.ano === anoAnterior)!.sequencial;

  const [votos, compAtualRows, compAnteriorRows] = await Promise.all([
    votacaoDeSequenciais([seqAtual, seqAnterior]).catch(() => []),
    getComparecimentoUF(anoAtual, 1, uf, cargo).catch(() => []),
    getComparecimentoUF(anoAnterior, 1, uf, cargo).catch(() => []),
  ]);

  const atual: Record<string, number> = {};
  const anterior: Record<string, number> = {};
  for (const v of votos) {
    if (v.sequencial === seqAtual) atual[v.idMunicipio] = (atual[v.idMunicipio] ?? 0) + v.votos;
    if (v.sequencial === seqAnterior) anterior[v.idMunicipio] = (anterior[v.idMunicipio] ?? 0) + v.votos;
  }
  if (Object.keys(atual).length === 0 && Object.keys(anterior).length === 0) {
    return { movimento: null, zonas: null, motivo: "sem-dados" };
  }
  const compAtual = Object.fromEntries(compAtualRows.map((r) => [r.idMunicipio, r.comparecimento]));
  const compAnterior = Object.fromEntries(compAnteriorRows.map((r) => [r.idMunicipio, r.comparecimento]));

  const movimento = computeMovimento({
    anoAtual,
    anoAnterior,
    cargo,
    atual,
    anterior,
    compAtual,
    compAnterior,
    nomeByCode,
  });

  const zonas = await carregarZonas(seqAtual, anoAtual, uf, cargo, nomeByCode);
  return { movimento, zonas };
}

async function carregarZonas(
  sequencial: string,
  ano: number,
  uf: string,
  cargo: string,
  nomeByCode: Record<string, string>,
): Promise<ZonasResultado | null> {
  const [vz, cz] = await Promise.all([
    getVotacaoPorZona(sequencial, ano, 1, uf).catch(() => []),
    getComparecimentoZonaUF(ano, 1, uf, cargo).catch(() => []),
  ]);
  if (vz.length === 0) return null;
  const compPorZona = Object.fromEntries(cz.map((r) => [`${r.idMunicipio}-${r.zona}`, r.comparecimento]));
  return computeZonas({ ano, votosPorZona: vz, compPorZona, nomeByCode });
}

export async function getMovimento(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
  nomeByCode: Record<string, string>,
): Promise<MovimentoCarregado> {
  const cached = unstable_cache(
    () => build(candidacy, perfil, nomeByCode),
    ["movimento-v1", candidacy.id, String(candidacy.refreshedAt ?? "")],
    { revalidate: 60 * 60 * 24 * 7 },
  );
  return cached().catch(() => ({ movimento: null, zonas: null, motivo: "sem-dados" as const }));
}
