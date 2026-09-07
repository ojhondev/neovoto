import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

/**
 * Cliente Drizzle sobre Neon HTTP. Durante a fase de fundação o DATABASE_URL pode
 * ainda não estar provisionado; nesse caso `db` lança ao ser usado, nunca no import,
 * para não quebrar o build.
 */
export const db = url
  ? drizzle(neon(url), { schema })
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(
            "DATABASE_URL ausente. Rode o provisionamento (vercel install neon) e `vercel env pull .env.local`.",
          );
        },
      },
    ) as ReturnType<typeof drizzle>);

export { schema };
