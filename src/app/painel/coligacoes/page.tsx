import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ToolShell } from "@/components/app/ToolShell";
import { Info } from "@/components/app/Info";
import { ModuloRoadmap } from "@/components/app/ModuloRoadmap";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getVotacaoPartidoUF, getVotacaoPartidoNacional } from "@/lib/data-sources/regional";
import { getBancadaCamara } from "@/lib/data-sources/camara";
import { getEstadoPorSigla } from "@/lib/data-sources/ibge";
import { escopoNacional, PLEITO_NACIONAL } from "@/lib/escopo";
import type { Cargo } from "@/lib/cargos";
import { computeColigacoes, COLIGACOES_PLEITO, type Afinidade } from "@/lib/intel/coligacoes";

export const metadata: Metadata = { title: "Coligações" };

function fill(t: string, v: Record<string, string | number>) {
  return Object.entries(v).reduce((s, [k, val]) => s.replaceAll(`{${k}}`, String(val)), t);
}

export default async function Page() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  const howItWorks = pt
    ? [
        "Puxa a votação por partido e município no último pleito proporcional (Base dos Dados).",
        "Mede a sobreposição de base: quanto cada partido disputa os mesmos eleitores que você.",
        "Estima o voto novo de cada aliança descontando a redundância.",
        "Cruza com a bancada federal (proxy de fundo partidário e tempo de TV) e a afinidade ideológica.",
      ]
    : [
        "Pulls party vote by municipality in the last proportional election (Base dos Dados).",
        "Measures base overlap: how much each party competes for the same voters as you.",
        "Estimates each alliance's new votes by discounting redundancy.",
        "Crosses with the federal bench (proxy for party fund and broadcast time) and ideological affinity.",
      ];
  const outputs = pt
    ? ["Voto novo estimado por partido adicionado.", "Sobreposição de base com cada parceiro.", "Bancada e afinidade de cada composição."]
    : ["Estimated new votes per added party.", "Base overlap with each partner.", "Bench and affinity of each composition."];

  const cargo = (candidacy?.cargo as Cargo | null) ?? perfil?.cargo ?? null;
  const nacional = escopoNacional(cargo);

  if (!candidacy || !perfil || !perfil.partido || (!perfil.uf && !nacional)) {
    return (
      <ToolShell id="coligacoes" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <div className="card">
          <p className="text-body-sm text-fossil">{t.maps.needCandidate}</p>
          <Link href="/onboarding" className="btn btn-primary mt-4">
            {t.maps.goOnboarding} <ArrowRight size={16} />
          </Link>
        </div>
      </ToolShell>
    );
  }

  const [votacao, bancada, estado] = await Promise.all([
    nacional
      ? getVotacaoPartidoNacional(PLEITO_NACIONAL.ano, PLEITO_NACIONAL.turno, PLEITO_NACIONAL.cargo)
      : getVotacaoPartidoUF(COLIGACOES_PLEITO.ano, COLIGACOES_PLEITO.turno, perfil.uf!, COLIGACOES_PLEITO.cargo),
    getBancadaCamara(),
    nacional ? Promise.resolve(null) : getEstadoPorSigla(perfil.uf!),
  ]);

  if (votacao.length < 100) {
    return (
      <ToolShell id="coligacoes" updatedAt="—" howItWorks={howItWorks} outputs={outputs}>
        <ModuloRoadmap
          pergunta={pt ? "Que aliança te elege?" : "Which alliance elects you?"}
          entrega={t.coligacoes.empty}
          etapas={[
            { label: pt ? "Votação por partido e município (Base dos Dados)" : "Vote by party and municipality (Base dos Dados)", feito: true },
            { label: pt ? "Bancada da Câmara" : "Chamber bench", feito: true },
            { label: pt ? "Dados carregados para este estado" : "Data loaded for this state", feito: false },
          ]}
        />
      </ToolShell>
    );
  }

  const res = computeColigacoes(votacao, perfil.partido, bancada);
  const ufNome = nacional ? "Brasil" : (estado?.nome ?? perfil.uf);
  const pleito = nacional
    ? pt
      ? "presidente 2022 · 1º turno"
      : "president 2022 · 1st round"
    : pt
      ? "deputado federal 2022"
      : "federal deputy 2022";

  const afimLabel: Record<Afinidade, string> = {
    afim: t.coligacoes.afim,
    neutro: t.coligacoes.neutro,
    tensao: t.coligacoes.tensao,
  };

  const melhorAfim = res.parceiros.find((p) => p.afinidade === "afim");
  const maiorVoto = res.parceiros[0];
  const maiorVotoNota =
    maiorVoto?.afinidade === "tensao"
      ? t.coligacoes.conclusaoTensao
      : maiorVoto && maiorVoto.sobreposicao >= 0.6
        ? t.coligacoes.conclusaoOverlap
        : t.coligacoes.conclusaoTensao;

  const conclusao = melhorAfim
    ? fill(t.coligacoes.conclusao, {
        melhorAfim: `${melhorAfim.sigla} (+${melhorAfim.ganhoLiquido.toLocaleString(locale)} ${pt ? "votos novos" : "new votes"})`,
        maiorVoto: maiorVoto.sigla,
        maiorVotoNota,
      })
    : pt
      ? `Nenhum partido de afinidade clara com ${res.partidoBase} tem base relevante em ${ufNome}. Considere federação em vez de coligação.`
      : `No clearly aligned party has a relevant base in ${ufNome}. Consider a federation instead of a coalition.`;

  const maxLiq = Math.max(...res.parceiros.map((p) => p.ganhoLiquido), 1);

  return (
    <ToolShell
      id="coligacoes"
      realData
      conclusao={conclusao}
      conclusaoTexto={conclusao}
      updatedAt={res.version}
      howItWorks={howItWorks}
      outputs={outputs}
    >
      <h2 className="t-heading flex items-center text-[22px]">
        {t.tools.coalitions.name} <span className="mark ml-1 text-caption">{t.coligacoes.tag}</span>
        <Info label={t.coligacoes.tag}>{t.coligacoes.note}</Info>
      </h2>
      <p className="mt-2 max-w-2xl text-body-sm text-fossil">
        {fill(t.coligacoes.intro, { nome: perfil.nome, partido: res.partidoBase, uf: ufNome, pleito })}
      </p>
      <p className="font-ui mt-3 inline-block rounded-[4px] bg-sand px-2 py-1 text-caption text-smoke">
        {fill(t.coligacoes.base, { partido: res.partidoBase })}: {res.baseVotos.toLocaleString(locale)}{" "}
        {fill(t.coligacoes.baseVotes, { uf: ufNome, pleito })}
      </p>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-body-sm">
          <thead>
            <tr className="font-ui text-caption uppercase tracking-wider text-pebble">
              <th className="pb-2 pr-3 font-normal">{t.coligacoes.colParty}</th>
              <th className="pb-2 pr-3 font-normal">{t.coligacoes.colField}</th>
              <th className="pb-2 pr-3 text-right font-normal">{t.coligacoes.colNet}</th>
              <th className="pb-2 pr-3 font-normal">
                <span className="inline-flex items-center">
                  {t.coligacoes.colOverlap}
                  <Info label={t.coligacoes.colOverlap}>{t.coligacoes.note}</Info>
                </span>
              </th>
              <th className="pb-2 text-right font-normal">{t.coligacoes.colBench}</th>
            </tr>
          </thead>
          <tbody className="font-ui divide-y divide-ash">
            {res.parceiros.slice(0, 14).map((p) => (
              <tr key={p.sigla}>
                <td className="py-2.5 pr-3 text-ink">{p.sigla}</td>
                <td className="py-2.5 pr-3">
                  <span
                    className={
                      "rounded-[3px] px-1.5 py-0.5 text-[11px] " +
                      (p.afinidade === "afim"
                        ? "bg-olive/20 text-smoke"
                        : p.afinidade === "tensao"
                          ? "bg-[#c9772f]/20 text-smoke"
                          : "bg-sand text-smoke")
                    }
                  >
                    {afimLabel[p.afinidade]}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className="h-1.5 w-16 rounded-[2px] bg-sand">
                      <span
                        className="block h-full rounded-[2px] bg-olive"
                        style={{ width: `${Math.round((p.ganhoLiquido / maxLiq) * 100)}%` }}
                      />
                    </span>
                    <span className="w-20 text-right text-smoke">
                      {p.ganhoLiquido.toLocaleString(locale)}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-fossil">{Math.round(p.sobreposicao * 100)}%</td>
                <td className="py-2.5 text-right text-fossil">{p.bancada || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.coligacoes.fichaTitle}</h3>
        <dl className="font-ui mt-3 grid gap-x-8 gap-y-3 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-pebble">{t.coligacoes.version}</dt>
            <dd className="text-smoke">{res.version}</dd>
          </div>
          <div>
            <dt className="text-pebble">{t.coligacoes.sources}</dt>
            <dd className="text-smoke">{res.fontes.join(" · ")}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-pebble">{t.coligacoes.pending}</dt>
          </div>
        </dl>
      </div>
    </ToolShell>
  );
}
