# NeoVoto — Sistema visual "Trust" (v2)

> Categoria de referência: **plataformas de trust / governança enterprise** (o gênero de
> dashboards claros, com fluxo de workflow, cartões de dado e um verde de "verificado").
> A NeoVoto adota as convenções da categoria — não a cópia de um produto específico —
> aplicadas ao contexto de inteligência eleitoral. Tema **claro** (dark disponível).

## 1. Princípio

Uma **ferramenta de decisão**, densa e calma. O dado vem primeiro: cartões de 1px com
sombra mínima, tipografia sans compacta, uma única cor de ação (verde esmeralda). O
painel é organizado como um fluxo — captura → base → diagnóstico → plano → monitoramento —
e cada número traz seu estatuto de validação (`validado` / `calibrado` / `heurístico`).

## 2. Cores (tokens em `src/app/globals.css` → `@theme`)

| Papel | Token | Claro |
|---|---|---|
| Fundo da página | `--color-canvas` | `#f4f6f7` |
| Cartão / superfície | `--color-surface` | `#ffffff` |
| Superfície recuada | `--color-surface-2` | `#fafbfc` |
| Barra lateral (rail) | `--color-rail` | `#0c0f13` |
| Hairline | `--color-line` | `#e5e8eb` |
| Texto primário | `--color-ink` | `#11151b` |
| Texto de corpo | `--color-body` | `#39424d` |
| Texto secundário | `--color-muted` | `#667180` |
| Rótulos / placeholder | `--color-faint` | `#97a1ad` |
| **Marca — ação** | `--color-brand` | `#11b981` |
| Marca — hover / press | `--color-brand-strong` / `--color-brand-press` | `#0e9e6e` / `#0b8259` |
| Marca — tint (chip, fundo suave) | `--color-brand-tint` | `#e7f7f0` |
| Texto sobre tint | `--color-brand-ink` | `#05563a` |

Status: `--color-ok` (= brand), `--color-warn` `#d98a0b`, `--color-danger` `#d84a4a`,
`--color-info` `#3b7de4`, cada um com um `-tint` correspondente.

Quadrantes do IFET (donut, mapa): `--color-q-priority` (verde), `--color-q-expansion`
(âmbar), `--color-q-stronghold` (azul-índigo), `--color-q-out` (cinza claro).

Tokens legados (`bone`, `paper`, `ink`, `fossil`, `sand`, `ash`, `chartreuse`, …) continuam
definidos e **remapeados** para a paleta nova — o restante do produto segue coerente sem
reescrita página a página.

Tema escuro: `:root[data-theme="dark"]` + `@media (prefers-color-scheme: dark)` — slate
limpo, o verde clareia levemente (`#2ecb8f`).

## 3. Tipografia

**Inter** em tudo (`--font-ui` = `--font-display` = `--font-body`). Sem serifa.

| Classe | Uso | Tamanho / peso |
|---|---|---|
| `.t-hero` | hero do marketing | clamp → 60px / 700 |
| `.t-display` | título de seção grande | clamp → 52px / 700 |
| `.t-heading-lg` | título de página | clamp → 28px / 600 |
| `.t-heading` | título de cartão | 20px / 600 |
| `.t-eyebrow` | rótulo acima do título | 12px / 600, uppercase, tracking 0.06em |

## 4. Componentes

- **`.card`** — `--color-surface`, borda `--color-line` de 1px, `--radius-card` (12px),
  `--shadow-card` (2 sombras muito sutis), padding 20px. `.card-flush` = igual sem padding.
- **`.btn`** — 9×16px, radius 8px, peso 500. `.btn-primary` (verde cheio),
  `.btn-ghost` (branco + borda), `.btn-dark` (tinta).
- **`.pill`** — chip de status arredondado. Variantes: `pill-brand`, `pill-ok`, `pill-warn`,
  `pill-danger`, `pill-info`, `pill-neutral`. `.pill-dot::before` adiciona o ponto.
- **Rail (barra lateral)** — `src/components/app/Sidebar.tsx`. Fundo `--color-rail` escuro,
  texto branco a 60%, item ativo com faixa verde à esquerda + ícone verde. Colapsa para
  64px (só ícones). Grupos: Visão geral / Território / Posicionamento / Projeção.
- **Viz do painel** — `src/components/app/DashboardViz.tsx`: `Donut`, `PipelineBars`,
  `Stepper` (fluxo de workflow: done/current/pending), `Sparkline`. Inline SVG, sem libs.

## 5. Movimento

`.rise` (entrada), `.chart-in`, `.bar-grow`, `.draw-line` (traço do donut/sparkline),
`.poly-in`. Tudo one-shot. `prefers-reduced-motion` reduz a 1ms.

## 6. Escopo entregue

Leva 1: tokens (`globals.css`), shell do painel (rail + header), Dashboard (`/painel`)
reconstruído. Páginas de módulo e marketing herdam a paleta/tipografia nova e serão
repolidas nas próximas levas.
