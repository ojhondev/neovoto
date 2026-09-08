import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { Info } from "@/components/app/Info";
import { InfluenceGraph } from "@/components/app/InfluenceGraph";
import { ModuloRoadmap } from "@/components/app/ModuloRoadmap";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getIfetResumoUF, getIfetResumoNacional } from "@/lib/territory";
import { getVotacaoPartidoUF, getVotacaoPartidoNacional } from "@/lib/data-sources/regional";
import { getBancadaCamara } from "@/lib/data-sources/camara";
import { getEstadoPorSigla } from "@/lib/data-sources/ibge";
import { escopoNacional, PLEITO_NACIONAL } from "@/lib/escopo";
import type { Cargo } from "@/lib/cargos";
import { computeInfluencia, INFLUENCIA_PLEITO } from "@/lib/intel/influencia";

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
        "Puxa a votação por partido e município no último pleito proporcional (Base dos Dados).",
        "Dimensiona cada partido pelo voto e posiciona pelo eixo ideológico.",
        "Liga dois partidos quando disputam os mesmos eleitores nos mesmos municípios.",
        "Deriva os blocos aliado / adversário / neutro e a dependência territorial.",
      ]
    : [
        "Pulls party vote by municipality in the last proportional election (Base dos Dados).",
        "Sizes each party by vote and positions it by ideological axis.",
        "Links two parties when they compete for the same voters in the same municipalities.",
        "Derives the ally / opponent / neutral blocs and the territorial dependency.",
      ];
  const outputs = pt
    ? ["Rede de partidos por voto, ideologia e sobreposição de base.", "Peso do seu campo vs. o do adversário.", "Onde o adversário é frágil e de quem o seu voto depende."]
    : ["Party network by vote, ideology and base overlap.", "Weight of your field vs. the opponent's.", "Where the opponent is fragile and who your vote depends on."];

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

  const conclusao = pt
    ? `Seu campo soma ${Math.round(inf.aliado.share * 100)}% do voto de ${ufNome} (${inf.aliado.bancada} deputados); o campo adversário, ${Math.round(inf.adversario.share * 100)}%. ${inf.dependencias[0] ? `O seu voto em ${inf.dependencias[0].nome} depende do ${inf.dependencias[0].principal}. ` : ""}${inf.fragilidades[0] ? `O adversário está vulnerável em ${inf.fragilidades.slice(0, 3).map((f) => f.nome).join(", ")}.` : ""}`
    : `Your field holds ${Math.round(inf.aliado.share * 100)}% of ${ufNome}'s vote (${inf.aliado.bancada} deputies); the opponent field, ${Math.round(inf.adversario.share * 100)}%. ${inf.dependencias[0] ? `Your vote in ${inf.dependencias[0].nome} depends on ${inf.dependencias[0].principal}. ` : ""}${inf.fragilidades[0] ? `The opponent is vulnerable in ${inf.fragilidades.slice(0, 3).map((f) => f.nome).join(", ")}.` : ""}`;

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
      <h2 className="t-heading flex items-center text-[22px]">
        {t.tools.influenceMap.name} <span className="mark ml-1 text-caption">{t.influencia.tag}</span>
        <Info label={t.influencia.tag}>{t.tools.influenceMap.desc}</Info>
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-fossil">
        {fill(t.influencia.intro, { uf: ufNome, pleito })}
      </p>

      <div className="mt-4 rounded-[10px] border border-ash bg-paper p-4">
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
                <li key={m.nome} className="font-ui rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
                  {m.nome} · {Math.round(m.v * 100)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-6">
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
              <p className="font-ui mt-2 text-[26px] font-light leading-none text-ink">
                {Math.round(b.share * 100)}%
              </p>
              <p className="font-ui mt-1 text-caption text-pebble">
                {b.votos.toLocaleString(locale)} {t.influencia.blocVotes} · {b.bancada} {t.influencia.blocBench}
              </p>
              <p className="font-ui mt-2 flex flex-wrap gap-1">
                {b.partidos.slice(0, 8).map((p) => (
                  <span key={p} className="rounded-[3px] bg-sand px-1.5 py-0.5 text-[11px] text-smoke">
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

      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.influencia.fichaTitle}</h3>
        <dl className="font-ui mt-3 grid gap-x-8 gap-y-3 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-pebble">{t.influencia.version}</dt>
            <dd className="text-smoke">{inf.version}</dd>
          </div>
          <div>
            <dt className="text-pebble">{t.influencia.sources}</dt>
            <dd className="text-smoke">{inf.fontes.join(" · ")}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-pebble">{t.influencia.pending}</dt>
          </div>
        </dl>
      </div>
    </ToolShell>
  );
}
