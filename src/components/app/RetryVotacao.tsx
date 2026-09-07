"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { retryVotacaoAction } from "@/app/painel/mapa-de-calor/actions";

export function RetryVotacao({ label }: { label: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);

  return (
    <div className="mb-4">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await retryVotacaoAction();
            setDone(r);
          })
        }
        className="font-ui inline-flex items-center gap-2 rounded-[8px] border border-ash bg-paper px-3 py-1.5 text-body-sm text-smoke hover:bg-bone"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {label}
      </button>
      {done === "indisponivel" && (
        <span className="font-ui ml-3 text-caption text-fossil">
          Ainda limitado — tente novamente daqui a pouco.
        </span>
      )}
    </div>
  );
}
