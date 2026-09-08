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
import { lrDoPartido, eixoDoPartido, BOLOGNESI_2022 } from "@/lib/intel/partidos";
import { computeBaseCandidato, type CampanhaPropria } from "@/lib/intel/base-candidato";
import { computeIFET } from "@/lib/intel/ifet";
import { computeCenarios } from "@/lib/intel/cenarios";
import type { MunicipioGeo } from "@/lib/geo-math";

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

// ---------- C) BASE DO CANDIDATO ----------
/**
 * O alcance territorial que a Base atribui a cada município (âncora + região
 * imediata + campanhas anteriores + rede do partido), construído SÓ com dado
 * ≤2020, deve prever ONDE o candidato PERFORMOU ACIMA DA MÉDIA (share = voto /
 * válidos a dep. estadual no município) em 2022. É um motor de targeting, não um
 * preditor de contagem de votos — por isso o alvo é share, não voto bruto.
 * Baseline: ranking por população.
 */
function spearmanSafe(a: number[], b: number[]): number {
  const s = spearman(a, b);
  return Number.isNaN(s) ? 0 : s;
}
function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const PARTICULAS = new Set(["de", "da", "do", "dos", "das", "e", "di", "del"]);
function tokens(nome: string): string[] {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !PARTICULAS.has(t));
}
/** true só quando os nomes são idênticos após normalizar (mesmo critério do TSE p/ a pessoa). */
function mesmaPessoa(a: string, b: string): boolean {
  const ta = tokens(a).join(" ");
  const tb = tokens(b).join(" ");
  return ta.length > 0 && ta === tb;
}
function precisionAtK(pred: Map<string, number>, actual: Map<string, number>, k: number): number {
  const top = (m: Map<string, number>) =>
    [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, k).map(([c]) => c);
  const P = new Set(top(pred));
  const A = top(actual);
  return A.filter((c) => P.has(c)).length / Math.max(1, A.length);
}

