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

export const CARGO_LABEL: Record<Cargo, { pt: string; en: string; nivel: "federal" | "estadual" | "municipal" }> = {
  presidente: { pt: "Presidência", en: "President", nivel: "federal" },
  governador: { pt: "Governo do estado", en: "Governor", nivel: "estadual" },
  senador: { pt: "Senado", en: "Senator", nivel: "federal" },
  "deputado-federal": { pt: "Câmara dos Deputados", en: "Federal deputy", nivel: "federal" },
  "deputado-estadual": { pt: "Assembleia Legislativa", en: "State deputy", nivel: "estadual" },
  "deputado-distrital": { pt: "Câmara Legislativa (DF)", en: "District deputy", nivel: "estadual" },
  prefeito: { pt: "Prefeitura", en: "Mayor", nivel: "municipal" },
  vereador: { pt: "Câmara Municipal", en: "Councillor", nivel: "municipal" },
};

/** cargo → ano da última eleição relevante no espelho do brasil.io. */
export function anoEleicao(cargo: Cargo): number {
  return CARGO_LABEL[cargo].nivel === "municipal" ? 2020 : 2022;
}

/** brasil.io usa strings próprias para cargo. */
export const CARGO_BRASILIO: Record<Cargo, string> = {
  presidente: "presidente",
  governador: "governador",
  senador: "senador",
  "deputado-federal": "deputado federal",
  "deputado-estadual": "deputado estadual",
  "deputado-distrital": "deputado distrital",
  prefeito: "prefeito",
  vereador: "vereador",
};

export function cargoFromBrasilio(raw: string): Cargo | null {
  const n = raw.toLowerCase().trim();
  const hit = (Object.entries(CARGO_BRASILIO) as [Cargo, string][]).find(
    ([, v]) => v === n,
  );
  return hit ? hit[0] : null;
}
