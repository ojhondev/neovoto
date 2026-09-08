# Backtest dos métodos — Matriz Ideológica e Correlação de Partidos

Script reprodutível: `scripts/backtest.ts`

```
DOTENV_CONFIG_PATH=.env.local node --import tsx --import dotenv/config scripts/backtest.ts [UF...]
```

Dados: TSE via Base dos Dados / BigQuery. Rodado em 2026-09-08 sobre 10–14 UFs
(SP RJ MG BA RS PE PR CE GO PA SC ES MA PB), ~4.500 municípios.

---

## A) Matriz Ideológica

**Hipótese:** a posição ideológica que o método atribui a um município deve prever
o comportamento eleitoral ideológico ali. Alvo: `share Bolsonaro` no **2º turno
presidencial de 2022** = `v22 / (v13 + v22)`.

| Sinal usado para posicionar o município | Pearson r | R² | acurácia de direção |
|---|---|---|---|
| **Deputado federal 2022, 1º turno (método v1)** | 0,25–0,39 | **0,06–0,15** | **~50%** (acaso) |
| Dep. federal sem partidos fisiológicos | 0,35–0,38 | 0,13–0,15 | ~56% |
| **Presidente 2022, 1º turno** | 0,998 | 0,996 | 97% *(circular — mesma eleição)* |
| Blend 35% prop + 65% presidencial | 0,98 | 0,96 | 88% |
| **Presidente 2018, 1º turno → prevê 2022 (out of time)** | **0,96** | **0,92–0,93** | **~88%** |
| Dep. federal + calibração regional (remove viés por UF) | 0,21–0,25 | 0,04–0,06 | ~50% (piorou) |

**Conclusão:** o método v1 (voto de deputado federal) **não mede ideologia** — no
interior e no Nordeste o voto proporcional é de máquina local. R² 0,06 e acurácia
de direção no nível do acaso. O voto **presidencial de 1º turno** posiciona
corretamente, e a validação vale mesmo **out of time**: a posição derivada de
2018 prevê o 2º turno de 2022 com R² 0,93.

**Ação (matriz-v2):** `MATRIZ_PLEITO` passou de `deputado federal 2022` para
`presidente 2022 · 1º turno`. Ajuste de PIB reduzido de ±0,12 para ±0,06 (tuning
não validado). O gráfico de dispersão ganhou o modo "Espalhar" (posição relativa)
porque o voto presidencial é bimodal — a "dispersão" a mais do proporcional era
ruído, não sinal.

---

## B) Correlação de Partidos ("sobreposição de base")

**Hipótese:** a matriz de correlação (Pearson entre os vetores de voto municipal
dos partidos) deve reproduzir as federações de 2022 como correlações altas e os
polos opostos como correlações negativas; e o 1º componente principal deve
recuperar o eixo esquerda-direita (Spearman vs Bolognesi 2022).

### Pleito proporcional (deputado federal), nível município

| par | esperado | correlação |
|---|---|---|
| PT–PV (federação) | +alto | −0,04 ✗ |
| PSOL–REDE (federação) | +alto | +0,13 (fraco) |
| PT–PL (polos) | −forte | −0,13 ✗ |
| PSOL–PL (polos) | −forte | **+0,20 ✗✗** |
| PC1 × Bolognesi | ρ alto | ρ = −0,17 ✗ |

Residualizar por tamanho do município **não corrige**. No nível município a
correlação capta "partido de cidade grande × partido de cidade grande", não
ideologia — por isso PSOL e PL correlacionam **positivo**.

### Pleito presidencial 2022 (config de produção), nível município

| par | correlação |
|---|---|
| PT–PL | **−0,99** ✓ |
| PT–NOVO | −0,36 ✓ |
| PC1 × Bolognesi | ρ = +0,41 (direção certa, fraco) |

Melhor — mas só cobre os ~11 partidos que lançaram candidato presidencial
(PSOL, PSDB, PV, Cidadania, PP, Republicanos, PSD ficam de fora).

**Conclusão:** a correlação de voto **não é afinidade ideológica** — é
**sobreposição geográfica de base** ("os dois pescam no mesmo lago?"). Com o
pleito presidencial ela é direcionalmente correta (PT–PL = −0,99) e útil para a
matemática de coligação (sobreposição alta = aliado redundante), mas não recupera
bem o eixo ideológico e ignora quem não disputou a Presidência.

**Ação:** manter o cálculo (presidencial), mas rotular explicitamente como
**"sobreposição de base"** e **complementar com a afinidade ideológica da escala
Bolognesi** (`lrDoPartido`), que cobre todos os partidos. A interpretação da
página agora diz, para cada par, se é oposição/sobreposição **territorial** *e*
se é mesmo/oposto **campo ideológico** — duas coisas distintas.
