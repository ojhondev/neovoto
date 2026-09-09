"use client";

import { useActionState } from "react";
import { MapPin, Check, Loader2 } from "lucide-react";
import { salvarBaseTerritorial } from "@/app/painel/candidato/actions";

type Dict = {
  title: string;
  body: string;
  baseLabel: string;
  extrasLabel: string;
  extrasHint: string;
  save: string;
  saved: string;
  current: string;
  none: string;
};

export function BaseTerritorialEditor({
  dict,
  municipios,
  anchorNome,
  extrasNomes,
}: {
  dict: Dict;
  municipios: string[];
  anchorNome: string | null;
  extrasNomes: string[];
}) {
  const [state, action, pending] = useActionState(salvarBaseTerritorial, {} as { ok?: boolean; error?: string });

  return (
    <section className="card">
      <h2 className="t-heading flex items-center gap-1.5 text-[22px]">
        <MapPin size={17} className="text-fossil" /> {dict.title}
      </h2>
      <p className="mt-2 text-body-sm text-fossil">{dict.body}</p>

      <p className="font-ui mt-3 text-caption text-pebble">
        {dict.current}:{" "}
        <span className="text-smoke">
          {anchorNome ? anchorNome : dict.none}
          {extrasNomes.length ? ` · ${extrasNomes.join(", ")}` : ""}
        </span>
      </p>

      <form action={action} className="mt-3 space-y-3">
        <datalist id="mun-list">
          {municipios.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <div>
          <label className="font-ui mb-1 block text-caption text-pebble">{dict.baseLabel}</label>
          <input
            name="municipioBase"
            list="mun-list"
            defaultValue={anchorNome ?? ""}
            className="font-ui w-full rounded-none border border-ash bg-paper px-3 py-2.5 text-body-sm outline-none"
          />
        </div>
        <div>
          <label className="font-ui mb-1 block text-caption text-pebble">{dict.extrasLabel}</label>
          <input
            name="extras"
            defaultValue={extrasNomes.join(", ")}
            placeholder={dict.extrasHint}
            className="font-ui w-full rounded-none border border-ash bg-paper px-3 py-2.5 text-body-sm outline-none"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary justify-center">
          {pending ? <Loader2 size={15} className="animate-spin" /> : state.ok ? <Check size={15} /> : null}
          {state.ok ? dict.saved : dict.save}
        </button>
        {state.error && <p className="font-ui text-caption text-negative">{state.error}</p>}
      </form>
    </section>
  );
}
