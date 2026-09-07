# NeoVoto — Arquitetura

## 1. Visão geral

```
                 ┌─────────────────────────────────────────────┐
  Fontes         │  Pipeline de ingestão (fora do request path) │
  oficiais  ───▶ │  clientes tipados → staging stg_* → agregação │ ───▶ tabelas analíticas
  (TSE/IBGE/     │  proveniência: _source, _url, _collected_at   │      por território
   Câmara/       └─────────────────────────────────────────────┘
   Senado/CGU)                                   │
                                                 ▼
                        ┌──────────────────────────────────────┐
   Navegador  ◀────────▶│  Next.js (App Router) na Vercel        │
   (PT/EN)              │  - Server Components: leitura          │
                        │  - Server Actions: auth + análises     │
                        │  - Route Handlers: /api/health, export │
                        └──────────────────────────────────────┘
                                                 │
                                                 ▼
                                     Neon (Postgres serverless)
                                     Drizzle ORM / drizzle-kit
```

## 2. Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Turbopack) |
| Linguagem | TypeScript estrito |
| UI | Tailwind v4 (`@theme` com tokens Maze) + Lucide + SVG próprio para viz |
| Dados | Neon (Postgres) + Drizzle ORM + drizzle-kit (migrations em código) |
| Auth | Cookie de sessão próprio: token opaco + HMAC-SHA256, senha com scrypt |
| i18n | Dicionários `pt`/`en` versionados + cookie `NEOVOTO_LOCALE` + Server Action |
| Infra | Vercel (deploy) + GitHub (`ojhondev/neovoto`) |

## 3. Estrutura de pastas

```
src/
  app/
    layout.tsx                 raiz: fontes, <html lang>, metadata
    page.tsx                   landing (Maze)
    etica/  fontes/            páginas públicas (ética, catálogo de fontes)
    entrar/  criar-conta/      auth (stub na fundação)
    painel/
      layout.tsx               shell do app (sidebar + topbar)
      page.tsx                 dashboard
      mapa-de-influencia/      ┐
      matriz-ideologica/       │ uma rota por ferramenta obrigatória
      mapa-de-calor/           │ (stub navegável com dados ilustrativos)
      mapa-de-propostas/       │
      cenarios/                │
      coligacoes/              ┘
    api/health/route.ts
  components/
    brand/    marketing/    nav/    app/    viz/
  db/
    schema.ts                  Drizzle: organizations, users, sessions, analyses, audit_log
    index.ts                   cliente Neon-HTTP (lazy; não quebra build sem DATABASE_URL)
  lib/
    i18n/                      config, pt, en, index (server), actions
    auth/                      password (scrypt), session (HMAC + cookie)
    data-sources/catalog.ts    catálogo das fontes oficiais
    mock/                      datasets ilustrativos no formato da API real
    tools.ts                   registro das 6 ferramentas (ícone, chave i18n, fontes)
docs/                          PRD, ARQUITETURA, ETICA, LGPD, FONTES-DE-DADOS, DESIGN, ROADMAP
```

## 4. Decisões

- **i18n sem segmento de URL.** Cookie + Server Action + `revalidatePath`. Simples,
  robusto, SEO por `<html lang>` e metadata. Migrar para `[locale]` se surgir necessidade
  de indexação separada.
- **Dados oficiais nunca no request path.** Ingestão é um pipeline separado; o app lê
  tabelas já agregadas. Isso protege contra rate limit das fontes e garante reprodutibilidade.
- **Cliente de banco lazy.** `db` só lança ao ser usado sem `DATABASE_URL` — permite
  `next build` na fundação antes do Neon estar provisionado.
- **"Mockado primeiro".** Cada ferramenta já renderiza com `lib/mock/*` no formato real.
  Trocar mock por cliente real não muda a árvore de componentes.
- **Viz em SVG próprio.** Sem dependência de biblioteca de mapa paga na fundação; o
  choropleth real usará malhas GeoJSON do IBGE renderizadas com projeção simples.
- **Auth próprio antes de provedor externo** (padrão `dev.md`).

## 5. Modelo de dados (fundação)

`organizations` 1—N `users` 1—N `sessions`. `analyses` e `audit_log` referenciam org/usuário.
**Nenhuma tabela de pessoa natural além de `users` (o cliente).** Dados eleitorais entram
em `stg_*` (staging) e tabelas analíticas agregadas — criadas nas migrations da fase de ingestão.

## 6. Pipeline de deploy (`dev.md`)

1. `git push origin main`
2. `npx vercel@latest --prod` (obrigatório — não confiar só no auto-deploy)
3. Migrations aplicadas no destino antes/junto do deploy (`drizzle-kit migrate`).
4. Segredos só no dashboard Vercel / `vercel env pull`.

## 7. Segurança

- Senha: scrypt + salt por usuário.
- Sessão: token aleatório de 32 bytes, cookie `httpOnly`+`secure`+`sameSite=lax`,
  só o **hash** persiste em `sessions`.
- `SESSION_SECRET` fora do repo.
- Sem PII em logs; `audit_log` guarda ação e alvo, não conteúdo.
- CSP e headers de segurança a adicionar em `next.config.ts` antes do beta.
