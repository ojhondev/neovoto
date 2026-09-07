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

/** GeoJSON da malha de um estado (divisão intramunicipal opcional). */
export async function getMalhaEstado(
  ufId: number | string,
  intrarregiao: "municipio" | "regiao-imediata" | "UF" = "municipio",
): Promise<unknown> {
  return get(
    `${MALHA}/estados/${ufId}?formato=application/vnd.geo+json&intrarregiao=${intrarregiao}&qualidade=intermediaria`,
  );
}

export async function getMalhaBrasilUFs(): Promise<unknown> {
  return get(
    `${MALHA}/paises/BR?formato=application/vnd.geo+json&intrarregiao=UF&qualidade=intermediaria`,
  );
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
