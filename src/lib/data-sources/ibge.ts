/**
 * Cliente do Serviço de Dados do IBGE (localidades, malhas, agregados/SIDRA).
 * https://servicodados.ibge.gov.br — REST JSON, sem chave. Acessível de servidor.
 */
const LOC = "https://servicodados.ibge.gov.br/api/v1/localidades";
const MALHA = "https://servicodados.ibge.gov.br/api/v3/malhas";
const AGREG = "https://servicodados.ibge.gov.br/api/v3/agregados";

async function get<T>(url: string, revalidate = 60 * 60 * 24 * 7): Promise<T> {
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`IBGE ${res.status} em ${url}`);
  return (await res.json()) as T;
}

export type Estado = {
  id: number;
  sigla: string;
  nome: string;
  regiao: { id: number; sigla: string; nome: string };
};

export async function getEstados(): Promise<Estado[]> {
  return get<Estado[]>(`${LOC}/estados?orderBy=nome`);
}

export async function getEstadoPorSigla(uf: string): Promise<Estado | null> {
  const all = await getEstados();
  return all.find((e) => e.sigla === uf.toUpperCase()) ?? null;
}

export type Municipio = {
  id: number;
  nome: string;
  microrregiao?: { nome: string; mesorregiao?: { nome: string } };
  ["regiao-imediata"]?: { nome: string };
};

export async function getMunicipios(uf: string): Promise<Municipio[]> {
  return get<Municipio[]>(`${LOC}/estados/${uf.toUpperCase()}/municipios?orderBy=nome`);
}

export type GeoFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: string; coordinates: unknown };
    properties: { codarea: string; [k: string]: unknown };
  }[];
};

/** GeoJSON da malha municipal de um estado. `qualidade=minima` (~300KB p/ SP). */
export async function getMalhaMunicipiosUF(
  ufId: number | string,
): Promise<GeoFeatureCollection> {
  return get<GeoFeatureCollection>(
    `${MALHA}/estados/${ufId}?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=minima`,
    60 * 60 * 24 * 30,
  );
}

/** GeoJSON da malha de um estado (divisão intramunicipal opcional). */
export async function getMalhaEstado(
  ufId: number | string,
  intrarregiao: "municipio" | "regiao-imediata" | "UF" = "municipio",
): Promise<unknown> {
  return get(
    `${MALHA}/estados/${ufId}?formato=application/vnd.geo+json&intrarregiao=${intrarregiao}&qualidade=intermediaria`,
  );
}

/**
 * População (Censo 2022, agregado 4709 / variável 93) de todos os municípios de um estado.
 * Retorna mapa código IBGE (7 dígitos) → { nome, populacao }.
 */
export async function getPopulacaoMunicipiosUF(
  ufId: number | string,
): Promise<Record<string, { nome: string; populacao: number }>> {
  type Row = {
    resultados: {
      series: {
        localidade: { id: string; nome: string };
        serie: Record<string, string>;
      }[];
    }[];
  };
  const data = await get<Row[]>(
    `${AGREG}/4709/periodos/2022/variaveis/93?localidades=N6[N3[${ufId}]]`,
    60 * 60 * 24 * 30,
  );
  const out: Record<string, { nome: string; populacao: number }> = {};
  const series = data?.[0]?.resultados?.[0]?.series ?? [];
  for (const s of series) {
    const pop = Number(s.serie["2022"]);
    out[s.localidade.id] = {
      nome: s.localidade.nome.replace(/ - [A-Z]{2}$/, ""),
      populacao: Number.isNaN(pop) ? 0 : pop,
    };
  }
  return out;
}

export async function getMalhaBrasilUFs(): Promise<GeoFeatureCollection> {
  return get<GeoFeatureCollection>(
    `${MALHA}/paises/BR?formato=application/vnd.geo+json&intrarregiao=UF&qualidade=intermediaria`,
    60 * 60 * 24 * 30,
  );
}

