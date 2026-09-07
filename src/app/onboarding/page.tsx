import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";
import { LocaleSwitcher } from "@/components/nav/LocaleSwitcher";
import { ThemeToggle } from "@/components/nav/ThemeToggle";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const { locale, t } = await getDictionary();
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo height={24} />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher current={locale} />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <OnboardingFlow
          dict={{
            ...t.onboarding,
            objectives: t.onboarding.objectives.map((o) => ({ ...o })),
          }}
        />
      </main>
    </div>
  );
}
