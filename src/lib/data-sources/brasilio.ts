/**
 * Cliente da API do brasil.io — dataset `eleicoes-brasil` (espelho do TSE, 1996–2022,
 * TODOS os cargos: presidente, governador, senador, deputados, prefeito, vereador).
 *
 * Por que o brasil.io e não o TSE direto: `dadosabertos.tse.jus.br` e
 * `divulgacandcontas.tse.jus.br` bloqueiam qualquer IP fora do Brasil (Akamai / 403).
 * O brasil.io não tem esse bloqueio e é acessível do servidor da Vercel.
 *
 * Requer um token gratuito em https://brasil.io/auth/tokens-api/ — ver docs/DADOS-TSE.md.
 * Sem o token (`BRASILIO_API_TOKEN` ausente) todas as funções retornam vazio/nulo e a
 * plataforma continua funcionando só com Câmara/Senado/IBGE.
 */
const BASE = "https://brasil.io/api/v1/dataset/eleicoes-brasil";

export function hasBrasilioToken(): boolean {
  return !!process.env.BRASILIO_API_TOKEN;
}

async function query<T>(
  tabela: "candidatos" | "votacao" | "bem-declarado",
  params: Record<string, string | number>,
  maxPages = 3,
): Promise<T[]> {
  const token = process.env.BRASILIO_API_TOKEN;
  if (!token) return [];

  const out: T[] = [];
  let url: string | null =
    `${BASE}/${tabela}/data/?` +
    new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    ).toString();

  for (let page = 0; page < maxPages && url; page++) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) {
      if (page === 0) throw new Error(`brasil.io ${res.status}`);
      break;
    }
    const data = (await res.json()) as { next: string | null; results: T[] };
    out.push(...(data.results ?? []));
    url = data.next;
  }
  return out;
}

export type BrasilioCandidato = {
  ano: number;
  turno: number;
  cargo: string; // "presidente" | "governador" | "senador" | "deputado-federal" | "deputado-estadual" | "prefeito" | "vereador" | ...
  nome: string;
  nome_urna: string;
  numero_urna: string;
  partido: string;
  uf: string;
  unidade_eleitoral: string; // município (cargos municipais) ou UF
  situacao: string;
  resultado: string; // "eleito", "nao eleito", "2 turno", ...
  sequencial: string;
  data_nascimento: string | null;
  genero: string | null;
  grau_escolaridade: string | null;
  ocupacao: string | null;
  total_receita: number | null;
  total_despesa: number | null;
};

export type BrasilioVotacao = {
  ano: number;
  turno: number;
  cargo: string;
  uf: string;
  municipio: string;
  codigo_municipio: string; // código TSE (≠ IBGE)
  zona: string;
  partido: string;
  nome: string;
  nome_urna: string;
  sequencial: string;
  votos: number;
};

/** Anos por tipo de eleição — o mais recente disponível no espelho (2022). */
export const ELEICAO_GERAL_ANO = 2022;
export const ELEICAO_MUNICIPAL_ANO = 2020; // 2024 só quando migrarmos p/ Base dos Dados

export async function buscarCandidatosPorNome(
  nome: string,
  ano: number = ELEICAO_GERAL_ANO,
): Promise<BrasilioCandidato[]> {
  const termo = nome.trim();
  if (termo.length < 3) return [];
  return query<BrasilioCandidato>("candidatos", {
    search: termo,
    ano,
    page_size: 50,
  });
}

export async function votacaoDoCandidato(args: {
  nome: string;
  uf: string;
  cargo: string;
  ano: number;
  turno?: number;
}): Promise<BrasilioVotacao[]> {
  return query<BrasilioVotacao>(
    "votacao",
    {
      nome: args.nome,
      uf: args.uf,
      cargo: args.cargo,
      ano: args.ano,
      turno: args.turno ?? 1,
      page_size: 10000,
    },
    6,
  );
}
