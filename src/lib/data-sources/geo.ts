/**
 * Geografia dos municípios: região geográfica imediata / intermediária (IBGE) e
 * centroide. Prefere a Base dos Dados (traz o centroide num join direto); cai
 * para o IBGE (só o agrupamento por região, sem coordenada).
 *
 * É a espinha dorsal do "raio de influência" do candidato: a Região Imediata da
 * âncora (cidade natal / domicílio) é o entorno natural, oficial, dele —
 * não um raio arbitrário em km. A matemática pura vive em src/lib/geo-math.ts.
 */
import { unstable_cache } from "next/cache";
import { municipiosComRegiaoUF, basedosdadosDisponivel } from "@/lib/data-sources/basedosdados";
import { getMunicipios, getEstadoPorSigla } from "@/lib/data-sources/ibge";
import { distKm, codeFromNome, type MunicipioGeo } from "@/lib/geo-math";

export { distKm, codeFromNome };
export type { MunicipioGeo };

async function loadGeoUF(uf: string): Promise<MunicipioGeo[]> {
  if (basedosdadosDisponivel()) {
    try {
      const g = await municipiosComRegiaoUF(uf);
      if (g.length > 0) return g;
    } catch {
      /* cai para o IBGE */
    }
  }
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

export async function estadoIdOf(uf: string): Promise<number | null> {
  const e = await getEstadoPorSigla(uf).catch(() => null);
  return e?.id ?? null;
}
