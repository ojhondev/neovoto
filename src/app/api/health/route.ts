import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "neovoto",
    phase: "fundacao",
    db: process.env.DATABASE_URL ? "configured" : "pending",
    brasilio: process.env.BRASILIO_API_TOKEN ? "configured" : "pending",
    time: new Date().toISOString(),
  });
}