async function backtestBaseCandidato(ufs: string[]) {
  console.log("\n" + "=".repeat(70));
  console.log("C) BASE DO CANDIDATO — o alcance (só dado ≤2020) prevê onde o candidato");
  console.log("   tirou voto em 2022 (deputado estadual)? Baseline: ranking por população.");
  console.log("=".repeat(70));

  for (const uf of ufs) {
    // geo da UF
    const geoRows = await bq(
      `SELECT id_municipio, nome, id_regiao_imediata, nome_regiao_imediata, id_regiao_intermediaria,
              ST_Y(centroide) lat, ST_X(centroide) lng, 0 AS z
       FROM \`basedosdados.br_bd_diretorios_brasil.municipio\` WHERE sigla_uf='${uf}'`,
    );
    const geo: MunicipioGeo[] = geoRows.map((r) => ({
      code: r.id_municipio!,
      nome: r.nome ?? "",
      regImediata: r.id_regiao_imediata ?? "",
      nomeRegImediata: r.nome_regiao_imediata ?? "",
      regIntermediaria: r.id_regiao_intermediaria ?? "",
      lat: Number(r.lat ?? 0),
      lng: Number(r.lng ?? 0),
    }));
    const geoByCode = new Map(geo.map((g) => [g.code, g]));
    const nomeNorm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const codeByNome = new Map(geo.map((g) => [nomeNorm(g.nome), g.code]));
    const popRows = await bq(
      `SELECT id_municipio, populacao FROM \`basedosdados.br_ibge_populacao.municipio\`
       WHERE sigla_uf='${uf}' AND ano=(SELECT MAX(ano) FROM \`basedosdados.br_ibge_populacao.municipio\` WHERE sigla_uf='${uf}')`,
    );
    const popByCode = new Map(popRows.map((r) => [r.id_municipio!, Number(r.populacao)]));
    // total de votos válidos a dep. estadual 2022 por município (para o alvo em SHARE)
    const validosRows = await bq(
      `SELECT id_municipio, SUM(votos) v FROM \`${DATASET}.resultados_candidato_municipio\`
       WHERE ano=2022 AND turno=1 AND sigla_uf='${uf}' AND cargo='deputado estadual' GROUP BY 1`,
    );
    const validosByCode = new Map(validosRows.map((r) => [r.id_municipio!, Number(r.v)]));

    // candidatos a dep. estadual 2022 na UF com voto relevante
    const alvoRows = await bq(
      `SELECT c.sequencial seq, c.nome nome, c.sigla_partido part,
              c.municipio_nascimento nasc, CAST(c.data_nascimento AS STRING) dn,
              SUM(r.votos) tot
       FROM \`${DATASET}.candidatos\` c
       JOIN \`${DATASET}.resultados_candidato_municipio\` r
         ON r.sequencial_candidato=c.sequencial AND r.ano=2022 AND r.turno=1
       WHERE c.ano=2022 AND c.sigla_uf='${uf}' AND c.cargo='deputado estadual'
       GROUP BY seq, nome, part, nasc, dn
       HAVING tot >= 3000
       ORDER BY tot DESC LIMIT 120`,
    );

    // rede do partido: vereadores eleitos 2020 por município+partido
    const verRows = await bq(
      `SELECT id_municipio, sigla_partido, SUM(votos) v
       FROM \`${DATASET}.resultados_candidato_municipio\`
       WHERE ano=2020 AND turno=1 AND sigla_uf='${uf}' AND cargo='vereador'
         AND LOWER(resultado) LIKE '%eleito%' AND LOWER(resultado) NOT LIKE '%nao%' AND LOWER(resultado) NOT LIKE '%não%'
       GROUP BY 1,2`,
    );
    const eleitosPorPartido = new Map<string, Record<string, number>>();
    for (const r of verRows) {
      const p = (r.sigla_partido ?? "").toUpperCase();
      if (!eleitosPorPartido.has(p)) eleitosPorPartido.set(p, {});
      eleitosPorPartido.get(p)![r.id_municipio!] = Number(r.v);
    }

    // campanhas anteriores (≤2020) dos alvos, por data de nascimento
    const dns = [...new Set(alvoRows.map((r) => r.dn).filter(Boolean))] as string[];
    const priorRows = dns.length
      ? await bq(
          `SELECT c.sequencial seq, c.ano ano, c.cargo cargo, c.nome pnome, CAST(c.data_nascimento AS STRING) dn,
                  r.id_municipio code, SUM(r.votos) votos, ANY_VALUE(r.resultado) resultado
           FROM \`${DATASET}.candidatos\` c
           JOIN \`${DATASET}.resultados_candidato_municipio\` r
             ON r.sequencial_candidato=c.sequencial AND r.ano=c.ano AND r.turno=1
           WHERE c.sigla_uf='${uf}' AND c.ano<=2020
             AND CAST(c.data_nascimento AS STRING) IN (${dns.map((d) => `'${d}'`).join(",")})
           GROUP BY seq, ano, cargo, pnome, dn, code`,
        )
      : [];
    const priorByDn = new Map<string, Map<string, { ano: number; cargo: string; nome: string; byCode: Record<string, number>; total: number; res: string | null }>>();
    for (const r of priorRows) {
      const dn = r.dn!;
      if (!priorByDn.has(dn)) priorByDn.set(dn, new Map());
      const bySeq = priorByDn.get(dn)!;
      const key = r.seq!;
      if (!bySeq.has(key)) bySeq.set(key, { ano: Number(r.ano), cargo: (r.cargo ?? "").toLowerCase(), nome: r.pnome ?? "", byCode: {}, total: 0, res: r.resultado });
      const c = bySeq.get(key)!;
      c.byCode[r.code!] = (c.byCode[r.code!] ?? 0) + Number(r.votos);
      c.total += Number(r.votos);
    }

    // votação 2022 (alvo) por município, por seq
    const alvoSeqs = alvoRows.map((r) => r.seq!);
    const votes2022 = alvoSeqs.length
      ? await bq(
          `SELECT sequencial_candidato seq, id_municipio code, SUM(votos) v
           FROM \`${DATASET}.resultados_candidato_municipio\`
           WHERE ano=2022 AND turno=1 AND sigla_uf='${uf}' AND cargo='deputado estadual'
             AND sequencial_candidato IN (${alvoSeqs.map((s) => `'${s}'`).join(",")})
           GROUP BY seq, code`,
        )
      : [];
    const actualBySeq = new Map<string, Map<string, number>>();
    for (const r of votes2022) {
      if (!actualBySeq.has(r.seq!)) actualBySeq.set(r.seq!, new Map());
      actualBySeq.get(r.seq!)!.set(r.code!, Number(r.v));
    }

    type Acc = { rhoBase: number[]; rhoPop: number[]; rhoBlend: number[]; p10Base: number[]; p10Pop: number[]; p10Blend: number[] };
    const grp: Record<"local" | "amplo" | "todos", Acc> = {
      local: { rhoBase: [], rhoPop: [], rhoBlend: [], p10Base: [], p10Pop: [], p10Blend: [] },
      amplo: { rhoBase: [], rhoPop: [], rhoBlend: [], p10Base: [], p10Pop: [], p10Blend: [] },
      todos: { rhoBase: [], rhoPop: [], rhoBlend: [], p10Base: [], p10Pop: [], p10Blend: [] },
    };
    let usados = 0;

    for (const a of alvoRows) {
      const dn = a.dn as string | null;
      const campanhas: CampanhaPropria[] = [];
      if (dn && priorByDn.has(dn)) {
        for (const c of priorByDn.get(dn)!.values()) {
          if (Object.keys(c.byCode).length > 0 && mesmaPessoa(a.nome ?? "", c.nome))
            campanhas.push({ ano: c.ano, cargo: c.cargo, byCode: c.byCode, totalVotos: c.total, eleito: /eleito/i.test(c.res ?? "") && !/nao|não/i.test(c.res ?? "") });
        }
      }
      const anchorCode =
        (a.nasc ? codeByNome.get(nomeNorm(a.nasc)) : null) ??
        (campanhas.length
          ? Object.entries(campanhas.sort((x, y) => y.ano - x.ano)[0].byCode).sort((x, y) => y[1] - x[1])[0]?.[0]
          : null) ??
        null;
      if (!anchorCode && campanhas.length === 0) continue; // sem nenhum sinal — não dá pra prever

      const base = computeBaseCandidato({
        anoAlvo: 2022,
        geo,
        campanhas,
        ancoraCode: anchorCode,
        ancoraVia: a.nasc ? "nascimento" : "ultima-campanha",
        baseDeclarada: [],
        eleitosPartido: eleitosPorPartido.get((a.part ?? "").toUpperCase()) ?? {},
        apoiosByCode: {},
        apoiosNomes: [],
      });

      const actual = actualBySeq.get(a.seq!);
      if (!actual || actual.size < 20) continue;
      const codes = geo.map((g) => g.code);
      // alvo = SHARE do candidato (votos / válidos a dep. estadual no município):
      // mede ONDE ele performou acima da média, não onde tem mais gente.
      const yv = codes.map((c) => {
        const val = validosByCode.get(c) ?? 0;
        return val > 200 ? (actual.get(c) ?? 0) / val : 0;
      });
      const baseV = codes.map((c) => base.alcanceByCode[c] ?? 0);
      const popRaw = codes.map((c) => Math.log((popByCode.get(c) ?? 0) + 1));
      // blend por RANK: metade alcance, metade população
      const rank = (xs: number[]) => {
        const idx = xs.map((v, i) => [v, i] as [number, number]).sort((x, y) => x[0] - y[0]);
        const r = new Array(xs.length).fill(0);
        idx.forEach(([, i], k) => (r[i] = k));
        return r;
      };
      const rb = rank(baseV);
      const rp = rank(popRaw);
      const blendV = codes.map((_, i) => 0.5 * rb[i] + 0.5 * rp[i]);

      const actualMap = new Map(codes.map((c, i) => [c, yv[i]]));
      const munProprios = campanhas.reduce((s, c) => s + Object.keys(c.byCode).length, 0);
      const bucket: ("todos" | "local" | "amplo")[] = ["todos", munProprios <= 6 ? "local" : "amplo"];
      for (const g of bucket) {
        grp[g].rhoBase.push(spearmanSafe(baseV, yv));
        grp[g].rhoPop.push(spearmanSafe(popRaw, yv));
        grp[g].rhoBlend.push(spearmanSafe(blendV, yv));
        grp[g].p10Base.push(precisionAtK(new Map(codes.map((c, i) => [c, baseV[i]])), actualMap, 10));
        grp[g].p10Pop.push(precisionAtK(new Map(codes.map((c, i) => [c, popRaw[i]])), actualMap, 10));
        grp[g].p10Blend.push(precisionAtK(new Map(codes.map((c, i) => [c, blendV[i]])), actualMap, 10));
      }
      usados++;
      void geoByCode;
    }

    const mean = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : NaN);
    console.log(`\n ${uf}: ${usados} candidatos (dep. estadual 2022, ≥3k votos, com sinal pré-2022)`);
    for (const g of ["todos", "local", "amplo"] as const) {
      const a = grp[g];
      if (a.rhoBase.length === 0) continue;
      console.log(`\n  [${g}] n=${a.rhoBase.length}   ${g === "local" ? "(≤6 municípios de histórico próprio)" : g === "amplo" ? "(>6 municípios)" : ""}`);
      console.log("                     | Spearman ρ vs voto 2022 | precisão@10");
      console.log("  -------------------|-------------------------|------------");
      console.log(`  Base do Candidato  | ${mean(a.rhoBase).toFixed(3).padStart(23)} | ${(mean(a.p10Base) * 100).toFixed(1)}%`);
      console.log(`  blend 50/50 rank   | ${mean(a.rhoBlend).toFixed(3).padStart(23)} | ${(mean(a.p10Blend) * 100).toFixed(1)}%`);
      console.log(`  baseline população | ${mean(a.rhoPop).toFixed(3).padStart(23)} | ${(mean(a.p10Pop) * 100).toFixed(1)}%`);
    }
  }
}

