"use client";

import { useState } from "react";
import { TerritoryMap, type TerritoryMapHandle } from "@/components/viz/TerritoryMap";
import type { IfetMunicipio, Quadrante } from "@/lib/intel/ifet";

type QuadInfo = Record<Quadrante, { label: string; acao: string }>;

type Dict = {
  layerLabel: string;
  score: string;
  layerIfet: string;
  layerVotos: string;
  votosField: string;
  votosTotal: string;
  votosNone: string;
  pillars: string;
  pesoEleitoral: string;
  perfilEconomico: string;
  disputabilidade: string;
  pesoEleitoralHint: string;
  perfilEconomicoHint: string;
  disputabilidadeHint: string;
  quadrantsTitle: string;
  ranking: string;
  clickHint: string;
  selected: string;
  pibPerCapita: string;
  interact: string;
};

const QUAD_ORDER: Quadrante[] = [
  "prioridade-maxima",
  "consolidar",
  "oportunidade-dispersa",
  "baixa-prioridade",
];

function Bar({ label, hint, v }: { label: string; hint: string; v: number }) {
  return (
    <div>
      <div className="font-ui mb-1 flex items-baseline justify-between text-caption">
        <span className="text-smoke">{label}</span>
        <span className="text-fossil">{Math.round(v * 100)}</span>
      </div>
      <div className="h-2 rounded-[2px] bg-sand">
        <div className="h-full rounded-[2px] bg-olive" style={{ width: `${v * 100}%` }} />
      </div>
      <p className="font-ui mt-1 text-[11px] text-pebble">{hint}</p>
    </div>
  );
}

export function HeatmapExplorer({
  geojson,
  nameByCode,
  ifet,
  votos,
  quad,
  dict,
  ufNome,
  locale,
}: {
  geojson: React.ComponentProps<typeof TerritoryMap>["geojson"];
  nameByCode: Record<string, string>;
  ifet: { municipios: IfetMunicipio[]; byCode: Record<string, number> };
  votos: { byCode: Record<string, number>; ano: number; total: number } | null;
  quad: QuadInfo;
  dict: Dict;
  ufNome: string;
  locale: string;
}) {
  const [sel, setSel] = useState<IfetMunicipio | null>(ifet.municipios[0] ?? null);
  const [layer, setLayer] = useState<"ifet" | "votos">("ifet");

  const pick = (code: string) => {
    const m = ifet.municipios.find((x) => x.code === code);
    if (m) setSel(m);
  };

  const counts = QUAD_ORDER.map((q) => ({
    q,
    n: ifet.municipios.filter((m) => m.quadrante === q).length,
  }));

  const votosField = dict.votosField.replace("{ano}", String(votos?.ano ?? ""));
  const showVotos = layer === "votos" && votos;

  return (
    <>
      {votos && (
        <div className="font-ui mb-3 inline-flex rounded-[4px] border border-ash p-0.5 text-caption">
          {(["ifet", "votos"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setLayer(k)}
              className={
                "rounded-[3px] px-3 py-1 transition-colors " +
                (layer === k ? "bg-ink text-paper" : "text-fossil hover:text-ink")
              }
            >
              {k === "ifet" ? dict.layerIfet : dict.layerVotos}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <TerritoryMap
            key={layer}
            geojson={geojson}
            valueByCode={showVotos ? votos.byCode : ifet.byCode}
            nameByCode={nameByCode}
            metricLabel={showVotos ? votosField : dict.layerLabel}
            scale={showVotos ? "sequential" : "heat"}
            height={460}
            onSelect={(h: TerritoryMapHandle) => pick(h.code)}
            formatValue={(n) => (showVotos ? Math.round(n).toLocaleString(locale) : n.toFixed(0))}
          />
          <p className="font-ui mt-2 text-caption text-pebble">{dict.interact}</p>
          {showVotos && (
            <p className="font-ui mt-1 text-caption text-pebble">
              {dict.votosTotal}: {votos.total.toLocaleString(locale)}
            </p>
          )}
        </div>

        {sel && (
          <div className="card self-start">
            <p className="font-ui text-caption uppercase tracking-wider text-pebble">
              {dict.selected}
            </p>
            <p className="font-ui mt-1 text-body text-ink">{sel.nome}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-ui text-[36px] font-light leading-none text-ink">
                {sel.score.toFixed(0)}
              </span>
              <span className="font-ui text-caption text-fossil">{dict.score}</span>
            </div>
            <div
              className="font-ui mt-3 inline-block rounded-[4px] px-2 py-1 text-caption"
              style={{ background: "var(--color-sand)", color: "var(--color-smoke)" }}
            >
              {quad[sel.quadrante].label}
            </div>
            <p className="mt-2 text-body-sm text-fossil">{quad[sel.quadrante].acao}</p>

            <div className="mt-5 space-y-3">
              <p className="t-eyebrow">{dict.pillars}</p>
              <Bar label={dict.pesoEleitoral} hint={dict.pesoEleitoralHint} v={sel.pilares.pesoEleitoral} />
              <Bar label={dict.perfilEconomico} hint={dict.perfilEconomicoHint} v={sel.pilares.perfilEconomico} />
              <Bar label={dict.disputabilidade} hint={dict.disputabilidadeHint} v={sel.pilares.disputabilidade} />
            </div>

            <dl className="font-ui mt-4 space-y-1 border-t border-ash pt-3 text-caption">
              {votos && (
                <div className="flex justify-between">
                  <dt className="text-pebble">{votosField}</dt>
                  <dd className="text-smoke">
                    {(votos.byCode[sel.code] ?? 0).toLocaleString(locale)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-pebble">{dict.pibPerCapita}</dt>
                <dd className="text-smoke">R$ {sel.pibPerCapita.toLocaleString(locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-pebble">População</dt>
                <dd className="text-smoke">{sel.populacao.toLocaleString(locale)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Quadrantes */}
      <div className="mt-6">
        <p className="t-eyebrow mb-3">{dict.quadrantsTitle}</p>
        <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-ash bg-ash sm:grid-cols-2 lg:grid-cols-4">
          {counts.map(({ q, n }) => (
            <div key={q} className="bg-paper p-4">
              <p className="font-ui text-[24px] font-light text-ink">{n}</p>
              <p className="font-ui mt-1 text-body-sm text-ink">{quad[q].label}</p>
              <p className="font-ui mt-1 text-caption text-fossil">{quad[q].acao}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking */}
      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">
          {dict.ranking} — {ufNome}
        </h3>
        <p className="font-ui mt-1 text-caption text-pebble">{dict.clickHint}</p>
        <ol className="font-ui mt-3 divide-y divide-ash text-body-sm">
          {ifet.municipios.slice(0, 18).map((m, i) => (
            <li key={m.code}>
              <button
                type="button"
                onClick={() => setSel(m)}
                className={
                  "flex w-full items-center gap-3 py-2 text-left transition-colors hover:text-ink " +
                  (sel?.code === m.code ? "text-ink" : "text-smoke")
                }
              >
                <span className="w-5 shrink-0 text-pebble">{i + 1}</span>
                <span className="flex-1 truncate">{m.nome}</span>
                <span className="w-16 shrink-0 text-right text-fossil">
                  {quad[m.quadrante].label.split(" ")[0]}
                </span>
                <span className="w-10 shrink-0 text-right font-medium text-ink">
                  {m.score.toFixed(0)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
