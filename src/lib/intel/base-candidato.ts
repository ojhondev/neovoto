/**
 * Base do Candidato — o alcance territorial REAL de uma candidatura.
 * ================================================================
 * O erro que este motor corrige: sem histórico de voto próprio, todos os módulos
 * caíam no contexto do território (população + renda + voto do partido) e
 * recomendavam as maiores cidades do estado — ignorando a pessoa. Aqui a pergunta
 * é outra: *onde este candidato, especificamente, tem pé para tirar voto?*
 *
 * Cascata de evidência, da mais forte para a mais fraca:
 *   1. Votação própria — TODAS as campanhas passadas da pessoa (mesmo outro cargo,
 *      mesmo derrotado). Um vereador que teve 184 votos em Botucatu tem uma âncora
 *      geográfica real; um deputado estreante herda o mapa de onde já atuou.
 *   2. Âncora + decaimento — cidade natal / domicílio eleitoral. A influência decai
 *      com a distância (Haversine sobre centroides do IBGE) e é limitada à
 *      REGIÃO GEOGRÁFICA IMEDIATA e INTERMEDIÁRIA da âncora (agrupamento oficial —
 *      não um raio inventado).
 *   3. Rede partidária local — municípios onde o partido dele elegeu alguém,
 *      ponderados pela proximidade à âncora (os padrinhos "de estrutura").
 *   4. Apoios declarados — fração transferível do voto dos padrinhos nos redutos deles.
 *
 * `modo: "contexto"` quando NADA disso existe: aí a plataforma diz isso em voz alta
 * em vez de fingir um ranking.
 */
import { distKm, type MunicipioGeo } from "@/lib/geo-math";

export const BASE_CANDIDATO_VERSION = "base-candidato-v1";

export type FonteAlcance = "propria" | "ancora" | "rede-partido" | "apoios";
export type Confianca = "alta" | "media" | "baixa" | "nenhuma";

export type CampanhaPropria = {
  ano: number;
  cargo: string;
  /** votos por código IBGE do município */
  byCode: Record<string, number>;
  totalVotos: number;
  eleito: boolean;
};

export type BaseCandidatoEntrada = {
  anoAlvo: number;
  geo: MunicipioGeo[];
  /** campanhas passadas da própria pessoa (com resultado) */
  campanhas: CampanhaPropria[];
  /** código IBGE da âncora (domicílio/nascimento) + como foi obtida */
  ancoraCode: string | null;
  ancoraVia: "declarado" | "nascimento" | "ultima-campanha" | null;
  /** municípios extras declarados como base */
  baseDeclarada: string[];
  /** municípios onde o partido elegeu alguém → votos */
  eleitosPartido: Record<string, number>;
  /** votos já transferidos dos apoios, por código IBGE (saída de basePorApoios) */
  apoiosByCode: Record<string, number>;
  apoiosNomes: string[];
};

export type BaseCandidato = {
  version: string;
  modo: "candidato" | "contexto";
  ancora: { code: string; nome: string; regImediata: string; via: string } | null;
  regImediataCodes: string[];
  regIntermediariaCodes: string[];
  alcanceByCode: Record<string, number>; // 0..1
  confiancaByCode: Record<string, Confianca>;
  fonteByCode: Record<string, FonteAlcance>;
  cobertura: number; // fração dos municípios com alcance > 0.2
  temSinalProprio: boolean;
  camadas: {
    propria?: { ano: number; cargo: string; municipios: number; votos: number; eleito: boolean };
    ancora?: { regImediata: string; municipios: number };
    redePartido?: { municipios: number };
    apoios?: { total: number; nomes: string[] };
  };
  fontes: string[];
};

const CONF_RANK: Record<Confianca, number> = { nenhuma: 0, baixa: 1, media: 2, alta: 3 };

function bump(
  code: string,
  v: number,
  conf: Confianca,
  fonte: FonteAlcance,
  alc: Record<string, number>,
  cf: Record<string, Confianca>,
  fn: Record<string, FonteAlcance>,
) {
  if (v <= 0) return;
  if (v > (alc[code] ?? 0)) {
    alc[code] = Math.min(1, v);
    fn[code] = fonte;
  }
  if (CONF_RANK[conf] > CONF_RANK[cf[code] ?? "nenhuma"]) cf[code] = conf;
}

