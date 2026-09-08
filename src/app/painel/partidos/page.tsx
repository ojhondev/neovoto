import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { FichaMetodologica } from "@/components/app/FichaMetodologica";
import { FICHAS } from "@/lib/intel/fichas";
import { getCurrentCandidacy, perfilFrom } from "@/lib/candidacy";
import { getEstadoPorSigla } from "@/lib/data-sources/ibge";
import { getVotacaoPartidoUF, getVotacaoPartidoNacional } from "@/lib/data-sources/regional";
import { getBancadaCamara } from "@/lib/data-sources/camara";
import { escopoNacional } from "@/lib/escopo";
import type { Cargo } from "@/lib/cargos";
import { analisarPartidos, PARTIDOS_PLEITO, type PartidosResultado } from "@/lib/intel/partidos-analise";
import { lrDoPartido } from "@/lib/intel/partidos";
import { PartidosViz } from "@/components/app/PartidosViz";
import { partidoColor } from "@/lib/viz/colors";

export const metadata: Metadata = { title: "Partidos" };

/** interpretação da matriz de correlação em linguagem direta */
function interpretar(data: PartidosResultado, base: string, pt: boolean): string[] {
  const out: string[] = [];
  // par mais anti-correlacionado
  let piorPar: { a: string; b: string; v: number } | null = null;
  const clusters = new Map<string, string[]>();
  for (let i = 0; i < data.ordem.length; i++) {
    for (let j = i + 1; j < data.ordem.length; j++) {
      const v = data.matriz[i][j];
      if (!piorPar || v < piorPar.v) piorPar = { a: data.ordem[i], b: data.ordem[j], v };
      if (v >= 0.5) {
        const k = data.ordem[i];
        clusters.set(k, [...(clusters.get(k) ?? []), data.ordem[j]]);
      }
    }
  }
  if (piorPar && piorPar.v <= -0.4) {
    out.push(
      pt
        ? `${piorPar.a} e ${piorPar.b} dividem o estado em dois blocos praticamente opostos (${piorPar.v.toFixed(2)} ± ${data.margem95.toFixed(2)}): onde um é forte, o outro é fraco. É o eixo real da disputa territorial.`
        : `${piorPar.a} and ${piorPar.b} split the state into two nearly opposite blocs (${piorPar.v.toFixed(2)} ± ${data.margem95.toFixed(2)}): where one is strong, the other is weak.`,
    );
  }
  const grande = [...clusters.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (grande && grande[1].length >= 2) {
    out.push(
      pt
        ? `${[grande[0], ...grande[1]].slice(0, 4).join(", ")} ocupam o mesmo espaço geográfico — provavelmente o voto de centro / anti-polarização. Disputam entre si os mesmos municípios.`
        : `${[grande[0], ...grande[1]].slice(0, 4).join(", ")} occupy the same geographic space — likely the centre / anti-polarisation vote.`,
    );
  }
  const nb = data.nos.find((n) => n.sigla === base);
  const lrBase = lrDoPartido(base);
  const ideo = (outra: string): string => {
    if (lrBase == null) return "";
    const lo = lrDoPartido(outra);
    if (lo == null) return "";
    const d = Math.abs(lrBase - lo);
    return pt
      ? d <= 0.25
        ? " — e no mesmo campo ideológico (Bolognesi 2022)"
        : d >= 0.7
          ? " — e no campo ideológico oposto (Bolognesi 2022)"
          : " — de campo ideológico intermediário (Bolognesi 2022)"
      : d <= 0.25
        ? " — same ideological field (Bolognesi 2022)"
        : d >= 0.7
          ? " — opposite ideological field (Bolognesi 2022)"
          : " — middle ideological field (Bolognesi 2022)";
  };
  if (nb) {
    if (nb.maisOposto) {
      out.push(
        pt
          ? `Para o ${base}: o adversário territorial direto é o ${nb.maisOposto.sigla} (sobreposição de base ${nb.maisOposto.forca.toFixed(2)})${ideo(nb.maisOposto.sigla)} — crescer significa tirar voto dele nos municípios onde ele domina.`
          : `For ${base}: the direct territorial rival is ${nb.maisOposto.sigla} (base overlap ${nb.maisOposto.forca.toFixed(2)})${ideo(nb.maisOposto.sigla)} — growing means taking votes from it where it dominates.`,
      );
    }
    if (nb.maisAfim) {
      out.push(
        pt
          ? `${nb.maisAfim.sigla} pesca no mesmo lago que o ${base} (sobreposição ${nb.maisAfim.forca.toFixed(2)})${ideo(nb.maisAfim.sigla)}: aliança soma pouco voto novo e muito palanque repetido — considere só se trouxer estrutura ou tempo de TV.`
          : `${nb.maisAfim.sigla} fishes the same pond as ${base} (overlap ${nb.maisAfim.forca.toFixed(2)})${ideo(nb.maisAfim.sigla)}: an alliance adds little new vote.`,
      );
    }
  }
  return out.length ? out : [pt ? "Correlações fracas — no presidencial o voto se concentra nos dois polos." : "Weak correlations — presidential vote concentrates on the two poles."];
}

export default async function Page() {
  const { locale, t } = await getDictionary();
  const pt = locale === "pt";
  const candidacy = await getCurrentCandidacy();
  const perfil = candidacy ? perfilFrom(candidacy) : null;

  const cargo = (candidacy?.cargo as Cargo | null) ?? perfil?.cargo ?? null;
  const nacional = escopoNacional(cargo);

  if (!candidacy || !perfil || (!perfil.uf && !nacional)) {
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
    nacional
      ? getVotacaoPartidoNacional(PARTIDOS_PLEITO.ano, PARTIDOS_PLEITO.turno, PARTIDOS_PLEITO.cargo)
      : getVotacaoPartidoUF(PARTIDOS_PLEITO.ano, PARTIDOS_PLEITO.turno, perfil.uf!, PARTIDOS_PLEITO.cargo),
    getBancadaCamara(),
    nacional ? Promise.resolve(null) : getEstadoPorSigla(perfil.uf!),
  ]);

  const ufNome = nacional ? "Brasil" : (estado?.nome ?? perfil.uf);

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

      {/* interpretação */}
      <div className="card mt-6 border-l-2 border-olive">
        <p className="t-eyebrow mb-2">{pt ? "O que a correlação diz" : "What the correlation says"}</p>
        <div className="space-y-2 text-body-sm text-smoke">
          {interpretar(data, base, pt).map((linha, i) => (
            <p key={i}>{linha}</p>
          ))}
        </div>
      </div>

      <FichaMetodologica ficha={FICHAS.partidos(pt)} locale={locale} labels={t.ficha} />

      <p className="font-ui mt-3 border-t border-ash pt-4 text-caption text-pebble">
        {t.partidos.disclaimer}
      </p>
    </>
  );
}
