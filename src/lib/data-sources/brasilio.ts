/**
 * Cliente da API do brasil.io — dataset `eleicoes-brasil` (espelho do TSE, 1996–2022,
 * TODOS os cargos: presidente, governador, senador, deputados, prefeito, vereador).
 *
 * Por que não o TSE direto: `dadosabertos.tse.jus.br` e `divulgacandcontas.tse.jus.br`
 * bloqueiam qualquer IP fora do Brasil (Akamai / 403). O brasil.io é acessível.
 *
 * ATENÇÃO: o brasil.io tem rate limit agressivo e bloqueia iteração de tabela grande.
 * Regra: NUNCA chamar no request path do usuário. Buscar uma vez, cachear para sempre
 * no Neon (dado eleitoral é histórico). Em 429, lançar `BrasilioThrottled` e degradar.
 *
 * Token gratuito: https://brasil.io/auth/tokens-api/ · env `BRASILIO_API_TOKEN`.
 */
const BASE = "https://brasil.io/api/v1/dataset/eleicoes-brasil";

export class BrasilioThrottled extends Error {
  constructor() {
    super("brasil.io está limitando as requisições. Tente novamente em alguns minutos.");
    this.name = "BrasilioThrottled";
  }
}

export function hasBrasilioToken(): boolean {
  return !!process.env.BRASILIO_API_TOKEN;
}

type Row = Record<string, unknown>;

function str(r: Row, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== "") return String(v);
  }
  return "";
}
function int(r: Row, ...keys: string[]): number {
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== "") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

async function page(
  tabela: "candidatos" | "votacao",
  params: Record<string, string | number>,
): Promise<{ results: Row[]; next: string | null }> {
  const token = process.env.BRASILIO_API_TOKEN;
  if (!token) return { results: [], next: null };
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const res = await fetch(`${BASE}/${tabela}/data/?${qs}`, {
    headers: { Authorization: `Token ${token}` },
    // dado histórico: cache longo. next.revalidate não ajuda aqui (params variam),
    // o cache real é a tabela no Neon.
    cache: "no-store",
  });
  if (res.status === 429) throw new BrasilioThrottled();
  if (!res.ok) throw new Error(`brasil.io ${res.status}`);
  const j = (await res.json()) as { results?: Row[]; next?: string | null };
  return { results: j.results ?? [], next: j.next ?? null };
}

async function pageUrl(url: string): Promise<{ results: Row[]; next: string | null }> {
  const token = process.env.BRASILIO_API_TOKEN!;
  const res = await fetch(url, { headers: { Authorization: `Token ${token}` }, cache: "no-store" });
  if (res.status === 429) throw new BrasilioThrottled();
  if (!res.ok) throw new Error(`brasil.io ${res.status}`);
  const j = (await res.json()) as { results?: Row[]; next?: string | null };
  return { results: j.results ?? [], next: j.next ?? null };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type BioCandidato = {
  ano: number;
  turno: number;
  cargoDesc: string; // "DEPUTADO FEDERAL", "VEREADOR", ...
  cargoCodigo: number; // 1..13 (TSE)
  nome: string;
  nomeUrna: string;
  numero: string;
  partido: string;
  uf: string;
  unidadeEleitoral: string;
  situacao: string; // desc_sit_tot_turno
  sequencial: string;
  nascimento: string | null;
  escolaridade: string | null;
  ocupacao: string | null;
};

function normCand(r: Row): BioCandidato {
  return {
    ano: int(r, "ano_eleicao", "ano"),
    turno: int(r, "num_turno", "turno") || 1,
    cargoDesc: str(r, "descricao_cargo", "cargo").toUpperCase(),
    cargoCodigo: int(r, "codigo_cargo", "cod_cargo"),
    nome: str(r, "nome_candidato", "nome"),
    nomeUrna: str(r, "nome_urna_candidato", "nome_urna"),
    numero: str(r, "numero_candidato", "numero"),
    partido: str(r, "sigla_partido", "sigla_partido_candidato", "sg_partido"),
    uf: str(r, "sigla_uf", "sg_uf", "uf"),
    unidadeEleitoral: str(r, "descricao_ue", "nome_ue", "des_ue"),
    situacao: str(r, "desc_sit_tot_turno", "descricao_totalizacao_turno", "ds_sit_tot_turno"),
    sequencial: str(r, "sequencial_candidato", "sq_candidato", "sqcandidato"),
    nascimento: str(r, "data_nascimento", "dt_nascimento") || null,
    escolaridade: str(r, "descricao_grau_instrucao", "ds_grau_instrucao") || null,
    ocupacao: str(r, "descricao_ocupacao", "ds_ocupacao") || null,
  };
}

/** Busca candidatos por nome. Uma requisição por chamada (o cache é no Neon). */
export async function buscarCandidatosPorNome(
  nome: string,
  ano: number,
): Promise<BioCandidato[]> {
  const termo = nome.trim();
  if (termo.length < 3) return [];
  const { results } = await page("candidatos", {
    search: termo,
    ano_eleicao: ano,
    page_size: 60,
  });
  return results
    .map(normCand)
    .filter((c) => c.ano === ano || ano === 0)
    .filter((c) => c.sequencial);
}

export type BioVoto = {
  tseCode: string;
  municipio: string;
  votos: number;
};

/**
 * Votação de um candidato por município. Pagina com pausa entre páginas.
 * Pode lançar BrasilioThrottled a qualquer momento — o caller deve gravar o
 * parcial e marcar como "indisponivel" para retomar depois.
 */
export async function votacaoDoCandidato(args: {
  sequencial: string;
  ano: number;
  uf: string;
  turno: number;
  maxPages?: number;
}): Promise<BioVoto[]> {
  const acc = new Map<string, { municipio: string; votos: number }>();
  let res = await page("votacao", {
    ano_eleicao: args.ano,
    sigla_uf: args.uf,
    num_turno: args.turno,
    sequencial_candidato: args.sequencial,
    page_size: 10000,
  });
  const max = args.maxPages ?? 4;
  for (let i = 0; i < max; i++) {
    for (const r of res.results) {
      const tse = str(r, "codigo_municipio", "cd_municipio", "codigo_municipio_tse");
      const mun = str(r, "nome_municipio", "nm_municipio");
      const v = int(r, "total_votos", "qtde_votos", "qt_votos", "votos");
      if (!mun) continue;
      const cur = acc.get(mun) ?? { municipio: mun, votos: 0 };
      cur.votos += v;
      if (tse) {
        // guarda o código junto
        (cur as { tse?: string }).tse = tse;
      }
      acc.set(mun, cur);
    }
    if (!res.next) break;
    await sleep(1500);
    res = await pageUrl(res.next);
  }
  return [...acc.values()].map((x) => ({
    tseCode: (x as { tse?: string }).tse ?? "",
    municipio: x.municipio,
    votos: x.votos,
  }));
}
