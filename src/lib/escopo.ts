/**
 * Escopo territorial da análise.
 * ==============================
 * A maioria das disputas cabe num único estado (vereador → deputado federal →
 * senador → governador): o "território" é a UF da candidatura e cada unidade
 * de análise é um MUNICÍPIO. A Presidência é a exceção — a disputa é NACIONAL,
 * então o território é o Brasil e cada unidade de análise é uma UF.
 *
 * Os motores (IFET, Cenários, Matriz, Coligações, Influência) são genéricos
 * sobre "código → valor": basta trocar a fonte de dados (por-UF ↔ nacional)
 * mantendo o mesmo formato. `escopoNacional()` decide qual usar.
 */
import type { Cargo } from "@/lib/cargos";

/** true quando a disputa é nacional (Presidência) — lê as 27 UFs, não uma só. */
export function escopoNacional(cargo: Cargo | null | undefined): boolean {
  return cargo === "presidente";
}

/**
 * Pleito de referência para os módulos ideológicos/territoriais quando a
 * análise é nacional: presidencial 2022, 1º turno, agregado por UF.
 */
export const PLEITO_NACIONAL = { ano: 2022, turno: 1, cargo: "presidente" } as const;

/** Rótulo do pleito nacional para a UI. */
export function pleitoNacionalLabel(locale: string): string {
  return locale === "pt" ? "presidente 2022 · 1º turno" : "president 2022 · 1st round";
}
