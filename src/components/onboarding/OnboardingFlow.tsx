"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import Image from "next/image";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { finalizarOnboarding, type OnboardingState } from "@/app/onboarding/actions";

type Result = {
  source: "camara" | "senado";
  externalId: string;
  nome: string;
  partido: string;
  uf: string;
  casa: string;
  foto: string;
};

type Dict = {
  step: string;
  of: string;
  title: string;
  sub: string;
  searchPlaceholder: string;
  searching: string;
  noResults: string;
  hint: string;
  onlyFederal: string;
  selected: string;
  change: string;
  objectiveTitle: string;
  objectiveSub: string;
  objectives: { value: string; label: string }[];
  finish: string;
  creating: string;
  errorGeneric: string;
};

export function OnboardingFlow({ dict }: { dict: Dict }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Result | null>(null);
  const [objective, setObjective] = useState(dict.objectives[3]?.value ?? "avaliando");
  const abort = useRef<AbortController | null>(null);

  const term = q.trim();
  const canSearch = term.length >= 2 && !picked;

  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    finalizarOnboarding,
    {},
  );

  useEffect(() => {
    if (!canSearch) return;
    let live = true;
    const id = setTimeout(async () => {
      abort.current?.abort();
      abort.current = new AbortController();
      if (live) setLoading(true);
      try {
        const res = await fetch(`/api/politicos/buscar?q=${encodeURIComponent(term)}`, {
          signal: abort.current.signal,
        });
        const data = await res.json();
        if (live) setResults(data.results ?? []);
      } catch {
        /* abortado */
      } finally {
        if (live) setLoading(false);
      }
    }, 320);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [term, canSearch]);

  const step = picked ? 2 : 1;

  return (
    <div className="w-full max-w-lg">
      <p className="t-eyebrow mb-3">
        {dict.step} {step} {dict.of} 2
      </p>

      {!picked && (
        <>
          <h1 className="t-heading-lg">{dict.title}</h1>
          <p className="mt-4 text-body text-fossil">{dict.sub}</p>

          <div className="mt-8 flex items-center gap-2 rounded-[8px] border border-pebble bg-paper px-3">
            <Search size={16} className="text-fossil" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={dict.searchPlaceholder}
              className="font-ui w-full bg-transparent py-3 text-body-sm outline-none"
            />
            {loading && <Loader2 size={16} className="animate-spin text-fossil" />}
          </div>

          <div
            className="mt-3 divide-y divide-ash overflow-hidden rounded-[8px] border border-ash"
            hidden={!canSearch}
          >
            {results.map((r) => (
              <button
                key={`${r.source}-${r.externalId}`}
                type="button"
                onClick={() => setPicked(r)}
                className="flex w-full items-center gap-3 bg-paper px-3 py-2.5 text-left transition-colors hover:bg-bone"
              >
                <Image
                  src={r.foto}
                  alt=""
                  width={36}
                  height={48}
                  className="h-12 w-9 shrink-0 rounded-[3px] object-cover"
                  unoptimized
                />
                <span className="min-w-0">
                  <span className="font-ui block truncate text-body-sm text-ink">{r.nome}</span>
                  <span className="font-ui block text-caption text-fossil">
                    {r.partido}-{r.uf} · {r.casa}
                  </span>
                </span>
                <ArrowRight size={15} className="ml-auto shrink-0 text-pebble" />
              </button>
            ))}
            {!loading && canSearch && results.length === 0 && (
              <p className="font-ui bg-paper px-3 py-3 text-body-sm text-fossil">
                {dict.noResults}
              </p>
            )}
          </div>

          <p className="font-ui mt-4 text-caption text-pebble">{dict.hint}</p>
          <p className="font-ui mt-2 text-caption text-pebble">{dict.onlyFederal}</p>
        </>
      )}

      {picked && (
        <form action={formAction}>
          <input type="hidden" name="source" value={picked.source} />
          <input type="hidden" name="externalId" value={picked.externalId} />
          <input type="hidden" name="objective" value={objective} />

          <div className="flex items-center gap-3 rounded-[12px] border border-ash bg-paper p-3">
            <Image
              src={picked.foto}
              alt=""
              width={44}
              height={58}
              className="h-[58px] w-11 shrink-0 rounded-[4px] object-cover"
              unoptimized
            />
            <div className="min-w-0">
              <p className="font-ui text-caption text-fossil">{dict.selected}</p>
              <p className="font-ui truncate text-body text-ink">{picked.nome}</p>
              <p className="font-ui text-caption text-fossil">
                {picked.partido}-{picked.uf} · {picked.casa}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="nav-link ml-auto shrink-0 text-caption"
            >
              {dict.change}
            </button>
          </div>

          <h2 className="t-heading mt-8">{dict.objectiveTitle}</h2>
          <p className="mt-2 text-body-sm text-fossil">{dict.objectiveSub}</p>
          <div className="mt-4 space-y-2">
            {dict.objectives.map((o) => (
              <label
                key={o.value}
                className={
                  "font-ui flex cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-2.5 text-body-sm transition-colors " +
                  (objective === o.value
                    ? "border-ink bg-sand"
                    : "border-ash bg-paper hover:bg-bone")
                }
              >
                <input
                  type="radio"
                  name="objective-choice"
                  checked={objective === o.value}
                  onChange={() => setObjective(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>

          {state.error && (
            <p className="font-ui mt-4 text-body-sm text-negative">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary mt-8 w-full justify-center"
          >
            {pending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {dict.creating}
              </>
            ) : (
              <>
                {dict.finish} <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
