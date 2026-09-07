"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { adicionarConcorrenteAction } from "@/app/painel/concorrentes/actions";

type Hit = {
  source?: string;
  externalId: string;
  nome: string;
  partido: string;
  uf: string;
  casa?: string;
  cargo?: string;
  ano?: number;
  fonte?: string;
} & Record<string, unknown>;

export function ConcorrenteBusca({
  labels,
  full,
}: {
  labels: {
    placeholder: string;
    searching: string;
    allOffices: string;
    empty: string;
    add: string;
  };
  full: boolean;
}) {
  const [q, setQ] = useState("");
  const [tse, setTse] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    timer.current = setTimeout(async () => {
      if (term.length < 3) {
        setHits([]);
        return;
      }
      setLoading(true);
      try {
        const r = await fetch(
          `/api/politicos/buscar?q=${encodeURIComponent(term)}${tse ? "&tse=1" : ""}`,
        );
        const j = (await r.json()) as { results?: Hit[] };
        setHits((j.results ?? []).slice(0, 8));
      } catch {
        setHits([]);
      }
      setLoading(false);
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, tse]);

  const add = (h: Hit) => {
    const fd = new FormData();
    const src = h.fonte === "tse" || h.source === "tse" ? "tse" : h.source ?? "camara";
    fd.set("source", src);
    if (src === "tse") fd.set("candidato", JSON.stringify(h));
    else fd.set("externalId", h.externalId);
    setErr(null);
    start(async () => {
      const res = await adicionarConcorrenteAction({}, fd);
      if (res.error) setErr(res.error);
      else {
        setQ("");
        setHits([]);
      }
    });
  };

  if (!full) {
    return (
      <p className="font-ui text-caption text-pebble">
        {/* arena cheia */}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 rounded-[8px] border border-ash bg-paper px-3 py-2">
        <Search size={15} className="shrink-0 text-pebble" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={labels.placeholder}
          className="font-ui w-full bg-transparent text-body-sm text-ink outline-none placeholder:text-pebble"
        />
        {(loading || pending) && <Loader2 size={15} className="shrink-0 animate-spin text-pebble" />}
      </div>
      <label className="font-ui mt-2 flex items-center gap-2 text-caption text-fossil">
        <input type="checkbox" checked={tse} onChange={(e) => setTse(e.target.checked)} />
        {labels.allOffices}
      </label>
      {err && <p className="font-ui mt-2 text-caption text-urg-crit">{err}</p>}
      {hits.length > 0 && (
        <ul className="mt-2 divide-y divide-ash rounded-[8px] border border-ash">
          {hits.map((h) => (
            <li key={`${h.source}-${h.externalId}`}>
              <button
                type="button"
                onClick={() => add(h)}
                disabled={pending}
                className="font-ui flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-body-sm hover:bg-bone"
              >
                <span className="min-w-0">
                  <span className="block truncate text-ink">{h.nome}</span>
                  <span className="block truncate text-caption text-pebble">
                    {h.partido}
                    {h.uf ? `-${h.uf}` : ""} · {h.casa ?? h.cargo ?? ""}
                    {h.ano ? ` · ${h.ano}` : ""}
                  </span>
                </span>
                <Plus size={15} className="shrink-0 text-fossil" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 3 && !loading && hits.length === 0 && (
        <p className="font-ui mt-2 text-caption text-pebble">{labels.empty}</p>
      )}
    </div>
  );
}
