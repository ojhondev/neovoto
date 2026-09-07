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
