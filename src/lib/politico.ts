import {
  searchDeputados,
  getDeputado,
  getFrentes,
  getProposicoesPorAutor,
  resumirProposicoes,
} from "@/lib/data-sources/camara";
import { searchSenadores, getSenador } from "@/lib/data-sources/senado";
import { getEstadoPorSigla, getMunicipios } from "@/lib/data-sources/ibge";
import {
  buscarCandidatosTSE,
  BrasilioThrottled,
  type CandidatoEleitoral,
} from "@/lib/data-sources/eleitoral";
import { CARGO_LABEL, anoEleicao, type Cargo } from "@/lib/cargos";

export type Fonte = "camara" | "senado" | "tse" | "manual";

export type PoliticoBusca = {
  source: Fonte;
  externalId: string;
  nome: string;
  partido: string;
  uf: string;
  casa: string;
  cargo?: Cargo;
  ano?: number;
  situacao?: string;
  foto: string;
};

export type PerfilPolitico = {
  source: Fonte;
  externalId: string;
  nome: string;
  nomeCompleto?: string;
  partido: string;
  uf: string;
  casa: string;
  cargo?: Cargo;
  ano?: number;
  foto: string;
  email: string | null;
  nascimento?: string | null;
  situacao?: string | null;
  escolaridade?: string | null;
  frentes: { id: number; titulo: string }[];
  proposicoes: {
    total: number;
    comEmenta: number;
    tipos: { label: string; count: number }[];
    recentes: { titulo: string; ementa: string; data: string }[];
  } | null;
  territorio: {
    uf: string;
    ufNome: string;
    regiao: string;
    municipios: number;
  } | null;
};

/** Busca nas casas federais (Câmara + Senado), rápida e sem rate limit. */
export async function buscarPoliticos(q: string): Promise<PoliticoBusca[]> {
  const termo = q.trim();
  if (termo.length < 2) return [];

  const [deps, sens] = await Promise.allSettled([
    searchDeputados(termo),
    searchSenadores(termo),
  ]);

  const out: PoliticoBusca[] = [];
  if (deps.status === "fulfilled") {
    for (const d of deps.value) {
      out.push({
        source: "camara",
        externalId: String(d.id),
        nome: d.nome,
        partido: d.siglaPartido,
        uf: d.siglaUf,
        casa: "Câmara dos Deputados",
        cargo: "deputado-federal",
        foto: d.urlFoto,
      });
    }
  }
  if (sens.status === "fulfilled") {
    for (const s of sens.value) {
      out.push({
        source: "senado",
        externalId: s.codigo,
        nome: s.nome,
        partido: s.siglaPartido,
        uf: s.uf,
        casa: "Senado Federal",
        cargo: "senador",
        foto: s.urlFoto,
      });
    }
  }
  return out;
}

export type CandidatoTSEDisplay = CandidatoEleitoral & { casa: string; foto: string };

/** Busca no espelho do TSE (brasil.io) — todos os cargos. Pode lançar BrasilioThrottled. */
export async function buscarPoliticosTSE(q: string): Promise<CandidatoTSEDisplay[]> {
  const cands = await buscarCandidatosTSE(q);
  return cands.map((c) => {
    const nivel = CARGO_LABEL[c.cargo].nivel;
    const escopo = nivel === "municipal" ? c.unidadeEleitoral : c.uf;
    return {
      ...c,
      casa: `${CARGO_LABEL[c.cargo].pt} · ${escopo} · ${c.ano}`,
      foto: "",
    };
  });
}

export async function territorioDaUF(uf: string) {
  if (!uf) return null;
  try {
    const [estado, muns] = await Promise.all([
      getEstadoPorSigla(uf),
      getMunicipios(uf).catch(() => []),
    ]);
    if (!estado) return null;
    return {
      uf: estado.sigla,
      ufNome: estado.nome,
      regiao: estado.regiao.nome,
      municipios: muns.length,
    };
  } catch {
    return null;
  }
}

export async function montarPerfil(
  source: Fonte,
  externalId: string,
): Promise<PerfilPolitico | null> {
  if (source === "camara") {
    const [det, frentes, props] = await Promise.all([
      getDeputado(externalId),
      getFrentes(externalId).catch(() => []),
      getProposicoesPorAutor(externalId).catch(() => []),
    ]);
    const resumo = resumirProposicoes(props);
    const territorio = await territorioDaUF(det.siglaUf);
    return {
      source,
      externalId,
      nome: det.nome,
      nomeCompleto: det.nomeCivil,
      partido: det.siglaPartido,
      uf: det.siglaUf,
      casa: "Câmara dos Deputados",
      cargo: "deputado-federal",
      foto: det.urlFoto,
      email: det.email,
      nascimento: det.dataNascimento,
      situacao: det.situacao,
      escolaridade: det.escolaridade,
      frentes: frentes.map((f) => ({ id: f.id, titulo: f.titulo })),
      proposicoes: {
        total: resumo.total,
        comEmenta: resumo.comEmenta,
        tipos: resumo.tipos,
        recentes: props.slice(0, 5).map((p) => ({
          titulo: `${p.siglaTipo} ${p.numero}/${p.ano}`,
          ementa: p.ementa,
          data: p.dataApresentacao,
        })),
      },
      territorio,
    };
  }

  if (source === "senado") {
    const sen = await getSenador(externalId);
    if (!sen) return null;
    const territorio = await territorioDaUF(sen.uf);
    return {
      source,
      externalId,
      nome: sen.nome,
      nomeCompleto: sen.nomeCompleto,
      partido: sen.siglaPartido,
      uf: sen.uf,
      casa: "Senado Federal",
      cargo: "senador",
      foto: sen.urlFoto,
      email: sen.email,
      frentes: [],
      proposicoes: null,
      territorio,
    };
  }

  // source === "tse": o perfil é montado por perfilFromCandidatoEleitoral (no select).
  return null;
}

/** Monta o perfil TSE a partir de um objeto de candidato já em mãos (evita 2ª busca). */
export async function perfilFromCandidatoEleitoral(
  c: CandidatoEleitoral,
): Promise<PerfilPolitico> {
  const territorio = await territorioDaUF(c.uf);
  return {
    source: "tse",
    externalId: c.externalId,
    nome: c.nome,
    partido: c.partido,
    uf: c.uf,
    casa: `${CARGO_LABEL[c.cargo].pt} · ${c.ano}`,
    cargo: c.cargo,
    ano: c.ano,
    foto: "",
    email: null,
    nascimento: c.nascimento,
    situacao: c.situacao,
    escolaridade: c.escolaridade,
    frentes: [],
    proposicoes: null,
    territorio,
  };
}

/** Perfil de candidato cadastrado manualmente (1ª campanha, sem histórico). */
export async function perfilManual(input: {
  nome: string;
  partido: string;
  uf: string;
  cargo: Cargo;
}): Promise<PerfilPolitico> {
  const territorio = await territorioDaUF(input.uf);
  return {
    source: "manual",
    externalId: `manual-${Date.now()}`,
    nome: input.nome,
    partido: input.partido.toUpperCase(),
    uf: input.uf.toUpperCase(),
    casa: CARGO_LABEL[input.cargo]?.pt ?? input.cargo,
    cargo: input.cargo,
    ano: 2026,
    foto: "",
    email: null,
    nascimento: null,
    situacao: null,
    escolaridade: null,
    frentes: [],
    proposicoes: null,
    territorio,
  };
}

export { BrasilioThrottled, anoEleicao };
