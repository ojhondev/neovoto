"use client";

import { useState } from "react";
import { IdeologyMatrix } from "@/components/app/IdeologyMatrix";
import { Treemap, type TreeGroup, type TreeNode } from "@/components/app/Treemap";
import { MatrizRecomendacao } from "@/components/app/MatrizRecomendacao";
import type { MunicipioMatriz } from "@/lib/intel/matriz";
import { lerpHex } from "@/lib/viz/colors";

function corCampo(m: { eco: number; soc: number }) {
  const t = (m.eco + m.soc) / 2;
  return t < 0 ? lerpHex("#2f6fed", "#b9b2a6", (t + 1)) : lerpHex("#b9b2a6", "#e5397f", t);
}

export function MatrizViews({
  municipios,
  candidato,
  ufMedia,
  nomeYou,
  labels,
  locale,
  quadLabels,
}: {
  municipios: MunicipioMatriz[];
  candidato: { eco: number; soc: number; conhecido?: boolean };
  ufMedia: { eco: number; soc: number };
  nomeYou: string;
  labels: React.ComponentProps<typeof IdeologyMatrix>["labels"];
  locale: string;
  quadLabels: { pp: string; pl: string; lp: string; ll: string };
}) {
  const pt = locale === "pt";
  const [view, setView] = useState<"scatter" | "treemap">("scatter");
  const [selCode, setSelCode] = useState<string | null>(null);
  const selMun = municipios.find((m) => m.code === selCode) ?? null;

  const grupos: TreeGroup[] = [
    { key: "pp", test: (m: MunicipioMatriz) => m.eco < 0 && m.soc >= 0, label: quadLabels.pp },
    { key: "pl", test: (m: MunicipioMatriz) => m.eco >= 0 && m.soc >= 0, label: quadLabels.pl },
    { key: "lp", test: (m: MunicipioMatriz) => m.eco < 0 && m.soc < 0, label: quadLabels.lp },
    { key: "ll", test: (m: MunicipioMatriz) => m.eco >= 0 && m.soc < 0, label: quadLabels.ll },
  ].map((g) => ({
    label: g.label,
    nodes: municipios
      .filter(g.test)
      .sort((a, b) => b.populacao - a.populacao)
      .slice(0, 60)
      .map((m) => ({
        id: m.code,
        label: m.nome,
        value: m.populacao,
        color: corCampo(m),
        sub: `eco ${m.eco} · soc ${m.soc}`,
      })),
  }));

  return (
    <div>
      <div className="font-ui mb-3 inline-flex rounded-[4px] border border-ash p-0.5 text-caption">
        {(["scatter", "treemap"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={
              "rounded-[3px] px-3 py-1 transition-colors " +
              (view === v ? "bg-ink text-paper" : "text-fossil hover:text-ink")
            }
          >
            {v === "scatter" ? (pt ? "Dispersão" : "Scatter") : "Treemap"}
          </button>
        ))}
      </div>

      {view === "scatter" ? (
        <IdeologyMatrix
          municipios={municipios}
          candidato={candidato}
          ufMedia={ufMedia}
          nomeYou={nomeYou}
          labels={labels}
          locale={locale}
        />
      ) : (
        <>
          <Treemap
            groups={grupos}
            locale={locale}
            selectedId={selCode}
            onSelect={(n: TreeNode) => setSelCode(n.id === selCode ? null : n.id ?? null)}
            hint={
              pt
                ? "Cada retângulo é um município; o tamanho é a população. Clique para a recomendação de agenda ali."
                : "Each rectangle is a municipality; size is population. Click for the agenda recommendation there."
            }
          />
          {selMun && (
            <MatrizRecomendacao
              m={selMun}
              candidato={candidato}
              locale={locale}
              distanceLabel={labels.distance}
            />
          )}
        </>
      )}
    </div>
  );
}
