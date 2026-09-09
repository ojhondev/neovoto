"use client";

import { useMemo, useState } from "react";
import { Newspaper } from "lucide-react";
import type { TemaRadar, TipoRadar } from "@/lib/intel/radar";
import { URGENCIA_RADAR, urgVar } from "@/lib/viz/colors";
import { ClipButton } from "@/components/app/ClipButton";

const EIXO_LABEL_PT: Record<string, string> = {
  economia: "Economia",
  social: "Social",
  seguranca: "Segurança",
  instituicoes: "Instituições",
  costumes: "Costumes",
  ambiente: "Ambiente/agro",
  cotidiano: "Cotidiano",
};
const EIXO_LABEL_EN: Record<string, string> = {
  economia: "Economy",
  social: "Social",
  seguranca: "Safety",
  instituicoes: "Institutions",
  costumes: "Values",
  ambiente: "Environment/agri",
  cotidiano: "Daily life",
};

export function RadarLista({
  temas,
  modulo,
  locale,
  labels,
}: {
  temas: TemaRadar[];
  modulo: string;
  locale: string;
  labels: {
    heat: string;
    recommendation: string;
    tipo: Record<TipoRadar, string>;
    align: Record<TemaRadar["alinhamento"], string>;
    all: string;
    inPress: string;
  };
}) {
  const pt = locale === "pt";
  const EIXO = pt ? EIXO_LABEL_PT : EIXO_LABEL_EN;
  const [eixo, setEixo] = useState<string>("");
  const eixos = useMemo(() => [...new Set(temas.map((t) => t.eixo))], [temas]);
  const lista = eixo ? temas.filter((t) => t.eixo === eixo) : temas;

  return (
    <div>
      {/* filtro por categoria */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setEixo("")}
          className={
            "font-ui rounded-none px-2.5 py-1 text-caption transition-colors " +
            (eixo === "" ? "bg-ink text-paper" : "border border-ash text-fossil hover:text-ink")
          }
        >
          {labels.all}
        </button>
        {eixos.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEixo(eixo === e ? "" : e)}
            className={
              "font-ui rounded-none px-2.5 py-1 text-caption transition-colors " +
              (eixo === e ? "bg-ink text-paper" : "border border-ash text-fossil hover:text-ink")
            }
          >
            {EIXO[e] ?? e}
          </button>
        ))}
      </div>

      <ol className="divide-y divide-ash">
        {lista.map((tema) => (
          <li key={tema.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start gap-4">
              <div className="w-28 shrink-0">
                <div className="font-ui flex items-baseline justify-between text-caption">
                  <span className="text-pebble">{labels.heat}</span>
                  <span className="text-fossil">{tema.heat}</span>
                </div>
                <div className="mt-1 h-2 rounded-none bg-sand">
                  <div
                    className="bar-grow h-full rounded-none"
                    style={{
                      width: `${tema.heat}%`,
                      background: urgVar(tema.heat >= 60 ? "high" : tema.heat >= 30 ? "med" : "none"),
                    }}
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-ui text-body text-ink">{tema.label}</span>
                  <span
                    className="font-ui rounded-none px-1.5 py-0.5 text-[11px] text-white"
                    style={{ background: urgVar(URGENCIA_RADAR[tema.tipo] ?? "none") }}
                  >
                    {labels.tipo[tema.tipo]}
                  </span>
                  <span
                    className={
                      "font-ui rounded-none px-1.5 py-0.5 text-[11px] " +
                      (tema.alinhamento === "tensao"
                        ? "bg-[#c9772f]/20 text-smoke"
                        : tema.alinhamento === "afim"
                          ? "bg-olive/20 text-smoke"
                          : "bg-sand text-smoke")
                    }
                  >
                    {labels.align[tema.alinhamento]}
                  </span>
                  {tema.naImprensa > 0 && (
                    <span className="font-ui inline-flex items-center gap-1 rounded-none bg-cat-1/15 px-1.5 py-0.5 text-[11px] text-smoke" style={{ background: "var(--color-cat-1)", color: "#fff" }}>
                      <Newspaper size={10} /> {labels.inPress} {tema.naImprensa}
                    </span>
                  )}
                </div>
                <p className="font-ui mt-1 text-caption text-pebble">
                  {tema.mencoes} {pt ? "menções" : "mentions"}
                </p>
                <p className="mt-2 flex items-start justify-between gap-3 text-body-sm text-fossil">
                  <span>
                    <span className="text-pebble">{labels.recommendation}: </span>
                    {tema.recomendacao}
                  </span>
                  <ClipButton
                    compact
                    item={{
                      modulo,
                      titulo: `${pt ? "Tema" : "Theme"}: ${tema.label}`,
                      texto: tema.recomendacao,
                    }}
                  />
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
