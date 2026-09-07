import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import pt, { type Dictionary } from "./pt";
import en from "./en";

const dictionaries: Record<Locale, Dictionary> = { pt, en };

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}

export type { Dictionary };
export type { Locale } from "./config";
