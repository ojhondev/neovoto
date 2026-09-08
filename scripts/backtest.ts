/**
 * Backtest dos métodos da Matriz Ideológica e da Correlação de Partidos.
 * ====================================================================
 * Roda com dados reais do TSE (Base dos Dados / BigQuery):
 *
 *   npm run backtest -- SP RJ MG      (ou: npx tsx scripts/backtest.ts SP RJ ...)
 *
 * A) MATRIZ — a posição ideológica que o método atribui a cada município
 *    (média das posições dos partidos ponderada pelo voto, escala calibrada
 *    por Bolognesi 2022) deve prever o 2º turno presidencial de 2022 ali.
 *    Preditor: voto PROPORCIONAL (deputado federal 2022, 1º turno).
 *    Alvo:     voto MAJORITÁRIO (presidente 2022, 2º turno) — eleição distinta.
 *
 * B) PARTIDOS — a matriz de correlação (Pearson entre os vetores de voto
 *    municipal dos partidos) deve (1) reproduzir as federações de 2022 como
 *    correlações altas, os polos opostos como correlações negativas, e
 *    (2) recuperar o eixo esquerda-direita no 1º componente principal.
 */
import { createSign } from "node:crypto";
import { config } from "dotenv";
import { votacaoPartidoPorMunicipio } from "@/lib/data-sources/basedosdados";
import { lrDoPartido, BOLOGNESI_2022 } from "@/lib/intel/partidos";

config({ path: ".env.local" });

const DATASET = "basedosdados.br_tse_eleicoes";
const UFS_DEFAULT = ["SP", "RJ", "MG", "BA", "RS", "PE", "PR", "CE", "GO", "PA"];

