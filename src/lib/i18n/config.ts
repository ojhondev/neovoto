export const locales = ["pt", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale =
  (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as Locale) || "pt";

export const LOCALE_COOKIE = "NEOVOTO_LOCALE";

export const localeLabels: Record<Locale, string> = {
  pt: "Português",
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
