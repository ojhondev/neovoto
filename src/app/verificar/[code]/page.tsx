import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { getReport } from "@/lib/report";

export const metadata: Metadata = { title: "Verificação de relatório · NeoVoto" };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { locale, t } = await getDictionary();
  const row = await getReport(code);

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center px-5 py-16">
      <p className="t-eyebrow">{t.common.appName}</p>
      <h1 className="t-heading-lg mt-1">{t.relatorio.verifyPageTitle}</h1>

      {row ? (
        <div className="card mt-6">
          <p className="flex items-center gap-2 text-body text-ink">
            <CheckCircle2 size={18} className="text-urg-low" /> {t.relatorio.verifyOk}
          </p>
          <dl className="font-ui mt-4 space-y-2 text-body-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-pebble">{t.relatorio.code}</dt>
              <dd className="text-smoke">{row.code}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-pebble">{t.relatorio.verifyGeneratedFor}</dt>
              <dd className="text-right text-smoke">{row.candidatoNome}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-pebble">{t.relatorio.verifyOn}</dt>
              <dd className="text-smoke">{new Date(row.generatedAt).toLocaleString(locale)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-pebble">{t.relatorio.verifyHash}</dt>
              <dd className="font-mono text-caption text-smoke">{row.hash}</dd>
            </div>
          </dl>
          <p className="font-ui mt-4 border-t border-ash pt-3 text-caption text-pebble">
            {t.relatorio.verifyNote}
          </p>
        </div>
      ) : (
        <div className="card mt-6">
          <p className="flex items-center gap-2 text-body text-ink">
            <XCircle size={18} className="text-urg-crit" /> {t.relatorio.verifyNotFound}
          </p>
        </div>
      )}

      <Link href="/" className="nav-link mt-8 text-body-sm">
        ← {t.common.backToSite}
      </Link>
    </main>
  );
}
