import { NextResponse } from "next/server";
import { buscarPoliticos } from "@/lib/politico";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await buscarPoliticos(q);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, max-age=120" } },
    );
  } catch {
    return NextResponse.json(
      { results: [], error: "Falha ao consultar as fontes oficiais." },
      { status: 502 },
    );
  }
}
