# AGENTS.md — 3T Engenharia

Instruções para qualquer agente de IA (Claude Code, Codex, Cursor, etc.) trabalhando neste repositório.

**Antes de qualquer tarefa, leia [`HANDOFF.md`](./HANDOFF.md)** — ele tem o estado atual do projeto, o que já foi construído e o que está pendente. Este arquivo (`AGENTS.md`) é sobre *como* trabalhar no código; o `HANDOFF.md` é sobre *onde* o projeto está.

## 🔒 Regra obrigatória — manter o handoff sincronizado

**Toda vez que uma mudança for publicada no GitHub (`git push`), antes de encerrar a tarefa, atualize o `HANDOFF.md`** — sem exceção, mesmo em mudanças pequenas. Adicione uma entrada no topo da seção 6 (linha do tempo) descrevendo o que mudou, e se a mudança criar ou resolver uma pendência/dívida técnica, atualize a seção 7 também.

- Se a mudança estabelecer uma convenção ou padrão de código novo (não estado do projeto), atualize este arquivo (`AGENTS.md`) em vez do `HANDOFF.md` — ou os dois, se for o caso.
- Vários commits pequenos da mesma tarefa podem virar uma única entrada resumida — não é necessário decompor commit por commit (o `git log` já serve pra isso).
- Essa regra vale para **qualquer agente de IA** trabalhando neste repositório, não só Claude Code. Não pule esse passo por achar a mudança "pequena demais" — o objetivo é que este arquivo nunca fique desatualizado em relação ao que está publicado.

## O que é o sistema

Sistema de Gestão Operacional da 3T Engenharia: controle de veículos (viagens, manutenção), ferramentas/almoxarifado (patrimônio, empréstimos, solicitações), rateio de horas, auditorias 5S, e administração (usuários, obras, perfis de acesso).

## Stack

- **Backend**: Fastify + Prisma + Zod + TypeScript, em `backend/`. Módulos em `backend/src/modules/<nome>/{nome.routes,controller,service,schema}.ts`.
- **Frontend**: React + Vite + TypeScript + Tailwind, em `frontend/`. PWA (service worker via `vite-plugin-pwa`).
- **Banco**: PostgreSQL via Prisma. Schema único em `prisma/schema.prisma` (compartilhado, fora de `backend/`).
- **Deploy**: Docker + EasyPanel (self-hosted). Ver seção de deploy no `HANDOFF.md` para os ambientes ativos.

## Padrões de arquitetura

### Domain errors
Cada módulo backend define suas próprias classes de erro (`class XError extends Error { readonly statusCode = N }`), reunidas num array `DOMAIN_ERRORS` no controller, com um helper `rethrowDomain(err)` que relança erros conhecidos para o error handler global. Novo erro de domínio = nova classe + adicionar ao array.

### Controle de acesso (RBAC dinâmico)
Não existe mais enum fixo de 5 roles como fonte de verdade — o sistema usa **perfis de acesso dinâmicos** (`AccessProfile` + `AccessProfilePermission`). Ver `HANDOFF.md` para a explicação completa. Pontos que todo agente precisa saber antes de mexer em rotas:

- Toda rota protegida usa `app.requirePermission(pageKey, 'READ' | 'WRITE')`, nunca o antigo `app.requireRole([...])` (decorator legado, mantido só por compatibilidade, não usar em código novo).
- `pageKey` precisa existir em **dois lugares que não se importam entre si** (backend e frontend são builds separados, sem pacote compartilhado): `backend/src/lib/accessControl.ts` e `frontend/src/lib/accessControl.ts`. Ao adicionar/remover uma página, edite os dois.
- `AccessLevel`: `NONE | READ_OWN | READ_ALL | WRITE_OWN | WRITE_ALL`. Páginas com `supportsOwnScope: false` só usam `NONE/READ_ALL/WRITE_ALL`.
- Perfis com `isAdminType: true` fazem bypass total em `requirePermission` — não dependem de linhas de permissão.
- O perfil `profile_admin_master` é fixo, imutável, indeletável — protegido no `accessProfiles.service.ts`.
- **Página removida do catálogo não deve travar perfis existentes**: `accessProfiles.service.ts` filtra silenciosamente `pageKey`s inválidos ao salvar (não lança erro) — se você remover uma página, perfis antigos que a referenciavam se autolimpam no próximo save, em vez de ficarem permanentemente impossíveis de editar.
- Permissões vêm embutidas no JWT (`request.currentUser.permissions`), resolvidas no login. Mudança de perfil só tem efeito no próximo login (mesmo comportamento que o `role` legado já tinha).
- Endpoints compartilhados por mais de uma tela podem ter o *gate* de leitura acoplado a um `pageKey` diferente do esperado (ex: `GET /assets` é gated por `assets.warehouse.inventory`, não por uma permissão própria da tela que o consome). Ao adicionar uma tela nova que reaproveita um endpoint existente, sempre confira qual `pageKey` realmente protege a rota antes de assumir.

### "Own scope" (dono do registro)
Para rotas com `supportsOwnScope: true`, o controller calcula `ownerEmployeeId = request.accessScope?.isOwnScoped ? request.currentUser.employeeId : undefined` e passa pro service, que filtra/valida contra o dono do registro. Para telas de listagem em lote (ex: Registro Diário), prefira reaproveitar regras de negócio já existentes (ex: isolamento por obra) em vez de inventar uma nova checagem — ver o histórico de decisões no `HANDOFF.md`.

## Deploy — o que todo agente precisa saber antes de mexer