/** Mapa código IBGE de 2 dígitos da UF → sigla (ex.: "35" → "SP"). */
export async function getUFSiglaByCode(): Promise<Record<string, string>> {
  const estados = await getEstados();
  const out: Record<string, string> = {};
  for (const e of estados) out[String(e.id)] = e.sigla;
  return out;
}

/**
 * PIB total por UF (agregado 5938 / variável 37, R$ 1.000). Retorna sigla → R$.
 */
export async function getPibUF(): Promise<Record<string, number>> {
  const [data, estados] = await Promise.all([
    get<SerieRow[]>(`${AGREG}/5938/periodos/-1/variaveis/37?localidades=N3[all]`, 60 * 60 * 24 * 30),
    getEstados(),
  ]);
  const nomeToSigla = new Map(estados.map((e) => [e.nome, e.sigla]));
  const idToSigla = new Map(estados.map((e) => [String(e.id), e.sigla]));
  const out: Record<string, number> = {};
  for (const s of data?.[0]?.resultados?.[0]?.series ?? []) {
    const sigla = idToSigla.get(s.localidade.id) ?? nomeToSigla.get(s.localidade.nome);
    if (sigla) out[sigla] = lastValue(s.serie) * 1000;
  }
  return out;
}

/**
 * População estimada por UF (agregado 6579, variável 9324). Retorna sigla → hab.
 */
export async function getPopulacaoUFBySigla(): Promise<Record<string, { nome: string; populacao: number }>> {
  const [data, estados] = await Promise.all([
    get<SerieRow[]>(`${AGREG}/6579/periodos/-1/variaveis/9324?localidades=N3[all]`, 60 * 60 * 24),
    getEstados(),
  ]);
  const idToEstado = new Map(estados.map((e) => [String(e.id), e]));
  const nomeToEstado = new Map(estados.map((e) => [e.nome, e]));
  const out: Record<string, { nome: string; populacao: number }> = {};
  for (const s of data?.[0]?.resultados?.[0]?.series ?? []) {
    const est = idToEstado.get(s.localidade.id) ?? nomeToEstado.get(s.localidade.nome);
    if (est) out[est.sigla] = { nome: est.nome, populacao: lastValue(s.serie) };
  }
  return out;
}

type SerieRow = {
  resultados: {
    series: { localidade: { id: string; nome: string }; serie: Record<string, string> }[];
  }[];
};

function lastValue(serie: Record<string, string>): number {
  const vals = Object.values(serie);
  const n = Number(vals[vals.length - 1]);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * PIB total dos municípios de um estado (agregado 5938 / variável 37, R$ 1.000, ~2021).
 * Usado como proxy de renda territorial quando dividido pela população.
 */
export async function getPibMunicipiosUF(
  ufId: number | string,
): Promise<Record<string, number>> {
  const data = await get<SerieRow[]>(
    `${AGREG}/5938/periodos/-1/variaveis/37?localidades=N6[N3[${ufId}]]`,
    60 * 60 * 24 * 30,
  );
  const out: Record<string, number> = {};
  for (const s of data?.[0]?.resultados?.[0]?.series ?? []) {
    out[s.localidade.id] = lastValue(s.serie) * 1000; // R$ 1.000 → R$
  }
  return out;
}

/**
 * População estimada mais recente por UF (agregado 6579, variável 9324).
 * Retorna mapa sigla → população.
 */
export async function getPopulacaoUF(): Promise<Record<string, number>> {
  type Row = {
    resultados: {
      series: { localidade: { id: string; nome: string }; serie: Record<string, string> }[];
    }[];
  };
  const data = await get<Row[]>(
    `${AGREG}/6579/periodos/-1/variaveis/9324?localidades=N3[all]`,
    60 * 60 * 24,
  );
  const out: Record<string, number> = {};
  const series = data?.[0]?.resultados?.[0]?.series ?? [];
  for (const s of series) {
    const vals = Object.values(s.serie);
    const last = vals[vals.length - 1];
    const n = Number(last);
    if (!Number.isNaN(n)) out[s.localidade.nome] = n;
  }
  return out;
}