// ---------- BigQuery mínimo (só para o alvo: presidente 2º turno) ----------
type Row = Record<string, string | null>;
async function accessToken(): Promise<string> {
  const key = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY!) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const si = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(si).sign(key.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${si}.${sig}` }),
  });
  return (await r.json() as { access_token: string }).access_token;
}
async function bq(sql: string): Promise<Row[]> {
  const project = process.env.GCP_PROJECT_ID!;
  const token = await accessToken();
  const auth = { Authorization: `Bearer ${token}` };
  const res = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql, useLegacySql: false, timeoutMs: 120000, maxResults: 20000 }),
  });
  const first = await res.json() as { schema?: { fields: { name: string }[] }; rows?: { f: { v: string | null }[] }[]; pageToken?: string; jobReference?: { jobId: string; location?: string }; error?: unknown };
  if (first.error) throw new Error(JSON.stringify(first.error).slice(0, 300));
  const fields = first.schema?.fields.map((f) => f.name) ?? [];
  const rows = [...(first.rows ?? [])];
  let pageToken = first.pageToken;
  const jobId = first.jobReference?.jobId;
  const location = first.jobReference?.location;
  let guard = 0;
  while (pageToken && jobId && guard++ < 30) {
    const u = new URL(`https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries/${jobId}`);
    u.searchParams.set("pageToken", pageToken);
    u.searchParams.set("maxResults", "20000");
    if (location) u.searchParams.set("location", location);
    const j = await (await fetch(u, { headers: auth })).json() as { rows?: { f: { v: string | null }[] }[]; pageToken?: string };
    if (j.rows) rows.push(...j.rows);
    pageToken = j.pageToken;
  }
  return rows.map((r) => Object.fromEntries(r.f.map((c, i) => [fields[i], c.v])));
}

// ---------- estatística ----------
function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 3) return NaN;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : NaN;
}
function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const idx = xs.map((v, i) => [v, i] as [number, number]).sort((x, y) => x[0] - y[0]);
    const r = new Array(xs.length).fill(0);
    idx.forEach(([, i], k) => (r[i] = k + 1));
    return r;
  };
  return pearson(rank(a), rank(b));
}
/** 1º componente principal de uma matriz simétrica via power iteration. */
function pc1(M: number[][]): number[] {
  const n = M.length;
  let v = new Array(n).fill(1).map(() => Math.random());
  for (let it = 0; it < 200; it++) {
    const nv = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nv[i] += M[i][j] * v[j];
    const norm = Math.hypot(...nv) || 1;
    v = nv.map((x) => x / norm);
  }
  return v;
}

// partidos "fisiológicos" — voto proporcional pouco informativo de ideologia
const FISIOLOGICOS = new Set(["MDB", "PP", "PSD", "UNIÃO", "UNIAO", "REPUBLICANOS", "PROS", "AVANTE", "SOLIDARIEDADE", "PODE", "PODEMOS", "PL"]);

// ---------- A) MATRIZ ----------
async function backtestMatriz(ufs: string[]) {
  console.log("\n" + "=".repeat(70));
  console.log("A) MATRIZ — posição ideológica (voto proporcional) prevê o 2º turno presidencial?");
  console.log("=".repeat(70));

  // alvo: 2º turno 2022 por município (13 = Lula/PT, 22 = Bolsonaro/PL)
  const alvoRows = await bq(
    `SELECT sigla_uf, id_municipio, numero_candidato, SUM(votos) v
     FROM \`${DATASET}.resultados_candidato_municipio\`
     WHERE ano=2022 AND turno=2 AND cargo='presidente' AND sigla_uf IN (${ufs.map((u) => `'${u}'`).join(",")})
     GROUP BY 1,2,3`,
  );
  const bolsoShare = new Map<string, number>(); // code -> share Bolsonaro 0..1
  const tmp = new Map<string, { l: number; b: number }>();
  for (const r of alvoRows) {
    const code = r.id_municipio!;
    const cur = tmp.get(code) ?? { l: 0, b: 0 };
    if (r.numero_candidato === "13") cur.l += Number(r.v);
    if (r.numero_candidato === "22") cur.b += Number(r.v);
    tmp.set(code, cur);
  }
  for (const [code, { l, b }] of tmp) if (l + b > 0) bolsoShare.set(code, b / (l + b));

  const presEsqShareAno = async (ano: number, esq: Set<string>) => {
    const rows = await bq(
      `SELECT id_municipio, numero_candidato, SUM(votos) v
       FROM \`${DATASET}.resultados_candidato_municipio\`
       WHERE ano=${ano} AND turno=1 AND cargo='presidente' AND sigla_uf IN (${ufs.map((u) => `'${u}'`).join(",")})
       GROUP BY 1,2`,
    );
    const acc = new Map<string, { e: number; t: number }>();
    for (const r of rows) {
      const c = acc.get(r.id_municipio!) ?? { e: 0, t: 0 };
      c.t += Number(r.v);
      if (esq.has(r.numero_candidato!)) c.e += Number(r.v);
      acc.set(r.id_municipio!, c);
    }
    const out = new Map<string, number>();
    for (const [code, { e, t }] of acc) if (t > 0) out.set(code, e / t);
    return out;
  };
  // 2022: 13 Lula, 12 Ciro, 21 Boulos*, 80 Kelmon(dir) … esquerda = 13,12,21,16
  const presEsqShare = await presEsqShareAno(2022, new Set(["13", "12", "21", "16"]));
  // 2018: 13 Haddad, 12 Ciro, 50 Boulos, 21 (—), 27 (—) → esquerda = 13,12,50,17? use 13,12,50
  const presEsq2018 = await presEsqShareAno(2018, new Set(["13", "12", "50", "40"]));

  const variantes = [
    "proporcional-2022",
    "prop-sem-fisiologicos",
    "presidencial-1t-2022",
    "blend-2022",
    "presidencial-1t-2018 (out-of-time)",
    "prop-2022 + calib regional",
  ] as const;
  type Variante = (typeof variantes)[number];
  const resultado = Object.fromEntries(
    variantes.map((v) => [v, { c: [] as number[], s: [] as number[] }]),
  ) as Record<Variante, { c: number[]; s: number[] }>;

  // média regional (por UF) do campo proporcional, para o "calib regional"
  const campoUF = new Map<string, number[]>();

  const linhasMun: { uf: string; code: string; sh: number; cP: number | null; cX: number | null; cPres: number | null; cPres18: number | null }[] = [];
  for (const uf of ufs) {
    const vt = await votacaoPartidoPorMunicipio({ ano: 2022, turno: 1, uf, cargo: "deputado federal" });
    const porMun = new Map<string, Map<string, number>>();
    for (const row of vt) {
      if (!porMun.has(row.idMunicipio)) porMun.set(row.idMunicipio, new Map());
      porMun.get(row.idMunicipio)!.set(row.sigla, (porMun.get(row.idMunicipio)!.get(row.sigla) ?? 0) + row.votos);
    }
    for (const [code, votos] of porMun) {
      const sh = bolsoShare.get(code);
      if (sh == null) continue;
      const campoProp = (excl: boolean) => {
        let acc = 0, cls = 0;
        for (const [sigla, v] of votos) {
          if (excl && FISIOLOGICOS.has(sigla)) continue;
          const lr = lrDoPartido(sigla);
          if (lr != null) { acc += v * lr; cls += v; }
        }
        return cls < 50 ? null : acc / cls;
      };
      const cP = campoProp(false);
      const cX = campoProp(true);
      const pe = presEsqShare.get(code);
      const cPres = pe == null ? null : 1 - 2 * pe;
      const pe18 = presEsq2018.get(code);
      const cPres18 = pe18 == null ? null : 1 - 2 * pe18;
      linhasMun.push({ uf, code, sh, cP, cX, cPres, cPres18 });
      if (cP != null) { if (!campoUF.has(uf)) campoUF.set(uf, []); campoUF.get(uf)!.push(cP); }
    }
  }
  const mediaUF = new Map<string, number>();
  for (const [uf, arr] of campoUF) mediaUF.set(uf, arr.reduce((s, v) => s + v, 0) / arr.length);
  const mediaGeral = [...mediaUF.values()].reduce((s, v) => s + v, 0) / mediaUF.size;

  for (const l of linhasMun) {
    const push = (v: Variante, c: number | null) => {
      if (c == null) return;
      resultado[v].c.push(c);
      resultado[v].s.push(l.sh);
    };
    push("proporcional-2022", l.cP);
    push("prop-sem-fisiologicos", l.cX);
    push("presidencial-1t-2022", l.cPres);
    push("blend-2022", l.cP != null && l.cPres != null ? 0.35 * l.cP + 0.65 * l.cPres : null);
    push("presidencial-1t-2018 (out-of-time)", l.cPres18);
    // calib regional: subtrai a média da UF e re-centra na média geral (remove o viés "Nordeste inteiro pra direita")
    push("prop-2022 + calib regional", l.cP != null ? l.cP - (mediaUF.get(l.uf) ?? 0) + mediaGeral : null);
  }

  console.log("\n variante                             | n mun | Pearson r | R²    | acc. direção");
  console.log(" ------------------------------------|-------|-----------|-------|-------------");
  for (const v of variantes) {
    const { c, s } = resultado[v];
    const R = pearson(c, s);
    let ok = 0;
    for (let i = 0; i < c.length; i++) if ((c[i] > 0) === (s[i] > 0.5)) ok++;
    console.log(
      ` ${v.padEnd(35)} | ${String(c.length).padStart(5)} | ${R.toFixed(3).padStart(9)} | ${(R * R).toFixed(3)} | ${((ok / c.length) * 100).toFixed(1)}%`,
    );
  }
}

