/**
 * Cliente da API de Dados Abertos da Câmara dos Deputados (v2).
 * https://dadosabertos.camara.leg.br — REST JSON, sem chave, acessível de servidor.
 * Ver docs/FONTES-DE-DADOS.md.
 */
const BASE = "https://dadosabertos.camara.leg.br/api/v2";

async function get<T>(path: string, revalidate = 60 * 60 * 12): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Câmara ${res.status} em ${path}`);
  return (await res.json()) as T;
}

export type DeputadoResumo = {
  id: number;
  nome: string;
  siglaPartido: string;
  siglaUf: string;
  urlFoto: string;
  email: string | null;
  idLegislatura: number;
};

export type DeputadoDetalhe = DeputadoResumo & {
  nomeCivil: string;
  dataNascimento: string | null;
  municipioNascimento: string | null;
  ufNascimento: string | null;
  escolaridade: string | null;
  situacao: string | null;
  condicaoEleitoral: string | null;
  gabinete: { nome?: string; predio?: string; sala?: string; telefone?: string } | null;
};

export async function searchDeputados(nome: string): Promise<DeputadoResumo[]> {
  const q = encodeURIComponent(nome.trim());
  const data = await get<{ dados: DeputadoResumo[] }>(
    `/deputados?nome=${q}&ordem=ASC&ordenarPor=nome&itens=15`,
    60 * 30,
  );
  return data.dados ?? [];
}

export async function getDeputado(id: number | string): Promise<DeputadoDetalhe> {
  const data = await get<{ dados: {
    id: number;
    nomeCivil: string;
    ultimoStatus: {
      nome: string;
      siglaPartido: string;
      siglaUf: string;
      urlFoto: string;
      email: string | null;
      idLegislatura: number;
      situacao: string | null;
      condicaoEleitoral: string | null;
      gabinete: DeputadoDetalhe["gabinete"];
    };
    dataNascimento: string | null;
    municipioNascimento: string | null;
    ufNascimento: string | null;
    escolaridade: string | null;
  } }>(`/deputados/${id}`);
  const d = data.dados;
  return {
    id: d.id,
    nome: d.ultimoStatus.nome,
    nomeCivil: d.nomeCivil,
    siglaPartido: d.ultimoStatus.siglaPartido,
    siglaUf: d.ultimoStatus.siglaUf,
    urlFoto: d.ultimoStatus.urlFoto,
    email: d.ultimoStatus.email,
    idLegislatura: d.ultimoStatus.idLegislatura,
    dataNascimento: d.dataNascimento,
    municipioNascimento: d.municipioNascimento,
    ufNascimento: d.ufNascimento,
    escolaridade: d.escolaridade,
    situacao: d.ultimoStatus.situacao,
    condicaoEleitoral: d.ultimoStatus.condicaoEleitoral,
    gabinete: d.ultimoStatus.gabinete,
  };
}

export type Frente = { id: number; titulo: string };

export async function getFrentes(id: number | string): Promise<Frente[]> {
  const data = await get<{ dados: Frente[] }>(`/deputados/${id}/frentes`);
  return data.dados ?? [];
}

export type Proposicao = {
  id: number;
  siglaTipo: string;
  numero: number;
  ano: number;
  ementa: string;
  dataApresentacao: string;
};

export async function getProposicoesPorAutor(
  id: number | string,
  itens = 60,
): Promise<Proposicao[]> {
  const data = await get<{ dados: Proposicao[] }>(
    `/proposicoes?idDeputadoAutor=${id}&itens=${itens}&ordem=DESC&ordenarPor=id`,
    60 * 60 * 6,
  );
  return data.dados ?? [];
}

const TIPO_TEMA: Record<string, string> = {
  PL: "Projetos de Lei",
  PLP: "Leis Complementares",
  PEC: "Emendas à Constituição",
  PDL: "Decretos Legislativos",
  RIC: "Requerimentos de Informação",
  REQ: "Requerimentos",
  INC: "Indicações",
  MPV: "Medidas Provisórias",
};

/** Composição das bancadas: nº de deputados federais por sigla. Cache 24h. */
export async function getBancadaCamara(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  let url = `${BASE}/deputados?ordem=ASC&ordenarPor=nome&itens=100`;
  for (let i = 0; i < 7 && url; i++) {
    let data: { dados: { siglaPartido: string }[]; links: { rel: string; href: string }[] };
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 60 * 60 * 24 } });
      if (!res.ok) break;
      data = await res.json();
    } catch {
      break;
    }
    for (const d of data.dados ?? []) {
      const s = (d.siglaPartido ?? "").toUpperCase();
      if (s) out[s] = (out[s] ?? 0) + 1;
    }
    url = data.links?.find((l) => l.rel === "next")?.href ?? "";
  }
  return out;
}

// ---------- Votações nominais (roll-call) ----------

export type VotoNominal = 1 | -1 | 0; // Sim / Não / outro

export type RollCall = {
  votacoes: { id: string; descricao: string; data: string }[];
  /** deputadoId → perfil + vetor de votos alinhado a `votacoes` */
  byDeputado: Record<string, { nome: string; partido: string; uf: string; votos: VotoNominal[] }>;
};

function classificaVoto(tipo: string): VotoNominal {
  const t = (tipo || "").trim().toLowerCase();
  if (t === "sim") return 1;
  if (t === "não" || t === "nao") return -1;
  return 0;
}

type VotacaoLista = { id: string; siglaOrgao: string; descricao: string; data: string };

async function listarVotacoesJanela(ini: string, fim: string): Promise<VotacaoLista[]> {
  const out: VotacaoLista[] = [];
  let url: string | null =
    `${BASE}/votacoes?dataInicio=${ini}&dataFim=${fim}&itens=100&ordenarPor=dataHoraRegistro&ordem=DESC`;
  for (let p = 0; p < 12 && url; p++) {
    try {
      const res: Response = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 },
      });
      if (!res.ok) break;
      const j: { dados?: VotacaoLista[]; links?: { rel: string; href: string }[] } = await res.json();
      out.push(...(j.dados ?? []));
      url = j.links?.find((l) => l.rel === "next")?.href ?? null;
    } catch {
      break;
    }
  }
  return out;
}

/** Votações nominais do plenário (janela longa — ano eleitoral tem poucas), com o
 *  voto de cada deputado. Cache 24h. */
export async function getRollCall(meses = 18): Promise<RollCall> {
  const hoje = new Date();
  const janelas: [string, string][] = [];
  for (let i = 0; i < Math.ceil(meses / 3); i++) {
    const fim = new Date(hoje);
    fim.setMonth(fim.getMonth() - i * 3);
    const ini = new Date(fim);
    ini.setMonth(ini.getMonth() - 3);
    janelas.push([ini.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)]);
  }

  const listas = await Promise.all(janelas.map((j) => listarVotacoesJanela(j[0], j[1])));
  // pré-filtro barato: a descrição de uma votação nominal registrada traz
  // "Sim: N; Não: M; ...". As demais são simbólicas / procedimentais.
  const RE_NOMINAL = /sim:\s*\d+;\s*n[ãa]o:\s*\d+/i;
  const plen = listas
    .flat()
    .filter((v) => v.siglaOrgao === "PLEN" && RE_NOMINAL.test(v.descricao))
    .slice(0, 44);

  type VotoRow = { tipoVoto: string; deputado_: { id: number; nome: string; siglaPartido: string; siglaUf: string } };
  const brutos = await Promise.all(
    plen.map(async (v) => {
      try {
        const r = await get<{ dados: VotoRow[] }>(`/votacoes/${v.id}/votos`, 60 * 60 * 24 * 7);
        return { v, votos: r.dados ?? [] };
      } catch {
        return { v, votos: [] as VotoRow[] };
      }
    }),
  );

  const validos = brutos.filter((b) => b.votos.length >= 150);
  const votacoes: RollCall["votacoes"] = validos.map((b) => ({
    id: b.v.id,
    descricao: b.v.descricao,
    data: b.v.data,
  }));
  const n = votacoes.length;
  const byDeputado: RollCall["byDeputado"] = {};

  validos.forEach((b, col) => {
    for (const x of b.votos) {
      const id = String(x.deputado_.id);
      if (!byDeputado[id]) {
        byDeputado[id] = {
          nome: x.deputado_.nome,
          partido: (x.deputado_.siglaPartido ?? "").toUpperCase(),
          uf: x.deputado_.siglaUf ?? "",
          votos: new Array(n).fill(0),
        };
      }
      byDeputado[id].votos[col] = classificaVoto(x.tipoVoto);
    }
  });

  return { votacoes, byDeputado };
}

/** Federações partidárias de 2022 (para agrupar no grafo). */
export const FEDERACOES_2022: Record<string, string> = {
  PT: "FE Brasil da Esperança",
  PCDOB: "FE Brasil da Esperança",
  "PC DO B": "FE Brasil da Esperança",
  PV: "FE Brasil da Esperança",
  PSDB: "Federação PSDB Cidadania",
  CIDADANIA: "Federação PSDB Cidadania",
  PSOL: "Federação PSOL Rede",
  REDE: "Federação PSOL Rede",
};

export function resumirProposicoes(props: Proposicao[]) {
  const porTipo = new Map<string, number>();
  let comEmenta = 0;
  for (const p of props) {
    const label = TIPO_TEMA[p.siglaTipo] ?? p.siglaTipo;
    porTipo.set(label, (porTipo.get(label) ?? 0) + 1);
    if (p.ementa) comEmenta++;
  }
  const tipos = [...porTipo.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  return { total: props.length, tipos, comEmenta };
}
