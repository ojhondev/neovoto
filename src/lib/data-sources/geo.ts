/**
 * Geografia dos municípios: região geográfica imediata / intermediária (IBGE) e
 * centroide. Prefere a Base dos Dados (traz o centroide num join direto); cai
 * para o IBGE (só o agrupamento por região imediata, sem coordenada).
 *
 * É a espinha dorsal do "raio de influência" do candidato: a Região Imediata da
 * âncora (cidade natal / domicílio) é o entorno natural, oficial, dele —
 * não um raio arbitrário em km.
 */
import { unstable_cache } from "next/cache";
import { municipiosComRegiaoUF, type MunicipioGeo, basedosdadosDisponivel } from "@/lib/data-sources/basedosdados";
import { getMunicipios, getEstadoPorSigla } from "@/lib/data-sources/ibge";

export type { MunicipioGeo };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['´`^~.]/g, "").replace(/\s+/g, " ").trim();

async function loadGeoUF(uf: string): Promise<MunicipioGeo[]> {
  if (basedosdadosDisponivel()) {
    try {
      const g = await municipiosComRegiaoUF(uf);
      if (g.length > 0) return g;
    } catch {
      /* cai para o IBGE */
    }
  }
  // Fallback IBGE: agrupa por microrregião (proxy de região imediata), sem centroide.
  try {
    const muns = await getMunicipios(uf);
    return muns.map((m) => {
      const ri = m["regiao-imediata"]?.nome ?? m.microrregiao?.nome ?? "";
      return {
        code: String(m.id),
        nome: m.nome,
        regImediata: ri,
        nomeRegImediata: ri,
        regIntermediaria: m.microrregiao?.mesorregiao?.nome ?? "",
        lat: 0,
        lng: 0,
      };
    });
  } catch {
    return [];
  }
}

export const getGeoUF = unstable_cache(loadGeoUF, ["geo-uf-v1"], { revalidate: 60 * 60 * 24 * 30 });

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

export async function estadoIdOf(uf: string): Promise<number | null> {
  const e = await getEstadoPorSigla(uf).catch(() => null);
  return e?.id ?? null;
}
