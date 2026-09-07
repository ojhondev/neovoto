/**
 * Camada eleitoral unificada. Hoje: brasil.io (espelho do TSE, todos os cargos).
 * Amanhã: Base dos Dados / BigQuery para 2024 e granularidade de seção.
 * Sem fonte conectada, retorna nulo e a plataforma segue com Câmara/Senado/IBGE.
 */
import {
  hasBrasilioToken,
  buscarCandidatosPorNome,
  votacaoDoCandidato,
  type BrasilioCandidato,
} from "@/lib/data-sources/brasilio";
import {
  CARGO_BRASILIO,
  anoEleicao,
  cargoFromBrasilio,
  type Cargo,
} from "@/lib/cargos";

export function eleitoralDisponivel(): boolean {
  return hasBrasilioToken();
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['´`^~]/g, "")
    .trim();
}

export type CandidatoEleitoral = {
  cargo: Cargo;
  ano: number;
  nome: string;
  nomeUrna: string;
  numero: string;
  partido: string;
  uf: string;
  unidadeEleitoral: string;
  resultado: string;
  sequencial: string;
  nascimento: string | null;
  escolaridade: string | null;
  ocupacao: string | null;
  receita: number | null;
  despesa: number | null;
};

function toCandidato(c: BrasilioCandidato): CandidatoEleitoral | null {
  const cargo = cargoFromBrasilio(c.cargo);
  if (!cargo) return null;
  return {
    cargo,
    ano: c.ano,
    nome: c.nome,
    nomeUrna: c.nome_urna,
    numero: c.numero_urna,
    partido: c.partido,
    uf: c.uf,
    unidadeEleitoral: c.unidade_eleitoral,
    resultado: c.resultado,
    sequencial: c.sequencial,
    nascimento: c.data_nascimento,
    escolaridade: c.grau_escolaridade,
    ocupacao: c.ocupacao,
    receita: c.total_receita,
    despesa: c.total_despesa,
  };
}

/** Busca candidatos por nome em TODOS os cargos (última eleição geral + municipal). */
export async function buscarCandidatos(nome: string): Promise<CandidatoEleitoral[]> {
  if (!hasBrasilioToken()) return [];
  const [geral, municipal] = await Promise.allSettled([
    buscarCandidatosPorNome(nome, 2022),
    buscarCandidatosPorNome(nome, 2020),
  ]);
  const raw: BrasilioCandidato[] = [];
  if (geral.status === "fulfilled") raw.push(...geral.value);
  if (municipal.status === "fulfilled") raw.push(...municipal.value);

  const seen = new Set<string>();
  const out: CandidatoEleitoral[] = [];
  for (const r of raw) {
    const c = toCandidato(r);
    if (!c) continue;
    const key = `${c.cargo}-${c.uf}-${norm(c.nome)}-${c.ano}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/**
 * Votos do candidato por município, indexados por NOME normalizado do município
 * (o join com o código IBGE acontece em territory.ts, que tem `nomeByCode`).
 * `null` se não há fonte conectada ou o candidato não foi encontrado.
 */
export async function getVotosPorMunicipioNome(candidato: {
  nome: string;
  uf: string;
  cargo?: Cargo;
}): Promise<{ byName: Record<string, number>; ano: number; cargo: Cargo } | null> {
  if (!hasBrasilioToken() || !candidato.cargo) return null;
  const ano = anoEleicao(candidato.cargo);
  const linhas = await votacaoDoCandidato({
    nome: candidato.nome,
    uf: candidato.uf,
    cargo: CARGO_BRASILIO[candidato.cargo],
    ano,
    turno: 1,
  }).catch(() => []);
  if (linhas.length === 0) return null;

  const byName: Record<string, number> = {};
  for (const l of linhas) {
    const k = norm(l.municipio);
    byName[k] = (byName[k] ?? 0) + (Number(l.votos) || 0);
  }
  return { byName, ano, cargo: candidato.cargo };
}
