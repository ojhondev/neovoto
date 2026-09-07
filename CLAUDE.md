@AGENTS.md

## Contexto do projeto

**NeoVoto** — SaaS de inteligência política. Ferramentas obrigatórias: Mapa de Influência,
Matriz Ideológica por Região, Mapa de Calor de Influência, Mapa de Propostas, Cenários
Estatísticos, Coligações. Repo: https://github.com/ojhondev/neovoto · dev na porta 3010.

Visão em `docs/PRD.md`; arquitetura em `docs/ARQUITETURA.md`; limites de ética/LGPD em
`docs/ETICA.md` e `docs/LGPD.md`; fontes oficiais em `docs/FONTES-DE-DADOS.md`; identidade
visual "Maze" em `docs/DESIGN.md`.

O usuário não usa terminal — siga a metodologia de `C:\Users\55149\dev.md`.

## Git: commit, push e deploy automáticos

O usuário já autorizou: toda alteração de código feita neste projeto (nesta e em sessões
futuras) deve ser commitada, enviada para o GitHub (`origin/main`) e publicada em produção
automaticamente, sem pedir confirmação a cada vez.

Fluxo padrão ao concluir uma tarefa que altere código:
1. `npm run build` (typecheck) e `npm run lint`.
2. `git add -A`
3. `git commit -m "<mensagem em português, no imperativo, descrevendo o comportamento>"`
4. `git push origin main`
5. `npx vercel@latest --prod` — obrigatório; não presumir que o push sozinho publica
   (o auto-deploy nativo da Vercel já falhou em silêncio neste tipo de projeto).

Commits pequenos, um por mudança de comportamento. Rebrand/copy em commits separados de
schema/lógica. `.cache/` e `.tmp/` no `.gitignore`. Tudo no disco A:.