export function computeBaseCandidato(e: BaseCandidatoEntrada): BaseCandidato {
  const alc: Record<string, number> = {};
  const cf: Record<string, Confianca> = {};
  const fn: Record<string, FonteAlcance> = {};
  const geoByCode = new Map(e.geo.map((g) => [g.code, g]));
  const fontes = new Set<string>();

  // ---------- 1) votação própria ----------
  let camadaPropria: BaseCandidato["camadas"]["propria"];
  const campanhasOrdenadas = [...e.campanhas].sort((a, b) => b.ano - a.ano);
  for (const c of campanhasOrdenadas) {
    const vals = Object.values(c.byCode);
    const max = Math.max(1, ...vals);
    const recencia = Math.exp(-(e.anoAlvo - c.ano) / 6); // meia-vida ~4 anos
    for (const [code, v] of Object.entries(c.byCode)) {
      const share = v / max; // 1 no melhor município da campanha
      const contrib = Math.min(1, share * 1.15) * recencia;
      const conf: Confianca = contrib >= 0.3 ? "alta" : contrib >= 0.1 ? "media" : "baixa";
      bump(code, contrib, conf, "propria", alc, cf, fn);
    }
    if (!camadaPropria && vals.length > 0) {
      camadaPropria = {
        ano: c.ano,
        cargo: c.cargo,
        municipios: vals.length,
        votos: c.totalVotos,
        eleito: c.eleito,
      };
      fontes.add("TSE / Base dos Dados — votação do candidato em campanhas anteriores");
    }
  }

  // ---------- âncora + regiões ----------
  const anchorGeo = e.ancoraCode ? geoByCode.get(e.ancoraCode) ?? null : null;
  const regImediata = anchorGeo?.regImediata ?? "";
  const regInter = anchorGeo?.regIntermediaria ?? "";
  const regImediataCodes = regImediata
    ? e.geo.filter((g) => g.regImediata === regImediata).map((g) => g.code)
    : [];
  const regIntermediariaCodes = regInter
    ? e.geo.filter((g) => g.regIntermediaria === regInter).map((g) => g.code)
    : [];

  // ---------- 2) âncora + decaimento por distância ----------
  let camadaAncora: BaseCandidato["camadas"]["ancora"];
  if (anchorGeo) {
    const temCoord = !!anchorGeo.lat && !!anchorGeo.lng;
    for (const g of e.geo) {
      let w = 0;
      let conf: Confianca = "nenhuma";
      const mesmaImediata = g.regImediata === regImediata && !!regImediata;
      const mesmaInter = g.regIntermediaria === regInter && !!regInter;
      if (g.code === anchorGeo.code) {
        w = 0.9;
        conf = "alta";
      } else if (temCoord) {
        const d = distKm(anchorGeo, g);
        if (mesmaImediata) {
          w = Math.max(0.4, 0.78 * Math.exp(-d / 28));
          conf = "media";
        } else if (mesmaInter) {
          w = 0.5 * Math.exp(-d / 55);
          conf = "baixa";
        } else if (d > 0 && d < 130) {
          w = 0.32 * Math.exp(-d / 70);
          conf = "baixa";
        }
      } else {
        // sem centroide: só o pertencimento à região
        if (mesmaImediata) { w = 0.62; conf = "media"; }
        else if (mesmaInter) { w = 0.34; conf = "baixa"; }
      }
      bump(g.code, w, conf, "ancora", alc, cf, fn);
    }
    camadaAncora = {
      regImediata: anchorGeo.nomeRegImediata || anchorGeo.regImediata,
      municipios: regImediataCodes.length,
    };
    fontes.add("IBGE — região geográfica imediata e centroide dos municípios");
  }

  // base declarada: trata como âncoras secundárias fortes
  for (const code of e.baseDeclarada) {
    bump(code, 0.8, "alta", "ancora", alc, cf, fn);
  }

  // ---------- 3) rede partidária local ----------
  let camadaRede: BaseCandidato["camadas"]["redePartido"];
  const eleitosCodes = Object.keys(e.eleitosPartido);
  if (eleitosCodes.length > 0) {
    const maxE = Math.max(1, ...Object.values(e.eleitosPartido));
    for (const [code, votos] of Object.entries(e.eleitosPartido)) {
      const g = geoByCode.get(code);
      const forca = votos / maxE; // peso do mandato do partido ali
      let prox = 0.5;
      if (anchorGeo && g && anchorGeo.lat && g.lat) {
        const d = distKm(anchorGeo, g);
        prox = Math.exp(-d / 90);
      } else if (anchorGeo && g) {
        prox = g.regImediata === regImediata ? 1 : g.regIntermediaria === regInter ? 0.55 : 0.3;
      }
      const w = 0.55 * prox * (0.5 + 0.5 * forca);
      bump(code, w, prox > 0.5 ? "media" : "baixa", "rede-partido", alc, cf, fn);
    }
    camadaRede = { municipios: eleitosCodes.length };
    fontes.add("TSE / Base dos Dados — mandatos eleitos do partido");
  }

  // ---------- 4) apoios declarados ----------
  let camadaApoios: BaseCandidato["camadas"]["apoios"];
  const apoiosCodes = Object.keys(e.apoiosByCode);
  if (apoiosCodes.length > 0) {
    const maxA = Math.max(1, ...Object.values(e.apoiosByCode));
    for (const [code, v] of Object.entries(e.apoiosByCode)) {
      const w = 0.58 * (v / maxA);
      bump(code, w, "media", "apoios", alc, cf, fn);
    }
    const total = Object.values(e.apoiosByCode).reduce((s, v) => s + v, 0);
    camadaApoios = { total, nomes: e.apoiosNomes };
    fontes.add("NeoVoto — transferência de base dos apoios declarados");
  }

  const temSinalProprio = !!camadaPropria || !!camadaApoios || !!e.baseDeclarada.length;
  const modo: BaseCandidato["modo"] =
    temSinalProprio || anchorGeo || camadaRede ? "candidato" : "contexto";

  const totalMun = e.geo.length || 1;
  const comAlcance = Object.values(alc).filter((v) => v >= 0.2).length;

  return {
    version: BASE_CANDIDATO_VERSION,
    modo,
    ancora: anchorGeo
      ? {
          code: anchorGeo.code,
          nome: anchorGeo.nome,
          regImediata: anchorGeo.nomeRegImediata || anchorGeo.regImediata,
          via: e.ancoraVia ?? "",
        }
      : null,
    regImediataCodes,
    regIntermediariaCodes,
    alcanceByCode: modo === "contexto" ? {} : alc,
    confiancaByCode: cf,
    fonteByCode: fn,
    cobertura: comAlcance / totalMun,
    temSinalProprio,
    camadas: {
      propria: camadaPropria,
      ancora: camadaAncora,
      redePartido: camadaRede,
      apoios: camadaApoios,
    },
    fontes: [...fontes],
  };
}
