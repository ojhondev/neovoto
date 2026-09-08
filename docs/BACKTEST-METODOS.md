# Backtest dos métodos — Matriz, Correlação de Partidos e Base do Candidato

Script reprodutível: `scripts/backtest.ts`

```
npm run backtest -- [UF...] [--only=matriz|partidos|base]
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

---

## C) Base do Candidato (IFET v2 — eixo de alcance)

**Hipótese:** o `alcanceByCode` que a Base atribui a cada município (âncora +
Região Imediata do IBGE + campanhas próprias anteriores + rede de vereadores do
partido), construído **só com dado ≤ 2020**, deve prever **onde o candidato
performou acima da média** na eleição seguinte.

Amostra: 115 candidatos a **deputado estadual em SP (2022)** com ≥ 3.000 votos e
pelo menos um sinal territorial pré-2022. `npm run backtest -- SP --only=base`.

### Alvo = voto BRUTO por município

| preditor (só dado ≤2020) | Spearman ρ | precisão@10 |
|---|---|---|
| Base do Candidato | 0,49 | 24% |
| baseline (população) | **0,69** | **39%** |

O voto **bruto** de um candidato proporcional segue a **população** — a lista
partidária difunde voto proporcionalmente ao tamanho do município. A Base perde.

### Alvo = SHARE do candidato (voto / válidos a dep. estadual no município)

| UF | preditor (só dado ≤2020) | Spearman ρ | precisão@10 |
|---|---|---|---|
| SP (n=115) | **Base do Candidato** | 0,34 | **18%** (local: 25%) |
| SP | baseline (população) | 0,34 | 4% |
| MG (n=~90) | **Base do Candidato** | **0,40** | **13%** |
| MG | baseline (população) | 0,21 | 3% |
| RS (n=120) | **Base do Candidato** | **0,44** | **29%** (local: 31%) |
| RS | baseline (população) | 0,29 | 5% |
| — | blend 50/50 (rank alcance + rank pop.) | ~0,4 | **7–13%** (pior) |

Contra o alvo certo — **onde o candidato tira mais voto por eleitor**, que é o que
orienta alocação de recurso — a Base acerta o top-10 de municípios **4 a 6× melhor
que a população**, replicado em SP, MG e RS. O `blend` empata ou melhora em ρ mas
**destrói a precisão@10**: misturar população ao sinal local só adiciona ruído ao
targeting.

**Conclusão:** a Base do Candidato **não** é um preditor de contagem de votos — é
um **motor de targeting**. Diz *onde concentrar para render mais voto por real
gasto*, e nisso ela bate a alternativa com folga. É por isso que o IFET v2 usa o
alcance como eixo dominante (não-compensatório) para a **prioridade** e mantém a
população só no eixo de **peso** (quanto voto absoluto está em jogo).

**Limites conhecidos:** ρ 0,34–0,44 é modesto (problema difícil: prever share 2
anos à frente com dado esparso, em disputa de lista); testado em SP/MG/RS, só
dep. estadual 2022; as camadas "rede do partido" e "decaimento por distância" não
foram isoladas uma da outra. Próximo: vereador→prefeito e isolar cada camada.