- O `Dockerfile.backend` roda, nesta ordem: `prisma db push --accept-data-loss` → `node prisma/post-migrate.js` → `node dist/server.js`.
- **Não existe `prisma migrate deploy` em produção.** Os arquivos em `prisma/migrations/` são só documentação/histórico — nunca são executados automaticamente. Qualquer seed ou backfill de dados **precisa** viver em `prisma/post-migrate.js`, e precisa ser idempotente (`upsert` com `update: {}` para nunca sobrescrever customização feita pelo gestor).
- `db push` só é seguro para mudanças aditivas (colunas novas opcionais). Mudanças destrutivas (remover coluna, mudar tipo) exigem cuidado extra e não devem ser feitas sem avisar o usuário.
- Existem **dois ambientes EasyPanel ativos simultaneamente**, ambos rastreando o mesmo `main` — ver `HANDOFF.md` para domínios e propósito de cada um. Todo push pode (e frequentemente precisa) ser verificado/disparado manualmente nos dois — o auto-deploy do GitHub (e até disparo manual sem a flag certa) tem se mostrado instável para pelo menos um dos dois serviços em quase todo push recente. **Sempre confirme o commit realmente implantado antes de reportar uma tarefa como concluída** — não confie só no `deploy.status === 'done'` do EasyPanel, isso reflete o último deploy bem-sucedido, não necessariamente um build do commit mais recente (já aconteceu de retornar "done" servindo código de horas atrás). Ao disparar deploy manual, **sempre inclua `forceRebuild:true`** e confira o timestamp no final do log de build — comandos exatos no `HANDOFF.md`.
- Comandos e endpoints reutilizáveis desse runbook estão documentados no `HANDOFF.md`.

## Higiene de Git

- `frontend/node_modules` já foi rastreado por engano no passado e foi removido do índice (`git rm -r --cached`) — nunca use `git add -A` ou `git add .`, sempre liste os arquivos explicitamente.
- Avisos `LF will be replaced by CRLF` durante `git add` são inofensivos (Windows + `core.autocrlf`), pode ignorar.
- Nunca commitar segredos reais (senhas, `JWT_SECRET`, API keys) em nenhum arquivo, nem em documentação — referencie *onde* encontrar a credencial, nunca o valor.

## Armadilhas de TypeScript já encontradas

- `exactOptionalPropertyTypes: true` no backend rejeita passar `undefined` explicitamente em objetos `data:` do Prisma. Padrão de correção: montar um objeto `updateData` (ou `any` quando o campo por campo fica repetitivo demais) e só atribuir a chave `if (body.x !== undefined)`.
- Campos `Decimal` do Prisma (ex: `Asset.acquisitionValue`) precisam de `Number(x)` antes de serializar para JSON.
- Toda rota Fastify com `schema.response` definido **descarta silenciosamente** qualquer campo do objeto retornado que não esteja explicitamente declarado no schema — um campo novo no Prisma/service não aparece na API até ser adicionado também no `response` da rota.
- **Validação de campo obrigatório existe em duas camadas independentes**: o array `required: [...]` do `schema.body` de cada rota (Fastify valida isso via AJV **antes** do handler rodar) e o `.parse()` do Zod dentro do controller. Tornar um campo opcional só no Zod não é suficiente — se ele continuar no `required` do `schema.body` da rota, a requisição é rejeitada com 400 antes mesmo de chegar no Zod. Ao relaxar uma obrigatoriedade, procure os dois lugares.

## Padrões de UI reaproveitáveis

- **Fotos múltiplas (até 4)**: padrão usado em vários lugares (devolução de empréstimo, validação de devolução, cadastro/edição de patrimônio). Fotos são comprimidas no navegador (`compressImage`, canvas + `toDataURL`) e enviadas como base64 (`data:image/...`) — **não há upload para storage externo (S3 etc.), tudo fica salvo como texto no Postgres**. Isso é relevante para qualquer migração de banco: um `pg_dump`/`pg_restore` completo já carrega as fotos junto, não é preciso migrar arquivos separadamente.
- **Manifest do PWA existe em dois lugares que precisam ficar sincronizados**: `frontend/public/manifest.webmanifest` (arquivo estático) e o objeto `manifest: {...}` dentro de `VitePWA({...})` em `frontend/vite.config.ts` — este último é gerado pelo `vite-plugin-pwa` no build e sobrescreve o arquivo estático em `dist/`. Qualquer mudança em nome, ícones, orientação, atalhos etc. precisa ser feita nos dois, senão o valor do build final pode não ser o esperado. Depois de mexer, confirme direto no `dist/manifest.webmanifest` gerado (ou no manifesto servido em produção) antes de dar como concluído.
- **Lightbox de ampliação de foto**: componente inline com `createPortal(..., document.body)` e `z-[210]` (acima do `Dialog`, que usa `z-[200]`). Qualquer novo lightbox dentro de uma tela que também usa `<Dialog>` precisa desse portal + z-index, senão renderiza atrás do modal.
- **PDF client-side**: `pdf-lib`, carregado via `import()` dinâmico para não inchar o bundle principal.

## Antes de reportar uma tarefa como concluída

1. Typecheck dos dois lados (`npx tsc --noEmit` no backend com `--project tsconfig.build.json`, e no frontend).
2. Build de produção do frontend (`npm run build`).
3. Se a mudança tiver efeito visual/comportamental, verificar no navegador quando possível.
4. Se envolver deploy, confirmar o commit realmente implantado nos dois ambientes (ver seção de Deploy acima).
5. **Atualizar `HANDOFF.md`/`AGENTS.md` com o que foi publicado** — obrigatório em todo push, ver regra no topo deste arquivo.
