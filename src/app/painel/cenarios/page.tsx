import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { Info } from "@/components/app/Info";
import { ModuloRoadmap } from "@/components/app/ModuloRoadmap";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getIfetResumoUF } from "@/lib/territory";
import { ingestVotacao, getVotosByIbge } from "@/lib/data-sources/eleitoral";
import { getVotacaoPartidoUF, getVotosCorteEleito } from "@/lib/data-sources/regional";
import { computeCenarios, type ResultadoCenario } from "@/lib/intel/cenarios";
import type { Cargo } from "@/lib/cargos";

export const metadata: Metadata = { title: "Cenários Estatísticos" };

const REF: Record<Cargo, { ano: number; turno: number; cargo: string; prop: boolean }> = {
  presidente: { ano: 2022, turno: 1, cargo: "presidente", prop: false },
  governador: { ano: 2022, turno: 1, cargo: "governador", prop: false },
  senador: { ano: 2022, turno: 1, cargo: "senador", prop: false },
  "deputado-federal": { ano: 2022, turno: 1, cargo: "deputado federal", prop: true },
  "deputado-estadual": { ano: 2022, turno: 1, cargo: "deputado estadual", prop: true },
  "deputado-distrital": { ano: 2022, turno: 1, cargo: "deputado distrital", prop: true },
  prefeito: { ano: 2024, turno: 1, cargo: "prefeito", prop: false },
  vereador: { ano: 2024, turno: 1, cargo: "vereador", prop: true },
};

function fmt(n: number, locale: string) {
  return Math.round(n).toLocaleString(locale);
}

const RES_COR: Record<ResultadoCenario, string> = {
  vitoria: "#4b5b0a",
  disputa: "#c9772f",
  derrota: "#8a3b2f",
};

