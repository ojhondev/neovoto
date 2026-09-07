import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico da conexão com o brasil.io (dado eleitoral público).
 * Uso: /api/politicos/debug?q=lula  → mostra status, campos e 1ª linha crua.
 */
export async function GET(req: Request) {
  const token = process.env.BRASILIO_API_TOKEN;
  if (!token) return NextResponse.json({ error: "sem BRASILIO_API_TOKEN" }, { status: 400 });
  const q = new URL(req.url).searchParams.get("q") ?? "lula";

  const url =
    "https://brasil.io/api/v1/dataset/eleicoes-brasil/candidatos/data/?" +
    new URLSearchParams({ search: q, ano_eleicao: "2022", page_size: "5" });

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
      cache: "no-store",
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      return NextResponse.json({
        status: res.status,
        throttled: res.status === 429,
        note: "resposta não-JSON (provável rate limit / bloqueio de IP)",
      });
    }
    const j = (await res.json()) as { count?: number; results?: Record<string, unknown>[] };
    const first = j.results?.[0];
    return NextResponse.json({
      status: res.status,
      count: j.count ?? 0,
      fields: first ? Object.keys(first) : [],
      first: first ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
