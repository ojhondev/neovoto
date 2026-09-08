"use client";

import { useState, useTransition } from "react";
import { FilePlus2, Check } from "lucide-react";
import { clipAction } from "@/app/painel/relatorio/actions";
import type { ClipInput } from "@/lib/report";

export function ClipButton({
  item,
  label,
  compact,
}: {
  item: ClipInput;
  label?: string;
  compact?: boolean;
}) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const go = () =>
    start(async () => {
      const r = await clipAction(item);
      if (r.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 2200);
      }
    });

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className={
        "font-ui inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[11px] transition-colors " +
        (done
          ? "border-olive text-olive"
          : "border-ash text-fossil hover:border-fossil hover:text-ink") +
        (compact ? "" : "")
      }
      title={label ?? "Aplicar ao relatório"}
    >
      {done ? <Check size={12} /> : <FilePlus2 size={12} />}
      {!compact && <span>{done ? "Adicionado" : label ?? "Ao relatório"}</span>}
    </button>
  );
}
