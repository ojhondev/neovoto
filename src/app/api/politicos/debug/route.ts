import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://brasil.io/api/v1/dataset/eleicoes-brasil";

async function probe(label: string, path: string, token: string) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Token ${token}` },
      cache: "no-store",
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      return { label, status: res.status, note: res.status === 429 ? "rate limit" : "não-JSON" };
    }
    const j = (await res.json()) as { count?: number; results?: Record<string, unknown>[]; detail?: string };
    return {
      label,
      status: res.status,
      count: j.count ?? null,
      detail: j.detail ?? null,
      fields: j.results?.[0] ? Object.keys(j.results[0]) : [],
      first: j.results?.[0] ?? null,
    };
  } catch (e) {
    return { label, error: String(e) };
  }
}

/** Diagnóstico do brasil.io: testa estratégias de filtro nas tabelas candidatos e votacao. */
export async function GET(req: Request) {
  const token = process.env.BRASILIO_API_TOKEN;
  if (!token) return NextResponse.json({ error: "sem BRASILIO_API_TOKEN" }, { status: 400 });
  const q = new URL(req.url).searchParams.get("q") ?? "lula";

  const U = q.toUpperCase();
  const out = [];
  out.push(await probe("cand: nome_urna eq", `/candidatos/data/?nome_urna_candidato=${encodeURIComponent(U)}&page_size=5`, token));
  out.push(await probe("cand: nome_candidato eq", `/candidatos/data/?nome_candidato=${encodeURIComponent(U)}&page_size=5`, token));
  out.push(await probe("cand: search + 2022", `/candidatos/data/?search=${encodeURIComponent(q)}&ano_eleicao=2022&page_size=5`, token));
  out.push(await probe("tables list", `/`, token));

  return NextResponse.json({ q, probes: out.map((p) => ({ ...p, first: p.first ? { nome: (p.first as Record<string, unknown>).nome_urna_candidato, ano: (p.first as Record<string, unknown>).ano_eleicao, cargo: (p.first as Record<string, unknown>).descricao_cargo } : null })) });
}
