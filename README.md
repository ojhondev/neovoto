# NeoVoto

**Inteligência política baseada em evidência.** Plataforma analítica que correlaciona
**dados abertos oficiais** (TSE, IBGE, Câmara, Senado, CGU) para apoiar decisões de
estratégia eleitoral e de governabilidade — bilíngue (PT/EN), **LGPD do início ao fim** e
desenhada para **não repetir os erros da Cambridge Analytica**.

## Ferramentas

| Ferramenta | O que faz |
|---|---|
| Mapa de Influência | Rede de atores que movem o eleitorado num território. |
| Matriz Ideológica por Região | Posição de cada região em eixos temáticos. |
| Mapa de Calor de Influência | Onde a candidatura/coligação é forte, fraca ou disputada. |
| Mapa de Propostas | Propostas da candidatura × temas que mobilizam o eleitorado. |
| Cenários Estatísticos | Motor que correlaciona dados para aproximar resultados a partir do objetivo. |
| Coligações | Simula composições e mede o efeito de cada aliança. |

## Stack

Next.js 16 · TypeScript · Tailwind v4 · Drizzle ORM · Neon (Postgres) · Vercel.

## Desenvolvimento

```bash
npm install
npm run dev            # porta 3010
npm run build          # build de produção (typecheck incluso)
npm run lint
npm run db:generate    # gerar migration a partir de src/db/schema.ts
npm run db:migrate     # aplicar migrations
```

Variáveis de ambiente: ver `.env.local.example` (preenchido por `vercel env pull`).

## Documentação

`docs/` — PRD, Arquitetura, Ética, LGPD, Fontes de dados, Design, Roadmap.

## Princípios

- Somente dados abertos oficiais. Sem raspagem de redes sociais, sem data brokers.
- A menor unidade de análise é o território, nunca o indivíduo.
- A plataforma não gera nem dispara mensagens a eleitores.
- Toda métrica é rastreável até a fonte, o recorte e o método.
