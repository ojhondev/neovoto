# NeoVoto — instruções para agentes

Plataforma de **inteligência política baseada em evidência** (partidos, candidaturas,
mandatos). Correlaciona **dados abertos oficiais** (TSE, IBGE, Câmara, Senado, CGU) para
decisões eleitorais e de governo. Bilíngue PT/EN. **LGPD do início ao fim.**

## Antes de escrever código

1. Leia `docs/PRD.md` (o quê), `docs/ARQUITETURA.md` (como) e `docs/ETICA.md` +
   `docs/LGPD.md` (limites inegociáveis).
2. Regras de fonte de dados: `docs/FONTES-DE-DADOS.md`. **Somente APIs/datasets oficiais.**
   Sem raspagem de redes sociais, sem data brokers, sem base de terceiros.
3. Design: `docs/DESIGN.md` (sistema "Maze", referência https://maze.co, tema claro).

## Limites de produto (não negociáveis)

- Nunca modele indivíduos. Menor granularidade = território (seção, zona, bairro, município).
- Sem perfil psicográfico/comportamental de eleitor. Sem dado sensível de pessoa natural.
- A NeoVoto **não gera nem dispara mensagens** a eleitores e não produz peça eleitoral.
- Aderência às Resoluções do TSE sobre IA e desinformação: sem deepfake, sem conteúdo
  sintético de pessoas.

## Stack

Next.js 16 (App Router, Server Components/Actions) · TypeScript estrito · Tailwind v4
(`@theme` em `src/app/globals.css`) · Drizzle ORM + Neon · Vercel.

- i18n: `src/lib/i18n` (dicionários `pt`/`en`, cookie `NEOVOTO_LOCALE`, Server Action).
  Toda string visível passa por dicionário.
- Ferramentas: registro em `src/lib/tools.ts`; uma rota por ferramenta em
  `src/app/painel/<id>/`.
- Dados mockados no formato real em `src/lib/mock/` — trocar por cliente real sem mudar a
  árvore de componentes ("mockado primeiro").
- Auth: `src/lib/auth` (scrypt + sessão HMAC). `db` (`src/db/index.ts`) é lazy — não
  quebra build sem `DATABASE_URL`.

## Fluxo

Rodar `npm run build` (typecheck) e `npm run lint` antes de commitar. Migrations pendentes
aplicadas no destino. Ver `CLAUDE.md` para commit/push/deploy.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
