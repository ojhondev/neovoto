/**
 * "Como Ganhar" — o playbook do Motor NeoVoto.
 * Junta o placar (quantos votos faltam, dos Cenários) com os passos que saem do
 * cruzamento de todos os módulos: onde concentrar (IFET), que tema ocupar
 * (Radar), com quem aliar (Coligações), onde atacar (Mapa de Influência).
 * Saída estratégica de uso interno.
 */
import type { Candidacy } from "@/db/schema";
import type { PerfilPolitico } from "@/lib/politico";
import type { Dictionary } from "@/lib/i18n";
import { CARGO_LABEL, type Cargo } from "@/lib/cargos";
import { analisarCandidatura } from "@/lib/intel/motor";
import { carregarCenarios } from "@/lib/intel/cenarios-load";
import { getIfetResumoUF, getIfetResumoNacional } from "@/lib/territory";
import { getVotacaoPartidoUF, getVotacaoPartidoNacional } from "@/lib/data-sources/regional";
import { escopoNacional, PLEITO_NACIONAL } from "@/lib/escopo";
import { getBancadaCamara } from "@/lib/data-sources/camara";
import { computeColigacoes } from "@/lib/intel/coligacoes";
import { computeInfluencia } from "@/lib/intel/influencia";

export const PLANO_VERSION = "plano-v1";

export type EixoPasso = "territorio" | "agenda" | "alianca" | "ataque" | "dado";

export type PassoPlano = {
  ordem: number;
  eixo: EixoPasso;
  titulo: string;
  detalhe: string;
  ganho: string | null;
  alvos: { nome: string; valor?: string }[];
  href: string;
};

export type PlanoNeoVoto = {
  version: string;
  objetivo: string;
  cargoLabel: string;
  candidato: string;
  placar: {
    tipoDisputa: "majoritaria" | "proporcional";
    votosBase: number;
    votosNecessarios: number;
    faltam: number;
    situacao: "eleito" | "disputa" | "fora";
    cenarios: { nome: string; votos: number; resultado: string }[];
  } | null;
  passos: PassoPlano[];
  frase: string;
  fontes: string[];
};

function num(n: number, locale: string) {
  return Math.round(n).toLocaleString(locale);
}

