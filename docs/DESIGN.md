# NeoVoto — Sistema visual "Maze"

> Referência de UI/UX: **https://maze.co**. A NeoVoto adota a linguagem editorial da Maze
> — papel cor de osso, serifa apertada, marca-texto chartreuse — trocando a copy e o
> conteúdo para o contexto de inteligência política. Tema **claro**.

## 1. Princípio

Um **jornal de pesquisa**, não um dashboard SaaS. Tela calma, guiada por conteúdo.
Superfícies planas sobre a tela, definidas por cor e hairline de 1px — sem pilha de
sombras. A tipografia carrega o peso visual; ilustração e ícone são coadjuvantes.

## 2. Cores (tokens em `src/app/globals.css` → `@theme`)

| Papel | Token | Valor |
|---|---|---|
| Tela (canvas) | `--color-bone` | `#f5f4f0` |
| Cartão / superfície elevada | `--color-paper` | `#ffffff` |
| Tinta (texto, botão sólido, títulos) | `--color-ink` | `#1c1c1c` |
| Hairline / barra de anúncio | `--color-charcoal` | `#000000` |
| Texto secundário | `--color-fossil` | `#706f6c` |
| Borda de input / desabilitado | `--color-pebble` | `#9e9b94` |
| Meta / anotação | `--color-smoke` | `#3c3c3c` |
| Aba ativa / lift sutil | `--color-sand` | `#eae6e1` |
| Divisor / borda baixa | `--color-ash` | `#d2cec6` |
| **Marca-texto** (badges, tags, globo) | `--color-chartreuse` | `#dbf570` |
| Acento profundo (borda decorativa, sublinhado) | `--color-olive` | `#4b5b0a` |
| Quebra de seção full-bleed | `--color-lavender` | `#b8a3ff` |

**Sinal político** (só em gráficos/legendas, **nunca** como cor de ação):
`--color-signal-left/center/right`, `--color-positive`, `--color-negative`.

### Regras de cor

- `#f5f4f0` é a tela; `#ffffff` só para cartões e inputs que precisam "subir".
- Chartreuse é **pontuação funcional** — uma tag, um badge, o globo. Nunca fundo largo de UI.
- Chartreuse **não é cor de CTA**. A ação é sempre `--color-ink`.
- `#000000` só na barra de anúncio e em hairlines. Texto é `#1c1c1c`.
- Não introduzir novas cores cromáticas além de chartreuse, olive e lavender.

## 3. Tipografia

Maze usa a fonte proprietária **Phonic**. Substitutos livres adotados aqui:

| Uso | Fonte | Peso |
|---|---|---|
| Display / títulos | **Fraunces** (serifa humanista com optical size) | 300 (display), 400 (headings) |
| Corpo | **Newsreader** | 400 |
| UI (nav, labels, tabelas, badges) | **Inter** | 400–600 |

Classes utilitárias em `globals.css`: `.t-hero`, `.t-display`, `.t-heading-lg`,
`.t-heading`, `.t-eyebrow`.

### Regras de tipo

- Todo display e headline em serifa peso **300** — a assinatura Maze é sussurrar com
  serifa leve no tamanho grande, não gritar em sans-serif bold.
- **Tracking apertado** no display: `-0.05em` a `-0.055em`. `line-height` 0.98–1.1.
- Nunca sans-serif bold em headline. Nunca serifa em `line-height` ≥ 1.4 no display.
- Parágrafo de cartão sempre à esquerda; só headline de seção e hero centralizam.
- `.mark` = marca-texto chartreuse atrás de um trecho curto do headline.

## 4. Forma e espaçamento

- Base 4px. `--spacing-section: 80px`. `--page-max: 1200px`.
- Raios: badge `4px`, input `8px`, botão `8px`, cartão `12px`, cartão grande `16px`.
- Densidade confortável. `--card-padding: 24px`.

## 5. Componentes

| Componente | Regra |
|---|---|
| Barra de anúncio | Full-bleed `#000`, texto Inter 13–14px branco, centralizado. |
| Header | `bone/85` + `backdrop-blur`, wordmark + marca, nav Inter 15px, sticky. Link com sublinhado que cresce da esquerda (`.nav-link`). |
| Botão primário (`.btn-primary`) | `#1c1c1c` sólido, texto branco, raio 8px, 12×20px, **sem sombra, sem gradiente**. |
| Botão ghost (`.btn-ghost`) | Transparente, borda 1px `#1c1c1c`, hover `sand`. |
| Cartão (`.card`) | `#fff` + borda 1px `#d2cec6` + raio 12px + 24px. **Sem box-shadow.** |
| Quebra com globo | Full-bleed `#dbf570`, headline serifa 300 centralizada sobre `PixelGlobe` (matriz de pontos). |
| Grid de ferramentas | Cartões colados com `gap-px` sobre fundo `ash` (hairline entre células). |
| Badge/tag | `sand` ou `chartreuse`, Inter 12px, raio 4px, 4×8px. |

## 6. Movimento

- Fade-and-rise ao entrar no viewport (~220–240ms ease-out, translate 10–12px) —
  componente `Reveal`.
- Sublinhado de nav cresce da esquerda (150ms).
- **Sem** parallax, scroll-jacking ou animação decorativa. Globo e washes são estáticos.
- Respeitar `prefers-reduced-motion`.

## 7. Imagem e ícone

- Ícones: Lucide, monoline, `strokeWidth` 1.4–1.6, cor tinta, sem preenchimento.
- Motivo único de escala: `PixelGlobe` (globo em matriz de pontos chartreuse).
- Visualizações de dados em SVG próprio, paleta de sinal (olive → amarelo → laranja →
  `negative`), sobre fundo `#efece5`.

## 8. Marca

O ativo enviado (`public/brand/logo-neovoto.png`) traz o wordmark antigo **"NeoVote"** e a
marca (quadrado tinta + elipse "cédula" vazada). O componente `Logo` reconstrói o wordmark
como **"NeoVoto"** em vetor, mantendo a marca geométrica. **Pendência:** regenerar o PNG/SVG
oficial com o nome correto.
