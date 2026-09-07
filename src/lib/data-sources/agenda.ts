/**
 * Agenda legislativa recente — o que a Câmara está de fato discutindo.
 * Fonte: Dados Abertos da Câmara v2 (REST, sem chave, acessível de servidor).
 * Base institucional do Radar de Posicionamento (Fase 1).
 */
const BASE = "https://dadosabertos.camara.leg.br/api/v2";

const TIPOS = ["PL", "PEC", "PLP", "MPV", "PDL"]; // ignora REQ/RIC/INC (ruído)

export type ItemAgenda = {
  id: number;
  tipo: string;
  ementa: string;
  data: string; // YYYY-MM-DD
};

type ApiResp = {
  dados: { id: number; siglaTipo: string; ementa: string; dataApresentacao: string }[];
  links: { rel: string; href: string }[];
};

/**
 * Proposições apresentadas nos últimos `dias` (default 120), tipos relevantes.
 * Pagina até `maxPaginas` (100 itens/página). Cacheado 12h.
 */
export async function getAgendaCamara(dias = 120, maxPaginas = 5): Promise<ItemAgenda[]> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
  let url =
    `${BASE}/proposicoes?dataApresentacaoInicio=${desde}` +
    `&siglaTipo=${TIPOS.join(",")}&ordem=DESC&ordenarPor=id&itens=100`;

  const out: ItemAgenda[] = [];
  for (let i = 0; i < maxPaginas && url; i++) {
    let resp: ApiResp;
    try {
      const r = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 * 60 * 12 },
      });
      if (!r.ok) break;
      resp = (await r.json()) as ApiResp;
    } catch {
      break;
    }
    for (const d of resp.dados ?? []) {
      if (!d.ementa) continue;
      out.push({
        id: d.id,
        tipo: d.siglaTipo,
        ementa: d.ementa,
        data: (d.dataApresentacao ?? "").slice(0, 10),
      });
    }
    url = resp.links?.find((l) => l.rel === "next")?.href ?? "";
  }

  // só o que realmente caiu na janela, mais recentes primeiro
  return out
    .filter((x) => x.data >= desde)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
}
