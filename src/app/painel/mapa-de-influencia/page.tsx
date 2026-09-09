import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { Info } from "@/components/app/Info";
import { InfluenceGraph } from "@/components/app/InfluenceGraph";
import { RedePessoasGraph } from "@/components/app/RedePessoasGraph";
import { ModuloRoadmap } from "@/components/app/ModuloRoadmap";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getIfetResumoUF, getIfetResumoNacional } from "@/lib/territory";
import { getVotacaoPartidoUF, getVotacaoPartidoNacional, getRollCallCamara } from "@/lib/data-sources/regional";
import { getBancadaCamara } from "@/lib/data-sources/camara";
import { getEstadoPorSigla } from "@/lib/data-sources/ibge";
import { escopoNacional, PLEITO_NACIONAL } from "@/lib/escopo";
import type { Cargo } from "@/lib/cargos";
import { computeInfluencia, INFLUENCIA_PLEITO } from "@/lib/intel/influencia";
import { computeRedePessoas } from "@/lib/intel/rede-pessoas";
import { FichaMetodologica } from "@/components/app/FichaMetodologica";
import { FICHAS } from "@/lib/intel/fichas";

export const metadata: Metadata = { title: "Mapa de Influência" };

function fill(s: string, v: Record<string, string | number>) {
  return Object.entries(v).reduce((a, [k, val]) => a.replaceAll(`{${k}}`, String(val)), s);
}

