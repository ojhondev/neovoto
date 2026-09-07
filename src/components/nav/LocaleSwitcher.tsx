import { setLocale } from "@/lib/i18n/actions";
import { locales, type Locale } from "@/lib/i18n/config";

export function LocaleSwitcher({ current }: { current: Locale }) {
  return (
    <form action={setLocale} className="font-ui flex items-center gap-1 text-[13px]">
      {locales.map((loc) => {
        const active = loc === current;
        return (
          <button
            key={loc}
            type="submit"
            name="locale"
            value={loc}
            aria-pressed={active}
            className={
              "rounded-[4px] px-1.5 py-0.5 uppercase tracking-wider transition-colors " +
              (active
                ? "bg-ink text-paper"
                : "text-fossil hover:text-ink")
            }
          >
            {loc}
          </button>
        );
      })}
    </form>
  );
}
