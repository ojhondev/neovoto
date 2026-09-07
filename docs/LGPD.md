# NeoVoto — Conformidade com a LGPD

> Lei nº 13.709/2018. Este documento descreve como a NeoVoto trata dados pessoais e
> por que o desenho do produto evita o tratamento de dados sensíveis de cidadãos.

## 1. Mapa de tratamentos

| Categoria de dado | Titular | Base legal (LGPD) | Onde vive |
|---|---|---|---|
| Cadastro de usuário (nome, e-mail, org, senha com hash) | Equipe de campanha / gabinete (cliente) | **Execução de contrato** (art. 7º, V) | `users`, `organizations` |
| Sessão autenticada | Usuário | Execução de contrato | `sessions` (apenas hash do token) |
| Análises salvas (recorte territorial, parâmetros) | — (sem PII) | — | `analyses` |
| Registro de operações (quem fez o quê) | Usuário | **Cumprimento de obrigação legal** (art. 7º, II) + legítimo interesse na segurança | `audit_log` |
| Dados eleitorais oficiais **agregados** (resultados por seção/zona/município, coligações, propostas de governo) | Não são dados pessoais de cidadão; quando envolvem candidatos/eleitos, são **dados de agente público, já públicos por lei** | **Interesse público** / dados manifestamente tornados públicos pelo titular no exercício de mandato ou candidatura | Tabelas de staging (ingestão) |

## 2. O que a NeoVoto **não** trata

- **Opinião política de cidadão identificado ou identificável** — dado **sensível** (art. 11).
  A LGPD **não admite legítimo interesse** para dado sensível, e a NeoVoto não tem base
  para tratá-lo. Solução: a menor granularidade é sempre territorial/agregada.
- Origem racial/étnica, religião, saúde, vida sexual, genética, biometria — nenhum.
- Dados de redes sociais de pessoas naturais — não coletados.
- Perfis comportamentais individuais — não construídos.

## 3. Princípios da LGPD aplicados (art. 6º)

| Princípio | Aplicação concreta |
|---|---|
| Finalidade | Uso declarado: apoio à decisão estratégica eleitoral e de governo. |
| Adequação | Só dados compatíveis com essa finalidade. |
| Necessidade / minimização | Nenhum campo de PII além do cadastro do usuário. Território ≠ pessoa. |
| Livre acesso | Usuário vê e exporta seus dados de cadastro e suas análises. |
| Qualidade | Fontes oficiais com data de coleta e versão. |
| Transparência | `FONTES-DE-DADOS.md` público; ficha técnica em relatórios. |
| Segurança | Hash scrypt, cookie de sessão assinado (HMAC) e httpOnly, TLS, segredos fora do repo. |
| Prevenção | RIPD antes de cada nova fonte ou tratamento. |
| Não discriminação | Proibido usar as saídas para fins discriminatórios; matriz ideológica opera sobre regiões, nunca pessoas. |
| Responsabilização | `audit_log` + este conjunto de documentos + versionamento. |

## 4. Direitos do titular (usuários da plataforma) — art. 18

Implementar até o fim da fase de auth:
- Confirmação de tratamento e acesso (export JSON do cadastro + análises).
- Correção (edição de perfil).
- Anonimização/eliminação (`users.deletedAt` + expurgo em rotina; `audit_log` retém o
  mínimo por obrigação legal).
- Portabilidade (export estruturado).
- Informação sobre compartilhamento (não há compartilhamento com terceiros para fins de
  marketing; subprocessadores: Vercel (hospedagem), Neon (banco) — listados na política).
- Revogação de consentimento (não se aplica onde a base é contrato; encerramento de conta
  disponível).

## 5. Governança

- **Encarregado (DPO):** a definir antes do beta; canal `privacidade@neovoto.com.br`.
- **RIPD (Relatório de Impacto):** `docs/RIPD.md` (a criar) — um por fonte de dados e por
  tratamento não trivial.
- **Retenção:** cadastro enquanto a conta existir + 6 meses; `audit_log` 24 meses;
  staging de dados oficiais conforme necessidade analítica (dados já públicos).
- **Incidentes:** procedimento de notificação à ANPD e aos titulares em `docs/INCIDENTES.md`
  (a criar).
- **Subprocessadores:** Vercel Inc. (EUA — cláusulas-padrão), Neon (Postgres). Ambos com
  DPA. Região de dados preferencial: EUA/UE; avaliar `sa-east-1` quando disponível.

## 6. Conformidade eleitoral correlata

- Resolução TSE nº 23.610/2019 (propaganda), com alterações de fevereiro e agosto de 2024.
- Resolução TSE nº 23.732/2024 (IA).
- A NeoVoto não faz propaganda, não gera conteúdo para o público, não usa IA generativa
  para produzir peças eleitorais. Qualquer texto gerado por IA dentro da plataforma
  (ex.: resumo de relatório) é rotulado e de uso interno da equipe.
