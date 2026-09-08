"use client";

import { useState } from "react";
import { TerritoryMap, type TerritoryMapHandle } from "@/components/viz/TerritoryMap";
import type { MovimentoResultado, ZonasResultado, MovimentoMunicipio } from "@/lib/intel/movimento";

type Dict = {
  title: string;
  sub: string;
  crescimento: string;
  perda: string;
  bolsoesCresc: string;
  bolsoesPerda: string;
  zonasFortes: string;
  zonasFracas: string;
  zonaCol: string;
  swingCol: string;
  shareCol: string;
  votosCol: string;
  totalMovido: string;
  selMun: string;
  interact: string;
  vsAno: string;
};

const fmtSign = (n: number, locale: string) =>
  (n > 0 ? "+" : "") + Math.round(n).toLocaleString(locale);

export function MovimentoView({
  geojson,
  nameByCode,
  movimento,
  zonas,
  dict,
  locale,
}: {
  geojson: React.ComponentProps<typeof TerritoryMap>["geojson"];
  nameByCode: Record<string, string>;
  movimento: MovimentoResultado | null;
  zonas: ZonasResultado | null;
  dict: Dict;
  locale: string;
}) {
  const pt = locale === "pt";
  const [sel, setSel] = useState<MovimentoMunicipio | null>(
    movimento?.municipios.find((m) => m.delta !== 0) ?? null,
  );

  return (
    <div className="card mt-6">
      <h3 className="t-heading text-[20px]">{dict.title}</h3>
      <p className="font-ui mt-1 max-w-2xl text-caption text-pebble">{dict.sub}</p>

      {movimento ? (
        <>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <TerritoryMap
                geojson={geojson}
                valueByCode={movimento.byCodeSwing}
                nameByCode={nameByCode}
                metricLabel={pt ? "variação (pp)" : "swing (pp)"}
                scale="diverging"
                height={400}
                onSelect={(h: TerritoryMapHandle) => {
                  const m = movimento.municipios.find((x) => x.code === h.code);
                  if (m) setSel(m);
                }}
                formatValue={(n) => `${n > 0 ? "+" : ""}${n.toFixed(2)} pp`}
              />
              <p className="font-ui mt-2 text-caption text-pebble">{dict.interact}</p>
              <p className="font-ui mt-1 text-caption text-fossil">
                {dict.totalMovido}: <b>{fmtSign(movimento.deltaTotal, locale)}</b> {pt ? "votos" : "votes"} ·{" "}
                {movimento.anoAnterior} → {movimento.anoAtual} ({movimento.cargo}) ·{" "}
                <span style={{ color: "var(--color-positive)" }}>{movimento.municipiosCresceu}↑</span>{" "}
                <span style={{ color: "var(--color-negative)" }}>{movimento.municipiosCaiu}↓</span>
              </p>
            </div>

            {sel && (
              <div className="rounded-[10px] border border-ash bg-paper p-4 self-start">
                <p className="font-ui text-caption uppercase tracking-wider text-pebble">{dict.selMun}</p>
                <p className="font-ui mt-1 text-body text-ink">{sel.nome}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span
                    className="font-ui text-[30px] font-light leading-none"
                    style={{ color: sel.delta >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}
                  >
                    {fmtSign(sel.delta, locale)}
                  </span>
                  <span className="font-ui text-caption text-fossil">{pt ? "votos" : "votes"}</span>
                </div>
                <dl className="font-ui mt-3 space-y-1 border-t border-ash pt-3 text-caption">
                  <div className="flex justify-between">
                    <dt className="text-pebble">{movimento.anoAtual}</dt>
                    <dd className="text-smoke">{sel.votosAtual.toLocaleString(locale)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-pebble">{movimento.anoAnterior}</dt>
                    <dd className="text-smoke">{sel.votosAnterior.toLocaleString(locale)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-pebble">{pt ? "share do comparecimento" : "share of turnout"}</dt>
                    <dd className="text-smoke">
                      {(sel.shareAnterior * 100).toFixed(1)}% → {(sel.shareAtual * 100).toFixed(1)}%
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-pebble">{dict.swingCol}</dt>
                    <dd style={{ color: sel.swing >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
                      {sel.swing > 0 ? "+" : ""}
                      {(sel.swing * 100).toFixed(2)} pp
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="t-eyebrow mb-2" style={{ color: "var(--color-positive)" }}>{dict.bolsoesCresc}</p>
              <ul className="font-ui divide-y divide-ash text-body-sm">
                {movimento.bolsoesCrescimento.map((m) => (
                  <li key={m.code} className="flex items-center justify-between py-1.5">
                    <span className="truncate text-smoke">{m.nome}</span>
                    <span className="shrink-0 text-fossil">
                      {fmtSign(m.delta, locale)} · {m.swing > 0 ? "+" : ""}{(m.swing * 100).toFixed(1)} pp
                    </span>
                  </li>
                ))}
                {movimento.bolsoesCrescimento.length === 0 && <li className="py-1.5 text-pebble">—</li>}
              </ul>
            </div>
            <div>
              <p className="t-eyebrow mb-2" style={{ color: "var(--color-negative)" }}>{dict.bolsoesPerda}</p>
              <ul className="font-ui divide-y divide-ash text-body-sm">
                {movimento.bolsoesPerda.map((m) => (
                  <li key={m.code} className="flex items-center justify-between py-1.5">
                    <span className="truncate text-smoke">{m.nome}</span>
                    <span className="shrink-0 text-fossil">
                      {fmtSign(m.delta, locale)} · {(m.swing * 100).toFixed(1)} pp
                    </span>
                  </li>
                ))}
                {movimento.bolsoesPerda.length === 0 && <li className="py-1.5 text-pebble">—</li>}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <p className="font-ui mt-3 text-body-sm text-fossil">
          {pt
            ? "Só há uma eleição do candidato neste cargo — o movimento entre eleições precisa de duas. As zonas da última eleição estão abaixo."
            : "Only one election on record for this office — election-over-election movement needs two. The zones of the last election are below."}
        </p>
      )}

      {zonas && zonas.maisFortes.length > 0 && (
        <div className="mt-6 border-t border-ash pt-5">
          <p className="t-eyebrow mb-2">{pt ? `Zonas eleitorais — ${zonas.ano}` : `Electoral zones — ${zonas.ano}`}</p>
          <div className="tbl-wrap">
            <table className="w-full">
              <thead>
                <tr>
                  <th>{dict.zonasFortes}</th>
                  <th className="text-right">{dict.shareCol}</th>
                  <th className="text-right">{dict.votosCol}</th>
                </tr>
              </thead>
              <tbody>
                {zonas.maisFortes.slice(0, 8).map((z) => (
                  <tr key={`${z.code}-${z.zona}`}>
                    <td>
                      {z.nome} · {pt ? "zona" : "zone"} {z.zona}
                    </td>
                    <td className="text-right tabular-nums">{(z.share * 100).toFixed(1)}%</td>
                    <td className="text-right tabular-nums">{z.votos.toLocaleString(locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