// ---------- D) CENÁRIOS (Monte Carlo) ----------
/**
 * A distribuição que os Cenários projetam para 2022 — construída SÓ com dado
 * ≤2018/2020 — deve estar CALIBRADA contra o resultado real de 2022.
 *
 * Amostra: candidatos a deputado estadual que disputaram o cargo em 2018 E em
 * 2022 (condiciona em "concorreu de novo", não no voto de 2022). Preditor: voto
 * próprio de 2018 + Base do Candidato (âncora, rede) com dado ≤2020. Barra =
 * corte dos eleitos de 2018 (o que se sabia antes de 2022).
 *
 * Métricas:
 *  - cobertura do IC 80% (p10–p90) — alvo 80% — e do IC 50% (p25–p75) — alvo 50%
 *  - PIT: onde na CDF prevista o resultado real caiu (6 baldes) — deve ser ~plano
 *  - erro % da mediana vs baseline "repete 2018 ± maré"
 *  - Brier da 'chance de eleger' vs Brier da taxa-base
 */
const DUMMY_TXT = Object.fromEntries(
  ["base","favoravel","adverso","premissaBase","premissaMareBoa","premissaLacunas","premissaCompBaixo","premissaMareRuim","premissaAdvConsolida","fatorMare","fatorComparecimento","fatorLacunas"].map((k) => [k, k]),
) as Parameters<typeof computeCenarios>[1];

