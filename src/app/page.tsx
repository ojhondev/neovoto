import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Reveal } from "@/components/marketing/Reveal";
import { ParticleField } from "@/components/marketing/ParticleField";
import { PillarsShowcase, type Pillar } from "@/components/marketing/PillarsShowcase";
import { Marquee } from "@/components/marketing/Marquee";
import { Testimonials } from "@/components/marketing/Testimonials";
import { Faq } from "@/components/marketing/Faq";
import { InfluenceNetwork } from "@/components/viz/InfluenceNetwork";
import { getDictionary } from "@/lib/i18n";
import { TOOLS, toolPath } from "@/lib/tools";

const FLUID = "w-full px-5 sm:px-10 lg:px-20";

export default async function LandingPage() {
  const { t } = await getDictionary();

  const pillars: Pillar[] = [
    { ...t.landing.pillars[0], id: "pre", href: "/painel/matriz-ideologica", panel: "territorio", tint: "" },
    { ...t.landing.pillars[1], id: "camp", href: "/painel/cenarios", panel: "cenario", tint: "" },
    { ...t.landing.pillars[2], id: "gov", href: "/painel/mapa-de-propostas", panel: "propostas", tint: "" },
  ];

  return (
    <>
      <div className="relative z-10">
        <div className="bg-charcoal">
          <p className="font-ui px-5 py-2.5 text-center text-[13px] text-white">{t.announce}</p>
        </div>
        <SiteHeader />

        <main>
          <ParticleField>
          {/* HERO — fundo transparente, partículas atrás */}
          <section className={`${FLUID} flex min-h-[86vh] flex-col justify-center py-16`}>
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="t-eyebrow mb-5">{t.landing.heroKicker}</p>
                <h1 className="t-display max-w-[14ch]">
                  {t.landing.heroTitle}{" "}
                  <span className="mark">{t.landing.heroTitleAccent}</span>
                </h1>
                <p className="mt-7 max-w-xl text-body text-fossil">{t.landing.heroSub}</p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link href="/onboarding" className="btn btn-primary">
                    {t.landing.heroPrimary} <ArrowRight size={16} />
                  </Link>
                  <Link href="/#ferramentas" className="btn btn-ghost">
                    {t.landing.heroSecondary}
                  </Link>
                </div>
              </div>
              <Reveal delay={80}>
                <div className="rotate-[0.6deg]">
                  <p className="font-ui mb-2 text-caption text-fossil">
                    {t.tools.influenceMap.name} — {t.common.preview}
                  </p>
                  <InfluenceNetwork compact />
                </div>
              </Reveal>
            </div>
            <div className="mt-14 flex items-center gap-2 text-fossil">
              <ArrowDown size={14} />
              <span className="font-ui text-caption uppercase tracking-[0.14em]">
                {t.landing.scrollCue}
              </span>
            </div>
          </section>

          {/* GLOBO — headline sobre as partículas que se aglomeram ao rolar */}
          <section className="relative flex min-h-[110vh] items-center justify-center px-5 text-center">
            <div className="max-w-3xl">
              <h2 className="t-display">
                {t.landing.globeTitleA}
                <br />
                <span className="mark">{t.landing.globeTitleB}</span>
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-body text-fossil">{t.landing.globeSub}</p>
            </div>
          </section>
          </ParticleField>

          {/* 3 PILARES */}
          <div className="relative z-10 bg-bone">
            <PillarsShowcase
              kicker={t.landing.pillarsKicker}
              title={t.landing.pillarsTitle}
              pillars={pillars}
              fluid={FLUID}
            />
          </div>

          {/* FAIXA CHARTREUSE */}
          <Marquee
            line={t.landing.marqueeLine}
            rowA={[...t.landing.marqueeRowA]}
            rowB={[...t.landing.marqueeRowB]}
          />

          {/* TRUST */}
          <section className="relative z-10 border-y border-ash bg-paper">
            <div className={`${FLUID} py-20`}>
              <h2 className="t-heading-lg max-w-2xl">{t.landing.trustTitle}</h2>
              <div className="mt-12 grid gap-6 md:grid-cols-3">
                {t.landing.trust.map((c, i) => (
                  <Reveal key={c.title} delay={i * 70} className="card">
                    <span className="font-ui text-caption text-fossil">0{i + 1}</span>
                    <h3 className="t-heading mt-3">{c.title}</h3>
                    <p className="mt-3 text-body-sm text-fossil">{c.body}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* FERRAMENTAS */}
          <section id="ferramentas" className={`${FLUID} relative z-10 bg-bone py-24`}>
            <h2 className="t-heading-lg max-w-2xl">{t.landing.toolsTitle}</h2>
            <p className="mt-4 max-w-xl text-body text-fossil">{t.landing.toolsSub}</p>
            <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-card-lg)] border border-ash bg-ash sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.map((tool, i) => {
                const meta = t.tools[tool.key];
                const Icon = tool.icon;
                return (
                  <Reveal key={tool.id} delay={i * 50} className="group flex flex-col bg-paper p-7">
                    <Icon size={22} strokeWidth={1.5} className="text-ink" />
                    <h3 className="t-heading mt-4">{meta.name}</h3>
                    <p className="mt-2 flex-1 text-body-sm text-fossil">{meta.short}</p>
                    <Link
                      href={toolPath(tool.id)}
                      className="nav-link mt-5 inline-flex w-fit items-center gap-1.5 text-[14px]"
                    >
                      {t.common.preview} <ArrowRight size={14} />
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </section>

          {/* DEPOIMENTOS */}
          <Testimonials
            kicker={t.landing.testimonialsKicker}
            title={t.landing.testimonialsTitle}
            items={t.landing.testimonials.map((x) => ({ ...x }))}
            note={t.landing.testimonialsNote}
          />

          {/* FAQ */}
          <Faq
            kicker={t.landing.faqKicker}
            title={t.landing.faqTitle}
            items={t.landing.faq.map((x) => ({ ...x }))}
          />

          {/* CTA */}
          <section id="demo" className={`${FLUID} relative z-10 bg-bone py-24 text-center`}>
            <h2 className="t-display mx-auto max-w-3xl">{t.landing.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-md text-body text-fossil">{t.landing.ctaBody}</p>
            <Link href="/onboarding" className="btn btn-primary mt-8">
              {t.landing.heroPrimary} <ArrowRight size={16} />
            </Link>
          </section>
        </main>

        <SiteFooter fluid={FLUID} />
      </div>
    </>
  );
}
