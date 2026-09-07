/** Taxonomia de cargos cobertos pela NeoVoto. */
export type Cargo =
  | "presidente"
  | "governador"
  | "senador"
  | "deputado-federal"
  | "deputado-estadual"
  | "deputado-distrital"
  | "prefeito"
  | "vereador";

export const CARGO_LABEL: Record<
  Cargo,
  { pt: string; en: string; nivel: "federal" | "estadual" | "municipal" }
> = {
  presidente: { pt: "Presidência", en: "President", nivel: "federal" },
  governador: { pt: "Governo do estado", en: "Governor", nivel: "estadual" },
  senador: { pt: "Senado", en: "Senator", nivel: "federal" },
  "deputado-federal": { pt: "Câmara dos Deputados", en: "Federal deputy", nivel: "federal" },
  "deputado-estadual": { pt: "Assembleia Legislativa", en: "State deputy", nivel: "estadual" },
  "deputado-distrital": { pt: "Câmara Legislativa (DF)", en: "District deputy", nivel: "estadual" },
  prefeito: { pt: "Prefeitura", en: "Mayor", nivel: "municipal" },
  vereador: { pt: "Câmara Municipal", en: "Councillor", nivel: "municipal" },
};

/** cargo → ano da última eleição no espelho do brasil.io (2022 geral, 2020 municipal). */
export function anoEleicao(cargo: Cargo): number {
  return CARGO_LABEL[cargo].nivel === "municipal" ? 2020 : 2022;
}

/** Códigos de cargo do TSE (aparecem no brasil.io como `codigo_cargo`). */
export const CARGO_TSE_CODE: Record<number, Cargo> = {
  1: "presidente",
  3: "governador",
  5: "senador",
  6: "deputado-federal",
  7: "deputado-estadual",
  8: "deputado-distrital",
  11: "prefeito",
  13: "vereador",
};

/** `descricao_cargo` do brasil.io (uppercase) → cargo canônico. */
export function cargoFromDesc(raw: string): Cargo | null {
  const n = raw.toUpperCase().trim();
  if (n.includes("PRESIDENTE")) return n.includes("VICE") ? null : "presidente";
  if (n.includes("GOVERNADOR")) return n.includes("VICE") ? null : "governador";
  if (n.includes("SENADOR")) return "senador";
  if (n.includes("DEPUTADO FEDERAL")) return "deputado-federal";
  if (n.includes("DEPUTADO ESTADUAL")) return "deputado-estadual";
  if (n.includes("DEPUTADO DISTRITAL")) return "deputado-distrital";
  if (n.includes("PREFEITO")) return n.includes("VICE") ? null : "prefeito";
  if (n.includes("VEREADOR")) return "vereador";
  return null;
}

export function cargoFromBio(codigo: number, desc: string): Cargo | null {
  return CARGO_TSE_CODE[codigo] ?? cargoFromDesc(desc);
}
