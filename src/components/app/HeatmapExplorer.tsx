"use client";

import { useState } from "react";
import { TerritoryMap, type TerritoryMapHandle } from "@/components/viz/TerritoryMap";
import type { IfetMunicipio, Quadrante } from "@/lib/intel/ifet";
import type { BaseCandidato, Confianca } from "@/lib/intel/base-candidato";
import { URGENCIA_QUADRANTE, urgVar } from "@/lib/viz/colors";
import { Info } from "@/components/app/Info";

type QuadInfo = Record<Quadrante, { label: string; acao: string }>;

type Dict = {
  layerLabel: string;
  score: string;
  layerIfet: string;
  layerPeso: string;
  layerAlcance: string;
  layerVotos: string;
  votosField: string;
  votosTotal: string;
  pillars: string;
  pesoEleitoral: string;
  perfilEconomico: string;
  disputabilidade: string;
  desempenhoHistorico: string;
  pesoEleitoralHint: string;
  perfilEconomicoHint: string;
  disputabilidadeHint: string;
  desempenhoHistoricoHint: string;
  quadrantsTitle: string;
  quadExplain: Record<Quadrante, string>;
  contextoTitle: string;
  contextoBody: string;
  ancoraLabel: string;
  ancoraVia: Record<string, string>;
  camadasTitle: string;
  camadaPropria: string;
  camadaAncora: string;
  camadaRede: string;
  camadaApoios: string;
  confiancaLabel: string;
  semAlcance: string;
  ranking: string;
  clickHint: string;
  selected: string;
  pibPerCapita: string;
  interact: string;
};

const QUAD_ORDER: Quadrante[] = ["prioridade", "expansao", "reduto", "fora"];

const CONF_LABEL: Record<Confianca, { pt: string; en: string }> = {
  alta: { pt: "alta", en: "high" },
  media: { pt: "média", en: "medium" },
  baixa: { pt: "baixa", en: "low" },
  nenhuma: { pt: "sem sinal", en: "no signal" },
};

type Layer = "prioridade" | "peso" | "alcance" | "votos";

function Bar({ label, hint, v, color }: { label: string; hint: string; v: number; color: string }) {
  return (
    <div>
      <div className="font-ui mb-1 flex items-baseline justify-between text-caption">
        <span className="text-smoke">{label}</span>
        <span className="text-fossil">{Math.round(v * 100)}</span>
      </div>
      <div className="h-2 rounded-none bg-sand">
        <div className="h-full rounded-none" style={{ width: `${v * 100}%`, background: color }} />
      </div>
      <p className="font-ui mt-1 text-[11px] text-pebble">{hint}</p>
    </div>
  );
}

