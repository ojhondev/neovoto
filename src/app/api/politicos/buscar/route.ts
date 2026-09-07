import { NextResponse } from "next/server";
import { buscarPoliticos, buscarPoliticosTSE, BrasilioThrottled } from "@/lib/politico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const tse = url.searchParams.get("tse") === "1";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });

  // Busca "todos os cargos" (brasil.io) — só sob demanda explícita.
  if (tse) {
    try {
      const results = await buscarPoliticosTSE(q);
      return NextResponse.json({ results });
    } catch (err) {
      if (err instanceof BrasilioThrottled) {
        return NextResponse.json({ results: [], throttled: true }, { status: 429 });
      }
      return NextResponse.json({ results: [], error: "Falha na busca em todos os cargos." }, { status: 502 });
    }
  }

  try {
    const results = await buscarPoliticos(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { results: [], error: "Falha ao consultar as fontes oficiais." },
      { status: 502 },
    );
  }
}