export default async function Page() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;
  const cargo = (candidacy?.cargo as Cargo | null) ?? perfil?.cargo ?? null;

  const howItWorks = pt
    ? [
        "Parte da sua votação real por município (ou do seu partido, se não houver histórico).",
        "Define a barra: maioria dos válidos (majoritária) ou voto do último eleito (proporcional).",
        "Aplica premissas explícitas de maré, comparecimento e conversão de lacunas de IFET.",
        "Devolve a faixa de resultado de cada cenário e o que mais move o ponteiro.",
      ]
    : [
        "Starts from your real vote by municipality (or your party's, if no history).",
        "Sets the bar: majority of valid votes (majority race) or the last-elected's vote (proportional).",
        "Applies explicit assumptions of mood, turnout and IFET-gap conversion.",
        "Returns each scenario's result range and what moves the needle most.",
      ];
  const outputs = pt
    ? ["Faixa de votos por cenário (base / favorável / adverso).", "Quantos votos faltam para eleger.", "Municípios que mais encurtam o caminho.", "Sensibilidade a cada premissa."]
    : ["Vote range per scenario (base / favourable / adverse).", "How many votes are missing to get elected.", "Municipalities that shorten the path most.", "Sensitivity to each assumption."];

  if (!candidacy || !perfil || !perfil.uf || !cargo) {
    return (
      <ToolShell id="cenarios" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <div className="card">
          <p className="text-body-sm text-fossil">{t.cenarios.needCandidate}</p>
          <Link href="/onboarding" className="btn btn-primary mt-4">
            {t.maps.goOnboarding} <ArrowRight size={16} />
          </Link>
        </div>
      </ToolShell>
    );
  }

  const ref = REF[cargo];
  const [resumo, votacao, corte] = await Promise.all([
    getIfetResumoUF(perfil.uf, candidacy.id),
    getVotacaoPartidoUF(ref.ano, ref.turno, perfil.uf, ref.cargo),
    ref.prop ? getVotosCorteEleito(ref.ano, ref.turno, perfil.uf, ref.cargo) : Promise.resolve(null),
  ]);

  // Numa disputa proporcional, projetar a partir do total do PARTIDO não faz
  // sentido (o partido tem vários candidatos). Tenta carregar a votação própria
  // histórica do candidato antes de desistir.
  let votosProprios = resumo?.eleitoralByCode ?? null;
  if (resumo && ref.prop && !votosProprios) {
    try {
      await ingestVotacao(candidacy.id);
      const v = await getVotosByIbge(candidacy.id);
      if (v && Object.keys(v.byCode).length > 0) votosProprios = v.byCode;
    } catch {
      /* segue sem histórico próprio */
    }
  }

  if (!resumo || votacao.length < 100 || (ref.prop && !votosProprios)) {
    return (
      <ToolShell id="cenarios" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <ModuloRoadmap
          pergunta={pt ? "Quanto falta para você ganhar?" : "How much is missing to win?"}
          entrega={
            ref.prop && !votosProprios
              ? pt
                ? "Numa disputa proporcional, os cenários precisam do histórico de votação do próprio candidato — e ele ainda não foi encontrado. Rode o onboarding pelo espelho do TSE ('todos os cargos') para carregar."
                : "In a proportional race the scenarios need the candidate's own vote history — not found yet. Run the onboarding through the TSE mirror ('all offices') to load it."
              : pt
                ? "Não foi possível carregar a votação de referência para este estado/cargo agora."
                : "Couldn't load the reference vote for this state/office right now."
          }
          etapas={[
            { label: pt ? "Votação por partido e município (Base dos Dados)" : "Party vote by municipality (Base dos Dados)", feito: votacao.length >= 100 },
            { label: "IFET", feito: !!resumo },
            { label: pt ? "Histórico de votação do candidato" : "Candidate's own vote history", feito: !!votosProprios || !ref.prop },
          ]}
        />
      </ToolShell>
    );
  }

  const cen = computeCenarios(
    {
      cargo,
      partido: perfil.partido,
      votosCandidatoByCode: votosProprios,
      votacaoPartido: votacao,
      ifetByCode: resumo.ifet.byCode,
      populacaoByCode: resumo.populacaoByCode,
      nomeByCode: resumo.nomeByCode,
      corteEleito: corte,
    },
    {
      base: t.cenarios.scenarioBase,
      favoravel: t.cenarios.scenarioFav,
      adverso: t.cenarios.scenarioAdv,
      premissaBase: t.cenarios.premissaBase,
      premissaMareBoa: t.cenarios.premissaMareBoa,
      premissaLacunas: t.cenarios.premissaLacunas,
      premissaCompBaixo: t.cenarios.premissaCompBaixo,
      premissaMareRuim: t.cenarios.premissaMareRuim,
      premissaAdvConsolida: t.cenarios.premissaAdvConsolida,
      fatorMare: t.cenarios.fatorMare,
      fatorComparecimento: t.cenarios.fatorComparecimento,
      fatorLacunas: t.cenarios.fatorLacunas,
    },
  );

  const resLabel: Record<ResultadoCenario, string> = {
    vitoria: t.cenarios.resVitoria,
    disputa: t.cenarios.resDisputa,
    derrota: t.cenarios.resDerrota,
  };

  const falta = cen.faltam;
  const topFator = cen.sensibilidade[0]?.fator ?? "";
  const alvos3 = cen.municipiosAlvo.slice(0, 3).map((m) => m.nome).join(", ");
  const conclusao = pt
    ? `${falta > 0 ? `Faltam ${fmt(falta, locale)} votos` : `Folga de ${fmt(-falta, locale)} votos`} para ${perfil.nome} eleger no cenário base (${fmt(cen.votosBase, locale)} de ${fmt(cen.votosNecessarios, locale)}). O que mais move o ponteiro: ${topFator}${alvos3 ? ` — comece por ${alvos3}` : ""}.`
    : `${falta > 0 ? `${fmt(falta, locale)} votes missing` : `A ${fmt(-falta, locale)}-vote cushion`} for ${perfil.nome} to get elected in the base scenario (${fmt(cen.votosBase, locale)} of ${fmt(cen.votosNecessarios, locale)}). Biggest lever: ${topFator}${alvos3 ? ` — start with ${alvos3}` : ""}.`;

  const maxSens = Math.max(...cen.sensibilidade.map((s) => s.impacto), 1);

  return (
    <ToolShell
      id="cenarios"
      realData
      conclusao={conclusao}
      updatedAt={cen.version}
      howItWorks={howItWorks}
      outputs={outputs}
    >
      <h2 className="t-heading flex items-center text-[22px]">
        {t.tools.scenarios.name} <span className="mark ml-1 text-caption">{t.cenarios.tag}</span>
        <Info label={t.cenarios.tag}>{t.cenarios.disclaimer}</Info>
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-fossil">
        {t.cenarios.intro.replace("{nome}", perfil.nome)}
      </p>
      <p className="font-ui mt-2 text-caption text-pebble">
        {cen.tipoDisputa === "majoritaria" ? t.cenarios.disputaMajoritaria : t.cenarios.disputaProporcional}{" "}
        {cen.baseProjecao === "votacao-propria" ? t.cenarios.basePropria : t.cenarios.basePartido}
      </p>

      {/* barra + faltam */}
      <div className="card mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-ui text-caption text-pebble">
            {t.cenarios.projetadoBase}: <span className="text-ink">{fmt(cen.votosBase, locale)}</span>{" "}
            · {t.cenarios.necessarios}: <span className="text-ink">{fmt(cen.votosNecessarios, locale)}</span>
          </p>
          <p
            className="font-ui text-body font-medium"
            style={{ color: falta > 0 ? "#c9772f" : "#4b5b0a" }}
          >
            {falta > 0 ? t.cenarios.faltam : t.cenarios.folga}: {fmt(Math.abs(falta), locale)} {t.cenarios.votos}
          </p>
        </div>
        <div className="relative mt-3 h-3 rounded-[3px] bg-sand">
          <div
            className="h-full rounded-[3px] bg-olive"
            style={{ width: `${Math.min(100, (cen.votosBase / cen.votosNecessarios) * 100)}%` }}
          />
          <div className="absolute inset-y-[-3px] w-px bg-ink" style={{ left: "100%" }} />
        </div>
      </div>

      {/* cenários */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {cen.cenarios.map((c) => (
          <div key={c.chave} className="card flex flex-col">
            <div className="flex items-center justify-between">
              <p className="t-eyebrow">{c.nome}</p>
              <span
                className="font-ui rounded-[3px] px-1.5 py-0.5 text-[11px] text-paper"
                style={{ background: RES_COR[c.resultado] }}
              >
                {resLabel[c.resultado]}
              </span>
            </div>
            <p className="font-ui mt-3 text-[26px] font-light leading-none text-ink">
              {fmt(c.votos, locale)}
            </p>
            <p className="font-ui mt-1 text-caption text-pebble">
              {fmt(c.faixa[0], locale)} – {fmt(c.faixa[1], locale)} {t.cenarios.votos}
            </p>
            <ul className="font-ui mt-3 flex-1 space-y-1 text-caption text-fossil">
              {c.premissas.map((p) => (
                <li key={p}>— {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* sensibilidade */}
      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.cenarios.sensTitle}</h3>
        <div className="mt-3 space-y-2">
          {cen.sensibilidade.map((s) => (
            <div key={s.fator} className="font-ui flex items-center gap-3 text-body-sm">
              <span className="w-52 shrink-0 text-smoke">{s.fator}</span>
              <span className="h-2 flex-1 rounded-[2px] bg-sand">
                <span
                  className="block h-full rounded-[2px] bg-olive"
                  style={{ width: `${Math.round((s.impacto / maxSens) * 100)}%` }}
                />
              </span>
              <span className="w-24 shrink-0 text-right text-fossil">
                ±{fmt(s.impacto, locale)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* municípios-alvo */}
      {cen.municipiosAlvo.length > 0 && (
        <div className="card mt-6">
          <h3 className="t-heading text-[20px]">{t.cenarios.targetTitle}</h3>
          <p className="font-ui mt-1 text-caption text-pebble">{t.cenarios.targetSub}</p>
          <ol className="font-ui mt-3 divide-y divide-ash text-body-sm">
            {cen.municipiosAlvo.map((m, i) => (
              <li key={m.code} className="flex items-center gap-3 py-2">
                <span className="w-5 shrink-0 text-pebble">{i + 1}</span>
                <span className="flex-1 truncate text-smoke">{m.nome}</span>
                <span className="w-16 shrink-0 text-right text-pebble">IFET {m.ifet}</span>
                <span className="w-28 shrink-0 text-right text-fossil">
                  +{fmt(m.ganhoPotencial, locale)} {t.cenarios.potentialGain}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.cenarios.fichaTitle}</h3>
        <dl className="font-ui mt-3 grid gap-x-8 gap-y-3 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-pebble">{t.cenarios.version}</dt>
            <dd className="text-smoke">{cen.version}</dd>
          </div>
          <div>
            <dt className="text-pebble">{t.cenarios.sources}</dt>
            <dd className="text-smoke">{cen.fontes.join(" · ")}</dd>
          </div>
        </dl>
        <p className="font-ui mt-4 border-t border-ash pt-3 text-caption text-pebble">
          {t.cenarios.disclaimer}
        </p>
      </div>
    </ToolShell>
  );
}