export default async function Page() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  const howItWorks = pt
    ? [
        "Monta a rede de mandatos: cada deputado federal da UF, posicionado pelo ponto ideal das votações nominais recentes do plenário (Câmara).",
        "Liga dois deputados quando votam junto em ≥ 75% das votações; deriva quem é aliado sólido, aliado só por partido e o bloco adversário (e o quão coeso ele é).",
        "Como contexto, a rede de partidos no estado: voto no último pleito proporcional, eixo ideológico e sobreposição de base geográfica.",
        "Deriva os blocos aliado / adversário / neutro e a dependência territorial.",
      ]
    : [
        "Builds the mandate network: each federal deputy of the state, placed by their ideal point over recent nominal floor votes (Chamber).",
        "Links two deputies who vote together ≥ 75% of the time; derives solid allies, party-only allies and the opponent bloc (and how cohesive it is).",
        "As context, the party network in the state: vote in the last proportional election, ideological axis and geographic base overlap.",
        "Derives the ally / opponent / neutral blocs and the territorial dependency.",
      ];
  const outputs = pt
    ? ["Rede de mandatos da bancada federal por votação nominal conjunta.", "Aliados sólidos vs. aliados só de partido; coesão do bloco adversário.", "Rede de partidos no estado, peso do seu campo e fragilidades territoriais do adversário."]
    : ["Federal delegation network by joint nominal votes.", "Solid allies vs. party-only allies; opponent-bloc cohesion.", "Party network in the state, weight of your field and the opponent's territorial fragilities."];

  const cargo = (candidacy?.cargo as Cargo | null) ?? perfil?.cargo ?? null;
  const nacional = escopoNacional(cargo);

  if (!candidacy || !perfil || !perfil.partido || (!perfil.uf && !nacional)) {
    return (
      <ToolShell id="mapa-de-influencia" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <div className="card">
          <p className="text-body-sm text-fossil">{t.maps.needCandidate}</p>
          <Link href="/onboarding" className="btn btn-primary mt-4">
            {t.maps.goOnboarding} <ArrowRight size={16} />
          </Link>
        </div>
      </ToolShell>
    );
  }

  const [resumo, votacao, bancada, estado] = await Promise.all([
    nacional ? getIfetResumoNacional(candidacy.id) : getIfetResumoUF(perfil.uf!, candidacy.id),
    nacional
      ? getVotacaoPartidoNacional(PLEITO_NACIONAL.ano, PLEITO_NACIONAL.turno, PLEITO_NACIONAL.cargo)
      : getVotacaoPartidoUF(INFLUENCIA_PLEITO.ano, INFLUENCIA_PLEITO.turno, perfil.uf!, INFLUENCIA_PLEITO.cargo),
    getBancadaCamara(),
    nacional ? Promise.resolve(null) : getEstadoPorSigla(perfil.uf!),
  ]);

  if (votacao.length < 100 || !resumo) {
    return (
      <ToolShell id="mapa-de-influencia" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <ModuloRoadmap
          pergunta={pt ? "Quem move o voto no seu território?" : "Who moves the vote in your territory?"}
          entrega={pt ? "Não foi possível carregar a votação por partido para este estado agora." : "Couldn't load the party vote for this state right now."}
          etapas={[
            { label: pt ? "Votação por partido e município (Base dos Dados)" : "Party vote by municipality (Base dos Dados)", feito: votacao.length >= 100 },
            { label: pt ? "Bancada e escala ideológica" : "Bench and ideology scale", feito: true },
            { label: pt ? "Dados carregados para este estado" : "Data loaded for this state", feito: false },
          ]}
        />
      </ToolShell>
    );
  }

  const inf = computeInfluencia(votacao, perfil.partido, bancada, resumo.nomeByCode);
  const ufNome = nacional ? "Brasil" : (estado?.nome ?? perfil.uf);

  const rede = nacional
    ? null
    : await getRollCallCamara(6)
        .then((rc) => (rc.votacoes.length >= 8 ? computeRedePessoas(rc, perfil.uf!, perfil.partido) : null))
        .catch(() => null);

  const base = resumo.base;
  const alcanceContexto = base?.modo === "contexto";
  const topAlcance = base
    ? Object.entries(base.alcanceByCode)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([code, v]) => ({ nome: resumo.nomeByCode[code] ?? code, v }))
    : [];
  const pleito = nacional
    ? pt
      ? "presidente 2022 · 1º turno"
      : "president 2022 · 1st round"
    : pt
      ? "deputado federal 2022"
      : "federal deputy 2022";

  const redeTxt =
    rede && rede.aliadosSolidos.length > 0
      ? pt
        ? `Na bancada federal de ${ufNome}, seus aliados de voto mais firmes são ${rede.aliadosSolidos.slice(0, 3).map((n) => n.nome).join(", ")}${rede.aliadosPorCortesia[0] ? ` — mas ${rede.aliadosPorCortesia[0].nome} (${rede.aliadosPorCortesia[0].partido}) vota bem menos com o campo` : ""}. O bloco adversário tem ${Math.round(rede.coesaoAdversario * 100)}% de coesão. `
        : `In ${ufNome}'s federal delegation, your firmest voting allies are ${rede.aliadosSolidos.slice(0, 3).map((n) => n.nome).join(", ")}. The opponent bloc votes together ${Math.round(rede.coesaoAdversario * 100)}% of the time. `
      : "";
  const conclusao = pt
    ? `${redeTxt}Seu campo soma ${Math.round(inf.aliado.share * 100)}% do voto de ${ufNome} (${inf.aliado.bancada} deputados); o campo adversário, ${Math.round(inf.adversario.share * 100)}%. ${inf.fragilidades[0] ? `O adversário está vulnerável em ${inf.fragilidades.slice(0, 3).map((f) => f.nome).join(", ")}.` : ""}`
    : `${redeTxt}Your field holds ${Math.round(inf.aliado.share * 100)}% of ${ufNome}'s vote (${inf.aliado.bancada} deputies); the opponent field, ${Math.round(inf.adversario.share * 100)}%. ${inf.fragilidades[0] ? `The opponent is vulnerable in ${inf.fragilidades.slice(0, 3).map((f) => f.nome).join(", ")}.` : ""}`;

  const blocos = [
    { info: t.influencia.blocAlly, b: inf.aliado, cor: "var(--color-urg-low)" },
    { info: t.influencia.blocFoe, b: inf.adversario, cor: "var(--color-urg-crit)" },
    { info: t.influencia.blocNeutral, b: inf.neutro, cor: "var(--color-urg-none)" },
  ];

  return (
    <ToolShell
      id="mapa-de-influencia"
      realData
      conclusao={conclusao}
      conclusaoTexto={conclusao}
      updatedAt={inf.version}
      howItWorks={howItWorks}
      outputs={outputs}
    >
      <h2 className="t-heading flex items-center">
        {t.tools.influenceMap.name} <span className="mark ml-1 text-caption">{t.influencia.tag}</span>
        <Info label={t.influencia.tag}>{t.tools.influenceMap.desc}</Info>
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-fossil">
        {fill(t.influencia.intro, { uf: ufNome, pleito })}
      </p>

      <div className="mt-4 rounded-none border border-ash bg-paper p-4">
        <p className="t-eyebrow">
          {pt ? "Sua influência como candidato" : "Your reach as a candidate"}
        </p>
        {alcanceContexto || topAlcance.length === 0 ? (
          <p className="mt-1.5 max-w-2xl text-body-sm text-fossil">
            {pt
              ? `A rede abaixo é do seu partido e do seu campo em ${ufNome} — não a sua influência pessoal. Sem histórico de campanha, cidade-base ou apoios do candidato, a plataforma ainda não consegue desenhar o alcance dele. Informe a base no perfil da candidatura.`
              : `The network below is your party's and your field's in ${ufNome} — not your personal influence. Without the candidate's campaign history, home city or endorsements, the platform can't map their reach yet.`}
          </p>
        ) : (
          <>
            <p className="mt-1.5 max-w-2xl text-body-sm text-fossil">
              {pt
                ? `A rede abaixo é do seu partido em ${ufNome}. O seu alcance real como candidato${base?.ancora ? `, a partir da base em ${base.ancora.nome},` : ""} se concentra em:`
                : `The network below is your party's in ${ufNome}. Your real reach as a candidate${base?.ancora ? `, from the base in ${base.ancora.nome},` : ""} concentrates in:`}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {topAlcance.map((m) => (
                <li key={m.nome} className="font-ui rounded-none bg-sand px-2 py-1 text-caption text-smoke">
                  {m.nome} · {Math.round(m.v * 100)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {rede && rede.nos.length >= 3 && (
        <div className="card mt-6">
          <h3 className="t-heading flex items-center">
            {pt ? "Rede de mandatos — bancada federal de " : "Mandate network — federal delegation of "}
            {ufNome}
          </h3>
          <p className="font-ui mt-1 max-w-2xl text-caption text-pebble">
            {pt
              ? `Cada ponto é um deputado federal. Posição = ponto ideal das ${rede.nVotacoes} votações nominais mais recentes do plenário (quem vota parecido fica junto). Linha = concordância de voto ≥ 75%.`
              : `Each dot is a federal deputy. Position = ideal point over the ${rede.nVotacoes} most recent nominal floor votes. A line = vote agreement ≥ 75%.`}
          </p>
          <div className="mt-4">
            <RedePessoasGraph
              nos={rede.nos}
              arestas={rede.arestas}
              labels={{
                x: pt ? "ponto ideal (votação nominal)" : "ideal point (roll-call)",
                y: pt ? "vota com o seu campo" : "votes with your field",
                ally: t.influencia.ally,
                foe: t.influencia.foe,
                neutral: t.influencia.neutral,
              }}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              { t: pt ? "Aliados sólidos" : "Solid allies", s: pt ? "campo afim e votam junto" : "same field, vote together", l: rede.aliadosSolidos, c: "var(--color-urg-low)" },
              { t: pt ? "Aliados por cortesia" : "Nominal allies", s: pt ? "partido afim, voto independente" : "same field, independent vote", l: rede.aliadosPorCortesia, c: "var(--color-urg-med)" },
              { t: pt ? "Bloco adversário" : "Opponent bloc", s: pt ? `coesão ${Math.round(rede.coesaoAdversario * 100)}%` : `cohesion ${Math.round(rede.coesaoAdversario * 100)}%`, l: rede.adversarios, c: "var(--color-urg-crit)" },
            ].map((col) => (
              <div key={col.t}>
                <p className="t-eyebrow" style={{ color: col.c }}>{col.t}</p>
                <p className="font-ui text-[11px] text-pebble">{col.s}</p>
                <ul className="font-ui mt-2 divide-y divide-ash text-body-sm">
                  {col.l.map((n) => (
                    <li key={n.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="min-w-0 truncate text-smoke">
                        {n.nome} <span className="text-pebble">({n.partido})</span>
                      </span>
                      <span className="shrink-0 text-caption text-fossil">
                        {Math.round(n.concordanciaComCampo * 100)}%
                      </span>
                    </li>
                  ))}
                  {col.l.length === 0 && <li className="py-1.5 text-pebble">—</li>}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <p className="t-eyebrow mb-2">{pt ? "Contexto: o campo por partido no estado" : "Context: the field by party in the state"}</p>
        <InfluenceGraph
          nos={inf.nos}
          arestas={inf.arestas}
          base={inf.partidoBase}
          labels={{
            you: t.influencia.you,
            ally: t.influencia.ally,
            foe: t.influencia.foe,
            neutral: t.influencia.neutral,
            ideoLeft: t.influencia.ideoLeft,
            ideoRight: t.influencia.ideoRight,
          }}
          locale={locale}
        />
      </div>

      {/* blocos */}
      <div className="mt-6">
        <p className="t-eyebrow mb-3">{t.influencia.blocsTitle}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {blocos.map(({ info, b, cor }) => (
            <div key={info} className="card">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: cor }} />
                <p className="t-eyebrow">{info}</p>
              </div>
              <p className="font-ui mt-2 text-[26px] font-semibold leading-none text-ink">
                {Math.round(b.share * 100)}%
              </p>
              <p className="font-ui mt-1 text-caption text-pebble">
                {b.votos.toLocaleString(locale)} {t.influencia.blocVotes} · {b.bancada} {t.influencia.blocBench}
              </p>
              <p className="font-ui mt-2 flex flex-wrap gap-1">
                {b.partidos.slice(0, 8).map((p) => (
                  <span key={p} className="rounded-none bg-sand px-1.5 py-0.5 text-[11px] text-smoke">
                    {p}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* fragilidades + dependências */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="t-heading text-[18px]">{t.influencia.fragTitle}</h3>
          <p className="font-ui mt-1 text-caption text-pebble">{t.influencia.fragSub}</p>
          <ol className="font-ui mt-3 divide-y divide-ash text-body-sm">
            {inf.fragilidades.map((f) => (
              <li key={f.code} className="flex items-center justify-between py-2">
                <span className="text-smoke">{f.nome}</span>
                <span className="text-fossil">
                  {t.influencia.fragAdv} {Math.round(f.advShare * 100)}% · {t.influencia.fragYou}{" "}
                  {Math.round(f.seuShare * 100)}%
                </span>
              </li>
            ))}
            {inf.fragilidades.length === 0 && <li className="py-2 text-pebble">—</li>}
          </ol>
        </div>
        <div className="card">
          <h3 className="t-heading text-[18px]">{t.influencia.depTitle}</h3>
          <p className="font-ui mt-1 text-caption text-pebble">{t.influencia.depSub}</p>
          <ol className="font-ui mt-3 divide-y divide-ash text-body-sm">
            {inf.dependencias.map((d) => (
              <li key={d.code} className="flex items-center justify-between py-2">
                <span className="text-smoke">{d.nome}</span>
                <span className="text-fossil">
                  {d.principal} {t.influencia.depCarries} {Math.round(d.principalShare * 100)}%
                </span>
              </li>
            ))}
            {inf.dependencias.length === 0 && <li className="py-2 text-pebble">—</li>}
          </ol>
        </div>
      </div>

      <FichaMetodologica ficha={FICHAS.influencia(pt)} locale={locale} labels={t.ficha} />
    </ToolShell>
  );
}
