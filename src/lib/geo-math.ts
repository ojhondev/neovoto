/**
 * Matemática de geografia — puro, sem dependência de framework (importável em
 * scripts de backtest). O cliente com I/O e cache vive em data-sources/geo.ts.
 */

export type MunicipioGeo = {
  code: string;
  nome: string;
  regImediata: string;
  nomeRegImediata: string;
  regIntermediaria: string;
  lat: number;
  lng: number;
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['´`^~.]/g, "").replace(/\s+/g, " ").trim();

/** Distância aproximada em km entre dois pontos (Haversine). 0 quando falta coordenada. */
export function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  if (!a.lat || !a.lng || !b.lat || !b.lng) return 0;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Resolve um nome de município (ex.: cidade natal do TSE) para o código IBGE na UF. */
export function codeFromNome(geo: MunicipioGeo[], nome: string): string | null {
  const n = norm(nome);
  const hit = geo.find((g) => norm(g.nome) === n);
  return hit?.code ?? null;
}