export async function computePlano(
  candidacy: Candidacy,
  perfil: PerfilPolitico,
  t: Dictionary,
  locale: "pt" | "en",
): Promise<PlanoNeoVoto> {
  const pt = locale === "pt";
  const uf = perfil.uf || candidacy.uf || "";
  const cargo = (candidacy.cargo as Cargo | null) ?? perfil.cargo ?? null;
  const cargoLabel = cargo ? CARGO_LABEL[cargo]?.[locale] ?? cargo : "";
  const objetivo =
    t.onboarding.objectives.find((o) => o.value === candidacy.objective)?.label ??
    candidacy.objective ??
    "";

  const nacional = escopoNacional(cargo);
  const [leitura, cenLoad, votDep, bancada, resumo] = await Promise.all([
    analisarCandidatura(candidacy, perfil, t, locale),
    carregarCenarios(candidacy, perfil, t),
    nacional
      ? getVotacaoPartidoNacional(PLEITO_NACIONAL.ano, PLEITO_NACIONAL.turno, PLEITO_NACIONAL.cargo).catch(() => [])
      : uf
        ? getVotacaoPartidoUF(2022, 1, uf, "deputado federal").catch(() => [])
        : Promise.resolve([]),
    getBancadaCamara().catch(() => ({}) as Record<string, number>),
    nacional
      ? getIfetResumoNacional(candidacy.id).catch(() => null)
      : uf
        ? getIfetResumoUF(uf, candidacy.id).catch(() => null)
        : Promise.resolve(null),
  ]);

  const colig =
    votDep.length > 100 && perfil.partido ? computeColigacoes(votDep, perfil.partido, bancada) : null;
  const inf =
    votDep.length > 100 && resumo && perfil.partido
      ? computeInfluencia(votDep, perfil.partido, bancada, resumo.nomeByCode)
      : null;
  const cen = cenLoad.ok ? cenLoad.cenarios : null;

  const fontes = new Set(leitura.fontes);
  const passos: PassoPlano[] = [];

  // 1) TERRITÓRIO — dos municípios-alvo dos Cenários (gap × IFET), com fallback nas ações do Motor
  if (cen && cen.municipiosAlvo.length > 0) {
    const top = cen.municipiosAlvo.slice(0, 5);
    const ganho = top.reduce((s, m) => s + m.ganhoPotencial, 0);
    passos.push({
      ordem: 0,
      eixo: "territorio",
      titulo: pt
        ? `Concentre a campanha em ${top.length} municípios`
        : `Concentrate the campaign on ${top.length} municipalities`,
      detalhe: pt
        ? "São os que mais encurtam o caminho: maior lacuna de voto a capturar, ponderada pela prioridade territorial (IFET)."
        : "They shorten the path most: the largest vote gap to capture, weighted by territorial priority (IFET).",
      ganho: pt ? `+${num(ganho, locale)} votos potenciais` : `+${num(ganho, locale)} potential votes`,
      alvos: top.map((m) => ({ nome: m.nome, valor: `+${num(m.ganhoPotencial, locale)} · IFET ${m.ifet}` })),
      href: "/painel/mapa-de-calor",
    });
  } else {
    const aTerr = leitura.acoes.find((a) => a.href.includes("mapa-de-calor"));
    if (aTerr)
      passos.push({
        ordem: 0,
        eixo: "territorio",
        titulo: aTerr.titulo,
        detalhe: aTerr.porque,
        ganho: null,
        alvos: [],
        href: aTerr.href,
      });
  }

  // 2) AGENDA — tema-lacuna do Radar (via ações do Motor)
  const aAgenda = leitura.acoes.find((a) => a.href.includes("mapa-de-propostas"));
  if (aAgenda)
    passos.push({
      ordem: 1,
      eixo: "agenda",
      titulo: aAgenda.titulo,
      detalhe: aAgenda.porque,
      ganho: null,
      alvos: [],
      href: aAgenda.href,
    });

  // 3) ALIANÇA — melhor parceiro afim (Coligações)
  const parceiro = colig?.parceiros.find((p) => p.afinidade === "afim");
  if (parceiro) {
    fontes.add(pt ? "Câmara — bancadas" : "Chamber — benches");
    passos.push({
      ordem: 2,
      eixo: "alianca",
      titulo: pt ? `Feche aliança com o ${parceiro.sigla}` : `Close an alliance with ${parceiro.sigla}`,
      detalhe: pt
        ? `Traz voto novo no território sem sobrepor a sua base (${Math.round(parceiro.sobreposicao * 100)}% de sobreposição) e soma ${parceiro.bancada} deputados — fundo partidário e tempo de TV.`
        : `Brings new votes without overlapping your base (${Math.round(parceiro.sobreposicao * 100)}% overlap) and adds ${parceiro.bancada} deputies — party fund and broadcast time.`,
      ganho: pt
        ? `+${num(parceiro.ganhoLiquido, locale)} votos novos`
        : `+${num(parceiro.ganhoLiquido, locale)} new votes`,
      alvos: colig!.parceiros
        .filter((p) => p.afinidade === "afim")
        .slice(0, 4)
        .map((p) => ({ nome: p.sigla, valor: `+${num(p.ganhoLiquido, locale)}` })),
      href: "/painel/coligacoes",
    });
  }

  // 4) ATAQUE — onde o adversário é frágil (Mapa de Influência)
  if (inf && inf.fragilidades.length > 0) {
    passos.push({
      ordem: 3,
      eixo: "ataque",
      titulo: pt
        ? "Ataque onde a estrutura do adversário é frágil"
        : "Strike where the opponent's structure is fragile",
      detalhe: pt
        ? `Municípios onde o campo adversário está presente mas abaixo de 50% e o seu campo já tem base — voto disputável com pouco esforço adicional.`
        : `Municipalities where the opponent field is present but below 50% and yours already has a base — contestable votes with little extra effort.`,
      ganho: null,
      alvos: inf.fragilidades.slice(0, 5).map((f) => ({
        nome: f.nome,
        valor: pt
          ? `adv ${Math.round(f.advShare * 100)}% · você ${Math.round(f.seuShare * 100)}%`
          : `opp ${Math.round(f.advShare * 100)}% · you ${Math.round(f.seuShare * 100)}%`,
      })),
      href: "/painel/mapa-de-influencia",
    });
  }

  // 5) DADO — se falta histórico próprio
  const aDado = leitura.acoes.find((a) => a.titulo.toLowerCase().includes("carregar") || a.titulo.toLowerCase().includes("load"));
  if (aDado && passos.length < 5)
    passos.push({
      ordem: 4,
      eixo: "dado",
      titulo: aDado.titulo,
      detalhe: aDado.porque,
      ganho: null,
      alvos: [],
      href: aDado.href,
    });

  passos.sort((a, b) => a.ordem - b.ordem);
  passos.forEach((p, i) => (p.ordem = i + 1));

  // ---- placar ----
  const resToSit: Record<string, "eleito" | "disputa" | "fora"> = {
    vitoria: "eleito",
    disputa: "disputa",
    derrota: "fora",
  };
  const placar = cen
    ? {
        tipoDisputa: cen.tipoDisputa,
        votosBase: cen.votosBase,
        votosNecessarios: cen.votosNecessarios,
        faltam: cen.faltam,
        situacao: resToSit[cen.cenarios[0]?.resultado ?? "disputa"] ?? "disputa",
        cenarios: cen.cenarios.map((c) => ({ nome: c.nome, votos: c.votos, resultado: c.resultado })),
      }
    : null;

  const nome = perfil.nome;
  const alvo = cargoLabel ? (pt ? `${cargoLabel}` : cargoLabel) : "";
  const passosTitulos = passos.slice(0, 3).map((p) =>
    p.titulo.charAt(0).toLowerCase() + p.titulo.slice(1),
  );
  let frase: string;
  if (placar && placar.faltam > 0) {
    frase = pt
      ? `Para eleger ${nome}${alvo ? ` (${alvo})` : ""}, faltam ${num(placar.faltam, locale)} votos. O caminho mais curto: ${passosTitulos.join("; ")}.`
      : `To elect ${nome}${alvo ? ` (${alvo})` : ""}, ${num(placar.faltam, locale)} votes are missing. The shortest path: ${passosTitulos.join("; ")}.`;
  } else if (placar) {
    frase = pt
      ? `${nome} está eleito no cenário base (folga de ${num(-placar.faltam, locale)} votos). Para blindar a vitória: ${passosTitulos.join("; ")}.`
      : `${nome} is elected in the base scenario (${num(-placar.faltam, locale)}-vote cushion). To lock in the win: ${passosTitulos.join("; ")}.`;
  } else {
    frase = pt
      ? `O plano do Motor para eleger ${nome}: ${passosTitulos.join("; ")}.`
      : `The Engine's plan to elect ${nome}: ${passosTitulos.join("; ")}.`;
  }

  return {
    version: PLANO_VERSION,
    objetivo,
    cargoLabel,
    candidato: nome,
    placar,
    passos,
    frase,
    fontes: [...fontes],
  };
}
