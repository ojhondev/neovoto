import {
  searchDeputados,
  getDeputado,
  getFrentes,
  getProposicoesPorAutor,
  resumirProposicoes,
} from "@/lib/data-sources/camara";
import { searchSenadores, getSenador } from "@/lib/data-sources/senado";
import { getEstadoPorSigla, getMunicipios } from "@/lib/data-sources/ibge";

export type Fonte = "camara" | "senado";

export type PoliticoBusca = {
  source: Fonte;
  externalId: string;
  nome: string;
  partido: string;
  uf: string;
  casa: string;
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

/** Busca unificada por nome nas duas casas. */
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
        foto: s.urlFoto,
      });
    }
  }
  return out;
}

async function territorioDaUF(uf: string) {
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
    foto: sen.urlFoto,
    email: sen.email,
    frentes: [],
    proposicoes: null,
    territorio,
  };
}