async function backtestCenariosV2(ufs: string[]) {
  console.log("\n" + "=".repeat(70));
  console.log("D) CENÁRIOS — a distribuição projetada para 2022 (dado ≤2020) está calibrada?");
  console.log("=".repeat(70));

  type Rec = { tier: "A" | "B"; d: { p10: number; p25: number; p50: number; p75: number; p90: number }; pv: number; need: number; actual: number; elected: boolean; base50: number };
  const recs: Rec[] = [];

  for (const uf of ufs) {
    const geoRows = await bq(
      `SELECT id_municipio, nome, id_regiao_imediata, nome_regiao_imediata, id_regiao_intermediaria,
              ST_Y(centroide) lat, ST_X(centroide) lng FROM \`basedosdados.br_bd_diretorios_brasil.municipio\` WHERE sigla_uf='${uf}'`,
    );
    const geo: MunicipioGeo[] = geoRows.map((r) => ({
      code: r.id_municipio!, nome: r.nome ?? "",
      regImediata: r.id_regiao_imediata ?? "", nomeRegImediata: r.nome_regiao_imediata ?? "",
      regIntermediaria: r.id_regiao_intermediaria ?? "", lat: Number(r.lat ?? 0), lng: Number(r.lng ?? 0),
    }));
    const nn = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const codeByNome = new Map(geo.map((g) => [nn(g.nome), g.code]));
    const popRows = await bq(
      `SELECT id_municipio, populacao FROM \`basedosdados.br_ibge_populacao.municipio\`
       WHERE sigla_uf='${uf}' AND ano=(SELECT MAX(ano) FROM \`basedosdados.br_ibge_populacao.municipio\` WHERE sigla_uf='${uf}')`,
    );
    const popByCode = new Map(popRows.map((r) => [r.id_municipio!, Number(r.populacao)]));
    const pibRows = await bq(
      `SELECT id_municipio, pib FROM \`basedosdados.br_ibge_pib.municipio\`
       WHERE sigla_uf='${uf}' AND ano=(SELECT MAX(ano) FROM \`basedosdados.br_ibge_pib.municipio\` WHERE sigla_uf='${uf}')`,
    ).catch(() => []);
    const pibByCode = new Map(pibRows.map((r) => [r.id_municipio!, Number(r.pib)]));

    // eleição de referência: deputado estadual 2018, por partido+município
    const v2018 = await votacaoPartidoPorMunicipio({ ano: 2018, turno: 1, uf, cargo: "deputado estadual" });
    if (v2018.length < 100) { console.log(` ${uf}: sem dados de 2018, pulando`); continue; }
    // corte dos eleitos 2018
    const corte18row = await bq(
      `SELECT MIN(v) c FROM (SELECT sequencial_candidato, SUM(votos) v
        FROM \`${DATASET}.resultados_candidato_municipio\`
        WHERE ano=2018 AND turno=1 AND sigla_uf='${uf}' AND cargo='deputado estadual'
          AND LOWER(resultado) LIKE '%eleito%' AND LOWER(resultado) NOT LIKE '%nao%' AND LOWER(resultado) NOT LIKE '%não%'
        GROUP BY sequencial_candidato)`,
    );
    const corte18 = Number(corte18row[0]?.c ?? 0) || 30000;

    // candidatos que disputaram dep. estadual em 2018 E em 2022 (mesma pessoa: nome + nascimento)
    const dupRows = await bq(
      `WITH c18 AS (
         SELECT CAST(data_nascimento AS STRING) dn, UPPER(nome) nomeU, ANY_VALUE(sequencial) s18 FROM \`${DATASET}.candidatos\`
         WHERE ano=2018 AND sigla_uf='${uf}' AND cargo='deputado estadual' AND data_nascimento IS NOT NULL
         GROUP BY dn, nomeU
       )
       SELECT c.sequencial seq22, c18.s18 seq18, c.nome nome, c.sigla_partido part, c.municipio_nascimento nasc,
              CAST(c.data_nascimento AS STRING) dn,
              SUM(r.votos) tot22,
              MAX(CASE WHEN LOWER(r.resultado) LIKE '%eleito%' AND LOWER(r.resultado) NOT LIKE '%nao%' AND LOWER(r.resultado) NOT LIKE '%não%' THEN 1 ELSE 0 END) el22
       FROM \`${DATASET}.candidatos\` c
       JOIN c18 ON CAST(c.data_nascimento AS STRING)=c18.dn AND UPPER(c.nome)=c18.nomeU
       JOIN \`${DATASET}.resultados_candidato_municipio\` r
         ON r.sequencial_candidato=c.sequencial AND r.ano=2022 AND r.turno=1
       WHERE c.ano=2022 AND c.sigla_uf='${uf}' AND c.cargo='deputado estadual'
       GROUP BY seq22, seq18, nome, part, nasc, dn
       LIMIT 600`,
    );
    if (dupRows.length === 0) { console.log(` ${uf}: 0 candidatos 2018∩2022`); continue; }

    // voto próprio de 2018 (dep. estadual) por município — query dedicada e enxuta
    const seqs18 = [...new Set(dupRows.map((r) => r.seq18).filter(Boolean))] as string[];
    const own18Rows = seqs18.length
      ? await bq(
          `SELECT sequencial_candidato seq, id_municipio code, SUM(votos) v, ANY_VALUE(resultado) res
           FROM \`${DATASET}.resultados_candidato_municipio\`
           WHERE ano=2018 AND turno=1 AND sigla_uf='${uf}' AND cargo='deputado estadual'
             AND sequencial_candidato IN (${seqs18.map((s) => `'${s}'`).join(",")})
           GROUP BY seq, code`,
        )
      : [];
    const own18BySeq = new Map<string, { byCode: Record<string, number>; total: number; res: string | null }>();
    for (const r of own18Rows) {
      const cur = own18BySeq.get(r.seq!) ?? { byCode: {}, total: 0, res: r.res };
      cur.byCode[r.code!] = (cur.byCode[r.code!] ?? 0) + Number(r.v);
      cur.total += Number(r.v);
      own18BySeq.set(r.seq!, cur);
    }

    const dns = [...new Set(dupRows.map((r) => r.dn).filter(Boolean))] as string[];
    // campanhas anteriores ≤2020 — restrito a cargos úteis para a Base (evita truncar a resposta)
    const priorRows = await bq(
      `SELECT c.sequencial seq, c.ano ano, c.cargo cargo, c.nome pnome, CAST(c.data_nascimento AS STRING) dn,
              r.id_municipio code, SUM(r.votos) votos, ANY_VALUE(r.resultado) res
       FROM \`${DATASET}.candidatos\` c
       JOIN \`${DATASET}.resultados_candidato_municipio\` r
         ON r.sequencial_candidato=c.sequencial AND r.ano=c.ano AND r.turno=1
       WHERE c.sigla_uf='${uf}' AND c.ano<=2020
         AND c.cargo IN ('deputado estadual','vereador','prefeito','deputado federal')
         AND CAST(c.data_nascimento AS STRING) IN (${dns.map((d) => `'${d}'`).join(",")})
       GROUP BY seq, ano, cargo, pnome, dn, code`,
    );
    type PriorCamp = CampanhaPropria & { nome: string };
    const priorByDn = new Map<string, PriorCamp[]>();
    const tmp = new Map<string, Map<string, { ano: number; cargo: string; nome: string; byCode: Record<string, number>; total: number; res: string | null }>>();
    for (const r of priorRows) {
      const dn = r.dn!;
      if (!tmp.has(dn)) tmp.set(dn, new Map());
      const bySeq = tmp.get(dn)!;
      if (!bySeq.has(r.seq!)) bySeq.set(r.seq!, { ano: Number(r.ano), cargo: (r.cargo ?? "").toLowerCase(), nome: r.pnome ?? "", byCode: {}, total: 0, res: r.res });
      const c = bySeq.get(r.seq!)!;
      c.byCode[r.code!] = (c.byCode[r.code!] ?? 0) + Number(r.votos);
      c.total += Number(r.votos);
    }
    for (const [dn, bySeq] of tmp) {
      priorByDn.set(dn, [...bySeq.values()].filter((c) => Object.keys(c.byCode).length > 0).map((c) => ({
        ano: c.ano, cargo: c.cargo, nome: c.nome, byCode: c.byCode, totalVotos: c.total,
        eleito: /eleito/i.test(c.res ?? "") && !/nao|não/i.test(c.res ?? ""),
      })));
    }

    // vereadores 2020 eleitos por partido (rede local)
    const verRows = await bq(
      `SELECT id_municipio, sigla_partido, SUM(votos) v FROM \`${DATASET}.resultados_candidato_municipio\`
       WHERE ano=2020 AND turno=1 AND sigla_uf='${uf}' AND cargo='vereador'
         AND LOWER(resultado) LIKE '%eleito%' AND LOWER(resultado) NOT LIKE '%nao%' AND LOWER(resultado) NOT LIKE '%não%' GROUP BY 1,2`,
    );
    const eleitosPart = new Map<string, Record<string, number>>();
    for (const r of verRows) {
      const p = (r.sigla_partido ?? "").toUpperCase();
      if (!eleitosPart.has(p)) eleitosPart.set(p, {});
      eleitosPart.get(p)![r.id_municipio!] = Number(r.v);
    }

    let n = 0;
    let puladosHomonimo = 0;
    for (const a of dupRows) {
      const dn = a.dn as string;
      // voto próprio de 2018 no cargo — da query dedicada (nunca truncada)
      const o18 = a.seq18 ? own18BySeq.get(a.seq18 as string) : undefined;
      const own2018 = o18 && o18.total > 0
        ? { ano: 2018, cargo: "deputado estadual", byCode: o18.byCode, totalVotos: o18.total, eleito: /eleito/i.test(o18.res ?? "") && !/nao|não/i.test(o18.res ?? "") }
        : undefined;
      // outras campanhas ≤2020 (para âncora + camada própria da Base), sem a de dep-est 2018
      const outras: CampanhaPropria[] = (priorByDn.get(dn) ?? [])
        .filter((c) => mesmaPessoa(a.nome ?? "", c.nome) && !(c.cargo === "deputado estadual" && c.ano === 2018))
        .map((c) => ({ ano: c.ano, cargo: c.cargo, byCode: c.byCode, totalVotos: c.totalVotos, eleito: c.eleito }));
      const campanhas: CampanhaPropria[] = own2018 ? [own2018, ...outras] : outras;
      if (!own2018 && campanhas.length === 0) { puladosHomonimo++; continue; }
      const anchorCode =
        (a.nasc ? codeByNome.get(nn(a.nasc)) : null) ??
        (campanhas.length ? Object.entries([...campanhas].sort((x, y) => y.ano - x.ano)[0].byCode).sort((x, y) => y[1] - x[1])[0]?.[0] : null) ??
        null;

      const base = computeBaseCandidato({
        anoAlvo: 2022, geo, campanhas, ancoraCode: anchorCode,
        ancoraVia: a.nasc ? "nascimento" : "ultima-campanha",
        baseDeclarada: [], eleitosPartido: eleitosPart.get((a.part ?? "").toUpperCase()) ?? {},
        apoiosByCode: {}, apoiosNomes: [],
      });
      const ifet = computeIFET(
        geo.map((g) => ({ code: g.code, nome: g.nome, populacao: popByCode.get(g.code) ?? 0, pibTotal: pibByCode.get(g.code) ?? 0, alcance: base.alcanceByCode[g.code], confianca: base.confiancaByCode[g.code] })),
        { modo: base.modo },
      );
      const cen = computeCenarios(
        {
          cargo: "deputado-estadual", partido: (a.part ?? "").toUpperCase(),
          votosCandidatoByCode: own2018?.byCode ?? null,
          alcanceByCode: own2018 ? null : base.alcanceByCode,
          votacaoPartido: v2018.map((r) => ({ idMunicipio: r.idMunicipio, sigla: r.sigla, votos: r.votos })),
          ifetByCode: ifet.byCode,
          populacaoByCode: Object.fromEntries(popByCode),
          nomeByCode: Object.fromEntries(geo.map((g) => [g.code, g.nome])),
          corteEleito: corte18, fracaoPartido: 0.12,
        },
        DUMMY_TXT,
        { sims: 1500 },
      );

      const base50 = own2018
        ? own2018.totalVotos
        : Math.round((base.cobertura || 0.05) * corte18 * 0.5);
      recs.push({
        tier: own2018 ? "A" : "B",
        d: cen.distribuicao, pv: cen.probVitoria, need: cen.votosNecessarios,
        actual: Number(a.tot22), elected: Number(a.el22) === 1, base50,
      });
      n++;
    }
    console.log(` ${uf}: ${n} candidatos (dep. estadual 2018 ∩ 2022) · ${puladosHomonimo} descartados (só dn em comum)`);
  }

  // ---- agregação ----
  const report = (label: string, rs: Rec[]) => {
    if (rs.length < 5) return;
    const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
    const cov = (lo: (r: Rec) => number, hi: (r: Rec) => number) =>
      mean(rs.map((r) => (r.actual >= lo(r) && r.actual <= hi(r) ? 1 : 0)));
    const cov80 = cov((r) => r.d.p10, (r) => r.d.p90);
    const cov50 = cov((r) => r.d.p25, (r) => r.d.p75);
    const belowMed = mean(rs.map((r) => (r.actual <= r.d.p50 ? 1 : 0)));
    // PIT em 6 baldes
    const pit = [0, 0, 0, 0, 0, 0]; // <p10, p10-25, p25-50, p50-75, p75-90, >p90
    for (const r of rs) {
      const a = r.actual, d = r.d;
      if (a < d.p10) pit[0]++;
      else if (a < d.p25) pit[1]++;
      else if (a < d.p50) pit[2]++;
      else if (a < d.p75) pit[3]++;
      else if (a < d.p90) pit[4]++;
      else pit[5]++;
    }
    const pitPct = pit.map((c) => ((c / rs.length) * 100).toFixed(0));
    // erro % da mediana
    const ape = (pred: (r: Rec) => number) =>
      rs.filter((r) => r.actual >= 500).map((r) => Math.abs(pred(r) - r.actual) / r.actual);
    const medApeModel = median(ape((r) => r.d.p50));
    const medApeBase = median(ape((r) => r.base50));
    // Brier da chance de eleger
    const brier = mean(rs.map((r) => (r.pv - (r.elected ? 1 : 0)) ** 2));
    const rate = mean(rs.map((r) => (r.elected ? 1 : 0)));
    const brierBase = mean(rs.map((r) => (rate - (r.elected ? 1 : 0)) ** 2));
    // ρ mediana × real
    const rho = spearmanSafe(rs.map((r) => r.d.p50), rs.map((r) => r.actual));
    // distribuição empírica do "crescimento" real: actual / base50 (só onde base50>200)
    const ratios = rs.filter((r) => r.base50 > 200 && r.actual > 0).map((r) => r.actual / r.base50);
    const logr = ratios.map((x) => Math.log(x));
    const sdLog = Math.sqrt(mean(logr.map((v) => (v - mean(logr)) ** 2)));
    const rs2 = [...ratios].sort((a, b) => a - b);
    const rq = (q: number) => rs2[Math.floor(q * (rs2.length - 1))] ?? NaN;

    console.log(`\n  [${label}] n=${rs.length}`);
    console.log(`   crescimento real (voto22 / base): p10 ${rq(0.1).toFixed(2)}× · p50 ${rq(0.5).toFixed(2)}× · p90 ${rq(0.9).toFixed(2)}×   (sd log = ${sdLog.toFixed(2)})`);
    console.log(`   cobertura IC 80% (p10–p90): ${(cov80 * 100).toFixed(0)}%   (alvo 80%)`);
    console.log(`   cobertura IC 50% (p25–p75): ${(cov50 * 100).toFixed(0)}%   (alvo 50%)`);
    console.log(`   resultado ≤ mediana prevista: ${(belowMed * 100).toFixed(0)}%   (alvo 50%)`);
    console.log(`   PIT [<p10 |p10-25|p25-50|p50-75|p75-90| >p90]: ${pitPct.join("% | ")}%   (ideal 10|15|25|25|15|10)`);
    console.log(`   erro % mediana:  modelo ${(medApeModel * 100).toFixed(0)}%   vs baseline "repete 2018" ${(medApeBase * 100).toFixed(0)}%`);
    console.log(`   Brier 'chance de eleger': ${brier.toFixed(3)}   vs taxa-base ${brierBase.toFixed(3)}   (taxa real de eleição: ${(rate * 100).toFixed(0)}%)`);
    console.log(`   Spearman ρ (mediana prevista × voto real 2022): ${rho.toFixed(3)}`);
  };

  report("todos", recs);
  report("Tier A — tinha voto próprio de dep. estadual 2018", recs.filter((r) => r.tier === "A"));
  report("Tier B — só âncora/rede (sem histórico no cargo)", recs.filter((r) => r.tier === "B"));
}

