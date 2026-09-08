import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getEstadoPorSigla } from "@/lib/data-sources/ibge";
import { getVotacaoPartidoUF } from "@/lib/data-sources/regional";
import { getBancadaCamara } from "@/lib/data-sources/camara";
import { analisarPartidos, PARTIDOS_PLEITO } from "@/lib/intel/partidos-analise";
import { PartidosViz } from "@/components/app/PartidosViz";
import { partidoColor } from "@/lib/viz/colors";

export const metadata: Metadata = { title: "Partidos" };

export default async function Page() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  if (!candidacy || !perfil || !perfil.uf) {
    return (
      <>
        <p className="t-eyebrow mb-2">{t.motor.name}</p>
        <h1 className="t-heading-lg">{t.partidos.title}</h1>
        <p className="mt-3 max-w-xl text-body text-fossil">{t.partidos.needCandidate}</p>
        <Link href="/onboarding" className="btn btn-primary mt-6">
          {t.dash.emptyCta} <ArrowRight size={16} />
        </Link>
      </>
    );
  }

  const [votacao, bancada, estado] = await Promise.all([
    getVotacaoPartidoUF(PARTIDOS_PLEITO.ano, PARTIDOS_PLEITO.turno, perfil.uf, PARTIDOS_PLEITO.cargo),
    getBancadaCamara(),
    getEstadoPorSigla(perfil.uf),
  ]);

  const ufNome = estado?.nome ?? perfil.uf;

  if (votacao.length < 100) {
    return (
      <>
        <p className="t-eyebrow mb-2">{t.motor.name}</p>
        <h1 className="t-heading-lg">{t.partidos.title}</h1>
        <p className="mt-3 max-w-xl text-body text-fossil">{t.partidos.empty}</p>
      </>
    );
  }

  const data = analisarPartidos(votacao, bancada);
  const pleito = pt ? "presidente 2022 · 1º turno" : "president 2022 · 1st round";
  const base = (perfil.partido || "").toUpperCase();
  const noBase = data.nos.find((x) => x.sigla === base);

  return (
    <>
      <p className="t-eyebrow mb-2">{t.motor.name}</p>
      <h1 className="t-heading-lg">{t.partidos.title}</h1>
      <p className="mt-3 max-w-2xl text-body text-fossil">
        {t.partidos.intro.replace("{uf}", ufNome).replace("{pleito}", pleito)}
      </p>

      {noBase && (noBase.maisAfim || noBase.maisOposto) && (
        <p className="mt-4 border-l-2 border-olive pl-4 text-body-sm text-ink">
          {pt
            ? `Em ${ufNome}, a base do ${base}${noBase.maisOposto ? ` se opõe frontalmente à do ${noBase.maisOposto.sigla} (${noBase.maisOposto.forca.toFixed(2)})` : ""}${noBase.maisAfim ? `${noBase.maisOposto ? " e" : ""} disputa o mesmo território do ${noBase.maisAfim.sigla} (${noBase.maisAfim.forca.toFixed(2)})` : ""}.`
            : `In ${ufNome}, ${base}'s base${noBase.maisOposto ? ` directly opposes ${noBase.maisOposto.sigla}'s (${noBase.maisOposto.forca.toFixed(2)})` : ""}${noBase.maisAfim ? `${noBase.maisOposto ? " and" : ""} shares territory with ${noBase.maisAfim.sigla} (${noBase.maisAfim.forca.toFixed(2)})` : ""}.`}
        </p>
      )}
      {!noBase && (
        <p className="mt-4 font-ui text-caption text-pebble">
          {pt
            ? `O ${base} não disputou a presidência (esteve em coligação). O gráfico mostra os partidos que lançaram candidato próprio; no presidencial as coligações concentram o voto nos polos.`
            : `${base} didn't run for president (it was in a coalition). The chart shows parties that ran their own candidate.`}
        </p>
      )}

      <section className="card mt-6">
        <PartidosViz
          data={data}
          labels={{
            corrTitle: t.partidos.corrTitle,
            corrHint: t.partidos.corrHint,
            scatterTitle: t.partidos.scatterTitle,
            ecoLeft: t.partidos.ecoLeft,
            ecoRight: t.partidos.ecoRight,
            socTop: t.partidos.socTop,
            socBottom: t.partidos.socBottom,
          }}
        />
      </section>

      <section className="card mt-6 overflow-x-auto">
        <h2 className="t-heading text-[20px]">{t.partidos.tableTitle}</h2>
        <table className="mt-4 w-full min-w-[620px] text-left text-body-sm">
          <thead>
            <tr className="font-ui text-caption uppercase tracking-wider text-pebble">
              <th className="pb-2 pr-3 font-normal">{t.partidos.colParty}</th>
              <th className="pb-2 pr-3 text-right font-normal">{t.partidos.colVotos}</th>
              <th className="pb-2 pr-3 text-right font-normal">{t.partidos.colShare}</th>
              <th className="pb-2 pr-3 text-right font-normal">{t.partidos.colBench}</th>
              <th className="pb-2 pr-3 font-normal">{t.partidos.colAfim}</th>
              <th className="pb-2 font-normal">{t.partidos.colOposto}</th>
            </tr>
          </thead>
          <tbody className="font-ui divide-y divide-ash">
            {data.nos.map((p) => (
              <tr key={p.sigla} className={p.sigla === base ? "bg-sand/40" : ""}>
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: partidoColor(p.sigla) }} />
                    <span className="text-ink">{p.sigla}</span>
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right text-smoke">{p.votos.toLocaleString(locale)}</td>
                <td className="py-2.5 pr-3 text-right text-fossil">{(p.share * 100).toFixed(1)}%</td>
                <td className="py-2.5 pr-3 text-right text-fossil">{p.bancada || "—"}</td>
                <td className="py-2.5 pr-3 text-smoke">
                  {p.maisAfim ? `${p.maisAfim.sigla} (${p.maisAfim.forca.toFixed(2)})` : "—"}
                </td>
                <td className="py-2.5 text-smoke">
                  {p.maisOposto ? `${p.maisOposto.sigla} (${p.maisOposto.forca.toFixed(2)})` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">{t.partidos.fichaTitle}</h3>
        <dl className="font-ui mt-3 grid gap-x-8 gap-y-3 text-body-sm sm:grid-cols-2">
          <div>
            <dt className="text-pebble">{t.partidos.version}</dt>
            <dd className="text-smoke">{data.version}</dd>
          </div>
          <div>
            <dt className="text-pebble">{t.partidos.sources}</dt>
            <dd className="text-smoke">{data.fontes.join(" · ")}</dd>
          </div>
        </dl>
      </div>

      <p className="font-ui mt-6 border-t border-ash pt-4 text-caption text-pebble">
        {t.partidos.disclaimer}
      </p>
    </>
  );
}
