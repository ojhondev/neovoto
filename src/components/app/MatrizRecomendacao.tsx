"use client";

import { recomendaMunicipio, type MunicipioMatriz } from "@/lib/intel/matriz";
import { ClipButton } from "@/components/app/ClipButton";

/**
 * Painel conclusivo da Matriz: traduz a posição (eco/soc/distância) de um
 * município ou UF em "o que fazer ali", em linguagem de campanha. Usado tanto
 * na Dispersão quanto no Treemap.
 */
export function MatrizRecomendacao({
  m,
  candidato,
  locale,
  distanceLabel,
}: {
  m: MunicipioMatriz;
  candidato: { eco: number; soc: number; conhecido?: boolean };
  locale: string;
  distanceLabel: string;
}) {
  const loc = locale === "pt" ? "pt" : "en";
  const pt = loc === "pt";
  const rec = recomendaMunicipio(
    m,
    { eco: candidato.eco, soc: candidato.soc, conhecido: candidato.conhecido ?? true },
    loc,
  );

  return (
    <div className="mt-4 rounded-[var(--radius-card)] border-l-2 border-olive bg-paper p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="t-eyebrow mb-0.5">{pt ? "O que fazer em" : "What to do in"} {m.nome}</p>
          <p className="font-ui text-body-sm font-medium text-ink">
            {pt ? "Eleitorado" : "Electorate"}: {rec.classe}
          </p>
        </div>
        <ClipButton
          item={{
            modulo: pt ? "Matriz Ideológica" : "Ideological Matrix",
            titulo: `${pt ? "Agenda para" : "Agenda for"} ${m.nome}`,
            texto: rec.texto,
          }}
        />
      </div>

      <dl className="mt-3 space-y-2.5 text-body-sm">
        <div>
          <dt className="font-ui text-caption uppercase tracking-wider text-pebble">
            {pt ? "Agenda que rende aqui" : "Agenda that pays off here"}
          </dt>
          <dd className="text-ink">{rec.agenda}</dd>
        </div>
        {rec.tom && (
          <div>
            <dt className="font-ui text-caption uppercase tracking-wider text-pebble">
              {pt ? "Costumes" : "Social values"}
            </dt>
            <dd className="text-ink">{rec.tom}</dd>
          </div>
        )}
        <div>
          <dt className="font-ui text-caption uppercase tracking-wider text-pebble">
            {pt ? "Ressonância" : "Resonance"}
          </dt>
          <dd className="text-ink">{rec.ressonancia}</dd>
        </div>
      </dl>

      <p className="font-ui mt-3 border-t border-ash pt-2 text-caption text-pebble">
        {pt ? "posição" : "position"}: eco {m.eco} · soc {m.soc} · {distanceLabel} {m.distancia} ·{" "}
        {m.populacao.toLocaleString(locale)} {pt ? "hab." : "inhab."}
        {m.escolaridade != null && ` · ${pt ? "escolaridade" : "education"} ${m.escolaridade}`}
        {m.frac60 != null && ` · ${Math.round(m.frac60 * 100)}% 60+`}
      </p>
    </div>
  );
}