// ---------- B) PARTIDOS ----------
async function backtestPartidos(ufs: string[], nivel: "municipio" | "uf", cargo = "presidente") {
  console.log("\n" + "=".repeat(70));
  console.log(`B) PARTIDOS — correlação de base (agregação: ${nivel}, pleito: ${cargo})`);
  console.log("=".repeat(70));

  // vetor de voto por partido nas unidades (município ou UF), share dentro da unidade
  const unidades: string[] = [];
  const votoPartUnid = new Map<string, Map<string, number>>(); // sigla -> unidade -> share
  const tamUnid = new Map<string, number>(); // unidade -> log(total de votos)

  for (const uf of ufs) {
    const vt = await votacaoPartidoPorMunicipio({ ano: 2022, turno: 1, uf, cargo });
    const porUnid = new Map<string, Map<string, number>>();
    for (const row of vt) {
      const u = nivel === "uf" ? uf : row.idMunicipio;
      if (!porUnid.has(u)) porUnid.set(u, new Map());
      porUnid.get(u)!.set(row.sigla, (porUnid.get(u)!.get(row.sigla) ?? 0) + row.votos);
    }
    for (const [u, m] of porUnid) {
      const tot = [...m.values()].reduce((s, v) => s + v, 0) || 1;
      if (!unidades.includes(u)) unidades.push(u);
      tamUnid.set(u, Math.log(tot + 1));
      for (const [sigla, v] of m) {
        if (!votoPartUnid.has(sigla)) votoPartUnid.set(sigla, new Map());
        votoPartUnid.get(sigla)!.set(u, v / tot);
      }
    }
  }

  const partidos = [...votoPartUnid.keys()].filter((p) => {
    const cov = votoPartUnid.get(p)!.size / unidades.length;
    return cov > 0.5 && lrDoPartido(p) != null;
  });

  // resíduo da regressão linear de y sobre x (remove o efeito do tamanho)
  const residual = (y: number[], x: number[]) => {
    const n = y.length;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
    const b = sxx > 0 ? sxy / sxx : 0;
    return y.map((v, i) => v - (my + b * (x[i] - mx)));
  };
  const tamVec = unidades.map((u) => tamUnid.get(u) ?? 0);
  const vecRaw = (p: string) => unidades.map((u) => votoPartUnid.get(p)!.get(u) ?? 0);
  const vec = (p: string) => (nivel === "municipio" ? residual(vecRaw(p), tamVec) : vecRaw(p));
  const corr: Record<string, Record<string, number>> = {};
  for (const a of partidos) {
    corr[a] = {};
    for (const b of partidos) corr[a][b] = pearson(vec(a), vec(b));
  }
  if (nivel === "municipio") console.log(" (correlação sobre o RESÍDUO após remover log-tamanho do município)");

  const pares: [string, string, string][] = [
    ["PT", "PCDOB", "Federação Brasil da Esperança"],
    ["PT", "PV", "Federação Brasil da Esperança"],
    ["PCDOB", "PV", "Federação Brasil da Esperança"],
    ["PSDB", "CIDADANIA", "Federação PSDB Cidadania"],
    ["PSOL", "REDE", "Federação PSOL Rede"],
    ["PT", "PL", "polos opostos"],
    ["PT", "NOVO", "polos opostos"],
    ["PSOL", "PL", "polos opostos"],
    ["PL", "REPUBLICANOS", "mesmo campo (direita)"],
  ];
  console.log("\n Par                | esperado         | correlação");
  console.log(" -------------------|------------------|----------");
  for (const [a, b, nota] of pares) {
    const c = corr[a]?.[b];
    console.log(` ${(a + "–" + b).padEnd(18)} | ${nota.padEnd(16)} | ${c == null || Number.isNaN(c) ? "  s/dados" : c.toFixed(3).padStart(8)}`);
  }

  // recuperação do eixo E-D: PC1 da matriz de correlação vs Bolognesi
  const M = partidos.map((a) => partidos.map((b) => (Number.isNaN(corr[a][b]) ? 0 : corr[a][b])));
  let axis = pc1(M);
  // orienta: PT deve ficar do lado negativo
  const iPT = partidos.indexOf("PT");
  if (iPT >= 0 && axis[iPT] > 0) axis = axis.map((x) => -x);
  const bol = partidos.map((p) => BOLOGNESI_2022[p] ?? (lrDoPartido(p)! * 5 + 5));
  const rho = spearman(axis, bol);
  console.log(`\n Recuperação do eixo esquerda-direita (PC1 da correlação × Bolognesi 2022): Spearman ρ = ${rho.toFixed(3)}`);
  const ordenado = partidos.map((p, i) => [p, axis[i]] as [string, number]).sort((x, y) => x[1] - y[1]);
  console.log(" Ordem recuperada (esq→dir): " + ordenado.map(([p]) => p).join(" "));
}

// ---------- main ----------
async function main() {
  const ufs = process.argv.slice(2).filter((a) => /^[A-Z]{2}$/.test(a));
  const alvoUFs = ufs.length ? ufs : UFS_DEFAULT;
  console.log("UFs:", alvoUFs.join(", "));
  await backtestMatriz(alvoUFs);
  await backtestPartidos(alvoUFs, "municipio", "presidente");
  await backtestPartidos(alvoUFs, "uf", "presidente");
  await backtestPartidos(alvoUFs, "municipio", "deputado federal");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