export function HeatmapExplorer({
  geojson,
  nameByCode,
  ifet,
  base,
  votos,
  quad,
  dict,
  ufNome,
  locale,
}: {
  geojson: React.ComponentProps<typeof TerritoryMap>["geojson"];
  nameByCode: Record<string, string>;
  ifet: {
    municipios: IfetMunicipio[];
    byCode: Record<string, number>;
    pesoByCode: Record<string, number>;
    alcanceByCode: Record<string, number>;
    modo: "candidato" | "contexto";
  };
  base: BaseCandidato | null;
  votos: { byCode: Record<string, number>; ano: number; total: number } | null;
  quad: QuadInfo;
  dict: Dict;
  ufNome: string;
  locale: string;
}) {
  const pt = locale === "pt";
  const contexto = ifet.modo === "contexto";
  const [sel, setSel] = useState<IfetMunicipio | null>(ifet.municipios[0] ?? null);
  const [layer, setLayer] = useState<Layer>(contexto ? "peso" : "prioridade");

  const pick = (code: string) => {
    const m = ifet.municipios.find((x) => x.code === code);
    if (m) setSel(m);
  };

  const counts = QUAD_ORDER.map((q) => ({
    q,
    n: ifet.municipios.filter((m) => m.quadrante === q).length,
  }));

  const layers: { k: Layer; label: string }[] = [
    ...(contexto ? [] : ([{ k: "prioridade", label: dict.layerIfet }] as const)),
    { k: "peso", label: dict.layerPeso },
    ...(contexto ? [] : ([{ k: "alcance", label: dict.layerAlcance }] as const)),
    ...(votos ? ([{ k: "votos", label: dict.layerVotos }] as const) : []),
  ];

  const votosField = dict.votosField.replace("{ano}", String(votos?.ano ?? ""));

  // valores + escala por camada. Só passa os códigos COM sinal → o resto do mapa fica vazado.
  const alcancePos: Record<string, number> = {};
  for (const [c, v] of Object.entries(ifet.alcanceByCode)) if (v > 0) alcancePos[c] = v;
  // prioridade: vaza os municípios "fora do alcance" — o mapa não pinta o estado inteiro
  const prioridadePos: Record<string, number> = {};
  for (const m of ifet.municipios) if (m.quadrante !== "fora") prioridadePos[m.code] = ifet.byCode[m.code];

  const mapConfig =
    layer === "votos" && votos
      ? { valueByCode: votos.byCode, scale: "votes" as const, metricLabel: votosField, fmt: (n: number) => Math.round(n).toLocaleString(locale) }
      : layer === "peso"
        ? { valueByCode: ifet.pesoByCode, scale: "heat" as const, metricLabel: dict.layerPeso, fmt: (n: number) => n.toFixed(0) }
        : layer === "alcance"
          ? { valueByCode: alcancePos, scale: "sequential" as const, metricLabel: dict.layerAlcance, fmt: (n: number) => n.toFixed(0) }
          : { valueByCode: contexto ? ifet.pesoByCode : prioridadePos, scale: "heat" as const, metricLabel: dict.layerIfet, fmt: (n: number) => n.toFixed(0) };

  const camadas = base?.camadas;
  const anc = base?.ancora ?? null;

  return (
    <>
      {contexto && (
        <div className="mb-4 rounded-none border-l-[3px] border-negative bg-sand p-4">
          <p className="font-ui text-body-sm font-semibold text-ink">{dict.contextoTitle}</p>
          <p className="mt-1.5 max-w-2xl text-body-sm text-fossil">{dict.contextoBody}</p>
        </div>
      )}

      {!contexto && (anc || camadas) && (
        <div className="mb-4 rounded-none border border-ash bg-paper p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="t-eyebrow">{dict.camadasTitle}</span>
            {anc && (
              <span className="font-ui text-caption text-fossil">
                {dict.ancoraLabel}: <span className="text-ink">{anc.nome}</span>
                {dict.ancoraVia[anc.via] ? ` (${dict.ancoraVia[anc.via]})` : ""}
              </span>
            )}
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {camadas?.propria && (
              <li className="font-ui rounded-none bg-sand px-2 py-1 text-caption text-smoke">
                {dict.camadaPropria}: {camadas.propria.cargo || "—"} {camadas.propria.ano} ·{" "}
                {camadas.propria.votos.toLocaleString(locale)} {pt ? "votos" : "votes"} ·{" "}
                {camadas.propria.municipios} {pt ? "mun." : "mun."}
              </li>
            )}
            {camadas?.ancora && (
              <li className="font-ui rounded-none bg-sand px-2 py-1 text-caption text-smoke">
                {dict.camadaAncora}: {camadas.ancora.regImediata} ({camadas.ancora.municipios})
              </li>
            )}
            {camadas?.redePartido && (
              <li className="font-ui rounded-none bg-sand px-2 py-1 text-caption text-smoke">
                {dict.camadaRede}: {camadas.redePartido.municipios} {pt ? "mun." : "mun."}
              </li>
            )}
            {camadas?.apoios && (
              <li className="font-ui rounded-none bg-sand px-2 py-1 text-caption text-smoke">
                {dict.camadaApoios}: {camadas.apoios.nomes.slice(0, 3).join(", ")}
              </li>
            )}
          </ul>
        </div>
      )}

      {layers.length > 1 && (
        <div className="font-ui mb-3 inline-flex flex-wrap rounded-none border border-ash p-0.5 text-caption">
          {layers.map(({ k, label }) => (
            <button
              key={k}
              type="button"
              onClick={() => setLayer(k)}
              className={
                "rounded-none px-3 py-1 transition-colors " +
                (layer === k ? "bg-ink text-paper" : "text-fossil hover:text-ink")
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <TerritoryMap
            key={layer}
            geojson={geojson}
            valueByCode={mapConfig.valueByCode}
            nameByCode={nameByCode}
            metricLabel={mapConfig.metricLabel}
            scale={mapConfig.scale}
            height={460}
            onSelect={(h: TerritoryMapHandle) => pick(h.code)}
            formatValue={mapConfig.fmt}
          />
          <p className="font-ui mt-2 text-caption text-pebble">{dict.interact}</p>
          {layer === "votos" && votos && (
            <p className="font-ui mt-1 text-caption text-pebble">
              {dict.votosTotal}: {votos.total.toLocaleString(locale)}
            </p>
          )}
          {(layer === "prioridade" || layer === "alcance") && (
            <p className="font-ui mt-1 text-caption text-pebble">
              {pt
                ? "Municípios vazados: sem sinal territorial do candidato."
                : "Hollow municipalities: no candidate signal."}
            </p>
          )}
        </div>

        {sel && (
          <div className="card self-start">
            <p className="font-ui text-caption uppercase tracking-wider text-pebble">{dict.selected}</p>
            <p className="font-ui mt-1 text-body text-ink">
              {sel.nome}
              {anc?.code === sel.code && (
                <span className="mark ml-1.5 text-[11px]">{dict.ancoraLabel}</span>
              )}
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-ui text-[36px] font-light leading-none text-ink">
                {contexto ? sel.pesoTerritorial * 100 : sel.score.toFixed(0)}
              </span>
              <span className="font-ui text-caption text-fossil">
                {contexto ? dict.layerPeso : dict.score}
              </span>
            </div>

            {!contexto && (
              <>
                <span className="mt-3 inline-flex items-center">
                  <span
                    className="font-ui rounded-none px-2 py-1 text-caption text-white"
                    style={{ background: urgVar(URGENCIA_QUADRANTE[sel.quadrante] ?? "none") }}
                  >
                    {quad[sel.quadrante].label}
                  </span>
                  <Info label={quad[sel.quadrante].label}>{dict.quadExplain[sel.quadrante]}</Info>
                </span>
                <p className="mt-2 text-body-sm text-fossil">{quad[sel.quadrante].acao}</p>
              </>
            )}

            <div className="mt-5 space-y-3">
              <p className="t-eyebrow">{dict.pillars}</p>
              <Bar label={dict.pesoEleitoral} hint={dict.pesoEleitoralHint} v={sel.pilares.pesoEleitoral} color="var(--color-cat-1)" />
              <Bar label={dict.disputabilidade} hint={dict.disputabilidadeHint} v={sel.pilares.disputabilidade} color="var(--color-cat-5)" />
              {!contexto && (
                <Bar
                  label={dict.desempenhoHistorico}
                  hint={dict.desempenhoHistoricoHint}
                  v={sel.pilares.alcance}
                  color="var(--color-cat-3)"
                />
              )}
            </div>

            <dl className="font-ui mt-4 space-y-1 border-t border-ash pt-3 text-caption">
              {!contexto && (
                <div className="flex justify-between">
                  <dt className="text-pebble">{dict.confiancaLabel}</dt>
                  <dd className="text-smoke">{CONF_LABEL[sel.confianca]?.[pt ? "pt" : "en"] ?? "—"}</dd>
                </div>
              )}
              {votos && (
                <div className="flex justify-between">
                  <dt className="text-pebble">{votosField}</dt>
                  <dd className="text-smoke">{(votos.byCode[sel.code] ?? 0).toLocaleString(locale)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-pebble">{dict.pibPerCapita}</dt>
                <dd className="text-smoke">R$ {sel.pibPerCapita.toLocaleString(locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-pebble">{pt ? "População" : "Population"}</dt>
                <dd className="text-smoke">{sel.populacao.toLocaleString(locale)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {!contexto && (
        <div className="mt-6">
          <p className="t-eyebrow mb-3">{dict.quadrantsTitle}</p>
          <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-ash bg-ash sm:grid-cols-2 lg:grid-cols-4">
            {counts.map(({ q, n }) => (
              <div key={q} className="bg-paper p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: urgVar(URGENCIA_QUADRANTE[q] ?? "none") }}
                  />
                  <p className="font-ui text-[24px] font-light text-ink">{n}</p>
                </div>
                <p className="font-ui mt-1 flex items-center text-body-sm text-ink">
                  {quad[q].label}
                  <Info label={quad[q].label}>{dict.quadExplain[q]}</Info>
                </p>
                <p className="font-ui mt-1 text-caption text-fossil">{quad[q].acao}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mt-6">
        <h3 className="t-heading text-[20px]">
          {contexto ? dict.layerPeso : dict.ranking} — {ufNome}
        </h3>
        <p className="font-ui mt-1 text-caption text-pebble">{dict.clickHint}</p>
        <ol className="font-ui mt-3 divide-y divide-ash text-body-sm">
          {[...ifet.municipios]
            .sort((a, b) => (contexto ? b.pesoTerritorial - a.pesoTerritorial : b.score - a.score))
            .slice(0, 18)
            .map((m, i) => (
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
                  {!contexto && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-right text-caption text-fossil">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: urgVar(URGENCIA_QUADRANTE[m.quadrante] ?? "none") }}
                      />
                      {quad[m.quadrante].label.split(" ")[0]}
                    </span>
                  )}
                  <span className="w-10 shrink-0 text-right font-medium text-ink">
                    {contexto ? Math.round(m.pesoTerritorial * 100) : m.score.toFixed(0)}
                  </span>
                </button>
              </li>
            ))}
        </ol>
      </div>
    </>
  );
}