// ---------- E) MATRIZ + CONTEXTO ----------
/**
 * O ajuste de contexto socioeconômico (renda, escolaridade, urbanização, idade)
 * NÃO pode piorar a previsão do 2º turno presidencial (que valida o eixo
 * econômico). Testa a posição-base (voto por partido) vs. a posição ajustada.
 * Também mede se o contexto abre o eixo de costumes (que o método aditivo
 * comprime).
 */
function pctRank(vals: number[]) {
  const s = [...vals].filter((v) => v > 0).sort((a, b) => a - b);
  const lo = s[Math.floor(s.length * 0.05)] ?? s[0] ?? 0;
  const hi = s[Math.ceil(s.length * 0.95) - 1] ?? s[s.length - 1] ?? 1;
  return (v: number) => (hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 0.5);
}

async function backtestMatrizContexto(ufs: string[]) {
  console.log("\n" + "=".repeat(70));
  console.log("E) MATRIZ + CONTEXTO — o ajuste socioeconômico piora o 2º turno? abre o eixo soc?");
  console.log("=".repeat(70));

  const alvoRows = await bq(
    `SELECT sigla_uf, id_municipio, numero_candidato, SUM(votos) v
     FROM \`${DATASET}.resultados_candidato_municipio\`
     WHERE ano=2022 AND turno=2 AND cargo='presidente' AND sigla_uf IN (${ufs.map((u) => `'${u}'`).join(",")})
     GROUP BY 1,2,3`,
  );
  const alvo = new Map<string, number>(); // code -> share Bolsonaro
  const tmp = new Map<string, { l: number; b: number }>();
  for (const r of alvoRows) {
    const c = tmp.get(r.id_municipio!) ?? { l: 0, b: 0 };
    if (r.numero_candidato === "13") c.l += Number(r.v);
    if (r.numero_candidato === "22") c.b += Number(r.v);
    tmp.set(r.id_municipio!, c);
  }
  for (const [c, { l, b }] of tmp) if (l + b > 0) alvo.set(c, b / (l + b));

  const linhas: { eco: number; soc: number; sh: number; pib: number; esc: number; pop: number; ido: number }[] = [];
  for (const uf of ufs) {
    const [vt, perfil, pop, pib] = await Promise.all([
      votacaoPartidoPorMunicipio({ ano: 2022, turno: 1, uf, cargo: "presidente" }),
      bq(`SELECT id_municipio, SUM(SAFE_CAST(instrucao AS INT64)*eleitores) si, SUM(eleitores) tot,
                 SUM(CASE WHEN grupo_idade IN ('6064','6569','7074','7579','8084','8589','9094','9599','9999') THEN eleitores ELSE 0 END) idosos
          FROM \`${DATASET}.perfil_eleitorado_municipio_zona\` WHERE ano=2022 AND sigla_uf='${uf}' AND instrucao!='0' GROUP BY 1`),
      bq(`SELECT id_municipio, populacao FROM \`basedosdados.br_ibge_populacao.municipio\` WHERE sigla_uf='${uf}' AND ano=(SELECT MAX(ano) FROM \`basedosdados.br_ibge_populacao.municipio\` WHERE sigla_uf='${uf}')`),
      bq(`SELECT id_municipio, pib FROM \`basedosdados.br_ibge_pib.municipio\` WHERE sigla_uf='${uf}' AND ano=(SELECT MAX(ano) FROM \`basedosdados.br_ibge_pib.municipio\` WHERE sigla_uf='${uf}')`).catch(() => []),
    ]);
    const escM = new Map(perfil.map((r) => [r.id_municipio!, Number(r.si) / Math.max(1, Number(r.tot)) / 8]));
    const idoM = new Map(perfil.map((r) => [r.id_municipio!, Number(r.idosos) / Math.max(1, Number(r.tot))]));
    const popM = new Map(pop.map((r) => [r.id_municipio!, Number(r.populacao)]));
    const pibM = new Map(pib.map((r) => [r.id_municipio!, Number(r.pib)]));
    const porMun = new Map<string, Map<string, number>>();
    for (const r of vt) {
      if (!porMun.has(r.idMunicipio)) porMun.set(r.idMunicipio, new Map());
      porMun.get(r.idMunicipio)!.set(r.sigla, (porMun.get(r.idMunicipio)!.get(r.sigla) ?? 0) + r.votos);
    }
    for (const [code, votos] of porMun) {
      const sh = alvo.get(code);
      if (sh == null) continue;
      let ea = 0, sa = 0, cls = 0;
      for (const [sig, v] of votos) {
        const e = eixoDoPartido(sig);
        if (e) { ea += v * e.eco; sa += v * e.soc; cls += v; }
      }
      if (cls < 50) continue;
      const p = popM.get(code) ?? 0;
      linhas.push({
        eco: ea / cls, soc: sa / cls, sh,
        pib: p > 0 ? (pibM.get(code) ?? 0) / p : 0,
        esc: escM.get(code) ?? 0.5, pop: p, ido: idoM.get(code) ?? 0.15,
      });
    }
  }

  const rPib = pctRank(linhas.map((l) => l.pib));
  const rEsc = pctRank(linhas.map((l) => l.esc));
  const rIdo = pctRank(linhas.map((l) => l.ido));
  const rUrb = pctRank(linhas.map((l) => Math.log(l.pop + 1)));

  const target = linhas.map((l) => 2 * l.sh - 1); // -1 Lula .. +1 Bolsonaro
  const ecoBase = linhas.map((l) => l.eco);
  const ecoV3 = linhas.map((l) => l.eco + 0.06 * (rPib(l.pib) - 0.5) * 2); // v3: só renda
  const ecoEsc = linhas.map((l) => l.eco + 0.06 * (rPib(l.pib) - 0.5) * 2 + 0.03 * (rEsc(l.esc) - 0.5) * 2); // descartado
  const socBase = linhas.map((l) => l.soc);
  const socAdj = linhas.map(
    (l) => l.soc - 0.08 * (rEsc(l.esc) - 0.5) * 2 - 0.04 * (rUrb(Math.log(l.pop + 1)) - 0.5) * 2 + 0.04 * (rIdo(l.ido) - 0.5) * 2,
  );
  const sd = (xs: number[]) => {
    const m = xs.reduce((s, v) => s + v, 0) / xs.length;
    return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
  };
  const acc = (pred: number[]) => {
    let ok = 0;
    for (let i = 0; i < pred.length; i++) if ((pred[i] > 0) === (linhas[i].sh > 0.5)) ok++;
    return ok / pred.length;
  };
  console.log(`\n n=${linhas.length} municípios (${ufs.join(", ")})`);
  console.log("\n eixo econômico vs. 2º turno presidencial (alvo: share Bolsonaro):");
  for (const [nome, v] of [
    ["base (só voto por partido)", ecoBase],
    ["v3: + renda (PIB p/c) ±0,06", ecoV3],
    ["+ renda + escolaridade (DESCARTADO)", ecoEsc],
  ] as const) {
    const r = pearson(v, target);
    console.log(`   ${nome.padEnd(38)} r=${r.toFixed(3)}  R²=${(r * r).toFixed(3)}  dir=${(acc(v) * 100).toFixed(1)}%`);
  }
  console.log("\n eixo de costumes — abertura da distribuição (sd):");
  console.log(`   base   sd=${sd(socBase).toFixed(3)}   [${Math.min(...socBase).toFixed(2)} … ${Math.max(...socBase).toFixed(2)}]`);
  console.log(`   v3+ctx sd=${sd(socAdj).toFixed(3)}   [${Math.min(...socAdj).toFixed(2)} … ${Math.max(...socAdj).toFixed(2)}]`);
}

// ---------- main ----------
async function main() {
  const args = process.argv.slice(2);
  const ufs = args.filter((a) => /^[A-Z]{2}$/.test(a));
  const only = args.find((a) => a.startsWith("--only="))?.slice(7);
  const alvoUFs = ufs.length ? ufs : UFS_DEFAULT;
  console.log("UFs:", alvoUFs.join(", "));
  if (!only || only === "matriz") await backtestMatriz(alvoUFs);
  if (!only || only === "partidos") {
    await backtestPartidos(alvoUFs, "municipio", "presidente");
    await backtestPartidos(alvoUFs, "uf", "presidente");
    await backtestPartidos(alvoUFs, "municipio", "deputado federal");
  }
  if (!only || only === "base") await backtestBaseCandidato(ufs.length ? ufs : ["SP", "MG", "RS"]);
  if (!only || only === "cenarios") await backtestCenariosV2(ufs.length ? ufs : ["SP", "MG", "RS"]);
  if (!only || only === "matriz-contexto") await backtestMatrizContexto(alvoUFs);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
