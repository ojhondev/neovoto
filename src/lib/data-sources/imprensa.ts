/**
 * Camada de imprensa e tendências (Radar de Posicionamento, Fase 2).
 * Manchetes recentes (Google Notícias + G1 + Agência Brasil) e buscas em alta
 * (Google Trends BR). Só o TÍTULO/tópico agregado — nenhum dado de pessoa,
 * nenhuma raspagem de rede social. Feeds públicos, sem chave.
 */

export type ItemImprensa = { titulo: string; data: string; fonte: string; tipo: "manchete" | "tendencia" };

const FEEDS: { fonte: string; url: string }[] = [
  {
    fonte: "Google Notícias",
    url: "https://news.google.com/rss/search?q=(congresso%20OR%20senado%20OR%20c%C3%A2mara%20OR%20STF%20OR%20governo%20OR%20lei)%20when%3A4d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
  },
  { fonte: "G1 Política", url: "https://g1.globo.com/rss/g1/politica/" },
  { fonte: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/politica/feed.xml" },
];
const TRENDS_URL = "https://trends.google.com/trending/rss?geo=BR";

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseItems(xml: string): { titulo: string; data: string }[] {
  const out: { titulo: string; data: string }[] = [];
  const blocks = xml.split(/<item[ >]/).slice(1);
  for (const b of blocks) {
    const tm = b.match(/<title>([\s\S]*?)<\/title>/);
    const dm = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (!tm) continue;
    const titulo = decode(tm[1]);
    if (titulo.length < 8) continue;
    const d = dm ? new Date(dm[1]) : new Date();
    out.push({ titulo, data: isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10) });
  }
  return out;
}

async function fetchFeed(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NeoVoto/1.0)" },
    next: { revalidate: 60 * 60 * 3 },
  });
  if (!r.ok) return "";
  return r.text();
}

/** Manchetes políticas dos últimos ~4 dias, deduplicadas. */
export async function getManchetes(): Promise<ItemImprensa[]> {
  const xmls = await Promise.all(FEEDS.map((f) => fetchFeed(f.url).catch(() => "")));
  const seen = new Set<string>();
  const out: ItemImprensa[] = [];
  const limite = Date.now() - 5 * 86_400_000;
  xmls.forEach((xml, i) => {
    for (const it of parseItems(xml)) {
      const chave = it.titulo.toLowerCase().slice(0, 60);
      if (seen.has(chave)) continue;
      if (new Date(it.data).getTime() < limite) continue;
      seen.add(chave);
      out.push({ ...it, fonte: FEEDS[i].fonte, tipo: "manchete" });
    }
  });
  return out;
}

/** Buscas em alta no Brasil (Google Trends). Muitas não serão políticas — tudo bem. */
export async function getTendencias(): Promise<ItemImprensa[]> {
  const xml = await fetchFeed(TRENDS_URL).catch(() => "");
  const hoje = new Date().toISOString().slice(0, 10);
  return parseItems(xml)
    .slice(0, 20)
    .map((it) => ({ titulo: it.titulo, data: hoje, fonte: "Google Trends", tipo: "tendencia" as const }));
}
