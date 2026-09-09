import type { ReactNode } from "react";

/**
 * Balão informativo. Passe o mouse (ou foque com Tab) no ícone para ver a
 * explicação. Sem estado React — CSS puro (group-hover / focus-within), roda
 * em Server Component.
 *
 *   <Info>O que é o IFET e de onde vêm os números.</Info>
 *   Peso eleitoral <Info label="Peso eleitoral">Quanto voto está em jogo…</Info>
 */
export function Info({
  children,
  label,
  side = "top",
}: {
  children: ReactNode;
  label?: string;
  side?: "top" | "bottom";
}) {
  return (
    <span className="group/info relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label ? `Ajuda: ${label}` : "Ajuda"}
        className="ml-1 inline-flex h-[15px] w-[15px] items-center justify-center rounded-full border border-ash text-[10px] font-medium leading-none text-pebble transition-colors hover:border-fossil hover:text-fossil focus:outline-none focus-visible:ring-2 focus-visible:ring-olive"
      >
        i
      </button>
      <span
        role="tooltip"
        className={
          "pointer-events-none absolute left-1/2 z-40 w-64 -translate-x-1/2 rounded-none border border-ash bg-paper p-3 text-left text-caption leading-snug text-smoke opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-opacity duration-150 group-hover/info:opacity-100 group-focus-within/info:opacity-100 " +
          (side === "top" ? "bottom-full mb-2" : "top-full mt-2")
        }
      >
        {label && <span className="mb-1 block font-medium text-ink">{label}</span>}
        {children}
      </span>
    </span>
  );
}
