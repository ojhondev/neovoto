/**
 * Cliente dos Dados Abertos do Senado Federal.
 * https://legis.senado.leg.br/dadosabertos — REST, JSON via ?format=json. Acessível de servidor.
 */
const BASE = "https://legis.senado.leg.br/dadosabertos";

async function getJson<T>(path: string, revalidate = 60 * 60 * 12): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}format=json`, {
    headers: { Accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Senado ${res.status} em ${path}`);
  return (await res.json()) as T;
}

export type SenadorResumo = {
  codigo: string;
  nome: string;
  nomeCompleto: string;
  siglaPartido: string;
  uf: string;
  urlFoto: string;
  urlPagina: string;
  email: string | null;
};

type ParlamentarRaw = {
  IdentificacaoParlamentar: {
    CodigoParlamentar: string;
    NomeParlamentar: string;
    NomeCompletoParlamentar: string;
    UrlFotoParlamentar: string;
    UrlPaginaParlamentar: string;
    EmailParlamentar?: string;
    SiglaPartidoParlamentar?: string;
    UfParlamentar?: string;
  };
};

function normalize(p: ParlamentarRaw): SenadorResumo {
  const i = p.IdentificacaoParlamentar;
  return {
    codigo: i.CodigoParlamentar,
    nome: i.NomeParlamentar,
    nomeCompleto: i.NomeCompletoParlamentar,
    siglaPartido: i.SiglaPartidoParlamentar ?? "",
    uf: i.UfParlamentar ?? "",
    urlFoto: i.UrlFotoParlamentar,
    urlPagina: i.UrlPaginaParlamentar,
    email: i.EmailParlamentar ?? null,
  };
}

let cache: { at: number; list: SenadorResumo[] } | null = null;

export async function listSenadoresAtuais(): Promise<SenadorResumo[]> {
  if (cache && Date.now() - cache.at < 1000 * 60 * 60 * 6) return cache.list;
  const data = await getJson<{
    ListaParlamentarEmExercicio: {
      Parlamentares: { Parlamentar: ParlamentarRaw[] };
    };
  }>("/senador/lista/atual");
  const raw = data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar ?? [];
  const list = raw.map(normalize);
  cache = { at: Date.now(), list };
  return list;
}

export async function searchSenadores(nome: string): Promise<SenadorResumo[]> {
  const q = nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (q.length < 2) return [];
  const all = await listSenadoresAtuais();
  return all
    .filter((s) =>
      (s.nome + " " + s.nomeCompleto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .includes(q),
    )
    .slice(0, 15);
}

export async function getSenador(codigo: string): Promise<SenadorResumo | null> {
  const all = await listSenadoresAtuais();
  return all.find((s) => s.codigo === codigo) ?? null;
}
