import { createHash, randomBytes, createHmac } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "neovoto_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET ausente.");
  return s;
}

/** Gera um token opaco e o valor assinado a guardar no cookie + o hash a persistir. */
export function issueSessionToken() {
  const raw = randomBytes(32).toString("hex");
  const sig = createHmac("sha256", secret()).update(raw).digest("hex");
  return {
    cookieValue: `${raw}.${sig}`,
    tokenHash: createHash("sha256").update(raw).digest("hex"),
  };
}

/** Valida a assinatura do cookie e devolve o hash para consulta no banco. */
export function readSessionCookie(value: string | undefined): string | null {
  if (!value) return null;
  const [raw, sig] = value.split(".");
  if (!raw || !sig) return null;
  const expected = createHmac("sha256", secret()).update(raw).digest("hex");
  if (expected !== sig) return null;
  return createHash("sha256").update(raw).digest("hex");
}

export async function setSessionCookie(cookieValue: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + MAX_AGE_SECONDS * 1000);
}
