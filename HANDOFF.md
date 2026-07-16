# HANDOFF.md — 3T Engenharia

> Última atualização: 2026-07-15. Se você é um agente de IA (ou uma nova sessão) começando a trabalhar neste projeto, leia este arquivo inteiro antes de fazer qualquer alteração. Ele existe para que você não precise reconstruir o contexto lendo o histórico completo do repositório.
>
> Para convenções de código e arquitetura (não estado do projeto), ver [`AGENTS.md`](./AGENTS.md).
>
> **🔒 Regra obrigatória para qualquer agente**: toda vez que uma mudança for publicada no GitHub (`git push`), atualize este arquivo (seção 6, e seção 7 se aplicável) antes de encerrar a tarefa — sem exceção, mesmo em mudanças pequenas. Ver seção 8 para o detalhe.

## 1. O que é este sistema

Sistema de Gestão Operacional Integrada da **3T Engenharia**, cobrindo:
- **Controle de Veículos**: viagens, manutenção preventiva, abastecimento
- **Ferramentas & Equipamentos**: patrimônio, almoxarifado, solicitações de empréstimo, devoluções
- **Rateio de Horas**: registro diário de ponto/horas, alocação de equipes, relatórios por centro de custo
- **Auditorias 5S**: qualidade/organização de obras
- **Administração**: usuários, obras, e um sistema de **perfis de acesso dinâmicos** (RBAC) configurável pelo próprio gestor

Cliente final: empresa de engenharia com obras em andamento, colaboradores de campo e gestores.

## 2. Ambientes em produção (⚠️ leia isto com atenção)

Existem **dois ambientes ativos ao mesmo tempo**, ambos apontando para o mesmo repositório GitHub (`josuerobson/3tengenharia`, branch `main`) e ambos com auto-deploy configurado:

| | Ambiente antigo (produção real) | Ambiente novo |
|---|---|---|
| Projeto EasyPanel | `projeto-clientes` | `3tengenharia` |
| Frontend | https://3t.j4sistemas.com.br | https://nice.3tengenharia.com.br |
| Backend | https://3tbackend.j4sistemas.com.br | https://api-nice.3tengenharia.com.br |
| Banco | `3tengenharia-bd` (populado, dados reais) | `3tengenharia-bd` (banco zerado, sem clientes reais ainda) |
| Servidor | servidor compartilhado (hospeda vários outros sistemas de outros clientes) | provisionado para ser o servidor exclusivo deste cliente |
| Status | **é onde o cliente está usando o sistema hoje** | staging/preparação — o plano é este virar o definitivo quando o cliente migrar |

**Por quê dois ambientes**: o cliente está atualmente num servidor compartilhado (múltiplos sistemas de terceiros no mesmo EasyPanel) e, por volume de dados, pretende migrar para um servidor dedicado. O ambiente novo foi criado e configurado do zero (serviços, domínio, banco) como destino dessa migração, mas a migração de dados reais (dump/restore do banco antigo) **ainda não aconteceu** — o ambiente novo hoje só tem um usuário administrador inicial, sem dados de obras/colaboradores/patrimônio reais.

Todo código novo é enviado (`git push`) uma única vez e **deveria** propagar para os dois automaticamente. Na prática, **não conte com isso** — ver seção 5.

## 3. Arquitetura (resumo — detalhes em `AGENTS.md`)

- Backend: Fastify + Prisma + Zod, `backend/src/modules/<nome>/`
- Frontend: React + Vite + Tailwind, PWA, `frontend/src/`
- Banco: PostgreSQL, schema único em `prisma/schema.prisma`
- Deploy: Docker (`Dockerfile.backend`, `Dockerfile.frontend`) via EasyPanel, `db push` (não `migrate deploy`) + `prisma/post-migrate.js` para seed

## 4. Sistema de Perfis de Acesso Dinâmicos (RBAC) — a maior mudança estrutural até aqui

Antes: 5 roles fixas em enum (`ADMIN`, `COLLABORATOR`, `MANAGER_WORKSITE`, `MANAGER_HR`, `MANAGER_WAREHOUSE`), hardcoded no backend.

Agora: o gestor cria **Perfis de Acesso** livremente (tela "Controle de Acesso" em Administração) e marca, página por página, um de 4 níveis:
- **Acesso Total** (`WRITE_ALL`) — livre, inclusive sobre registros de outras pessoas
- **Total Pessoal** (`WRITE_OWN`) — leitura/escrita, só dos próprios registros
- **Leitura Total** (`READ_ALL`) — só consulta, todos os registros
- **Leitura Pessoal** (`READ_OWN`) — só consulta, só os próprios

Nem toda página suporta os 4 níveis — páginas sem conceito de "dono" (ex: Dashboard, Cadastro de Veículos) só têm `NONE`/`READ_ALL`/`WRITE_ALL`.

**Perfil Administrador** é um perfil de sistema: imutável, indeletável, ID fixo `profile_admin_master`, bypass total (`isAdminType: true`) — não depende de linhas de permissão para funcionar, então nunca fica desatualizado quando uma página nova é adicionada.

Os 5 perfis antigos foram recriados como perfis de sistema (mesma paridade de acesso que os roles tinham), e todo usuário existente foi automaticamente vinculado ao perfil correspondente ao seu role legado — o campo `role` no banco continua existindo (compatibilidade), mas não é mais a fonte de verdade de permissão.

O catálogo completo de páginas está em `backend/src/lib/accessControl.ts` (e sua cópia sincronizada manualmente em `frontend/src/lib/accessControl.ts`).

## 5. Deploy — runbook prático

### Como verificar se um deploy realmente propagou

O `deploy.status` do EasyPanel reflete o **último deploy disparado**, não necessariamente o commit mais recente. O jeito confiável:

```bash
# Ver qual commit está de fato rodando em cada serviço
curl -s "https://5450wp.easypanel.host/api/trpc/projects.inspectProject?input=%7B%22json%22%3A%7B%22projectName%22%3A%22<projeto>%22%7D%7D" \
  -H "Authorization: Bearer <EASYPANEL_API_KEY>"
# projectName: "projeto-clientes" ou "3tengenharia"
```

Ou, sem depender da API do EasyPanel (que já se mostrou instável — às vezes retorna 405/502 sem motivo aparente), verificar direto pelo bundle servido:

```bash
BUNDLE=$(curl -s "https://<dominio>/" | grep -oP '(?<=src="/assets/)[^"]+\.js' | head -1)
curl -s "https://<dominio>/assets/$BUNDLE" | grep -c "<algum texto novo do seu diff>"
```

### Como disparar um deploy manual (quando o auto-deploy não propagou)

```bash
curl -s -X POST "https://5450wp.easypanel.host/api/rpc/services/app/deployService" \
  -H "Authorization: Bearer <EASYPANEL_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"json":{"projectName":"<projeto>","serviceName":"3tengenharia-backend"}}'
# serviceName: "3tengenharia-backend" ou "3tengenharia-frontend"
```

### Como ver logs de build/runtime

```bash
curl -s "https://logs-do-easypanel-logs.5450wp.easypanel.host/<projeto>/<serviceName>/all" \
  -H "Authorization: Bearer <EASYPANEL_API_KEY>"
# resposta: { dados: { deploy: { status, log }, ultimo_erro, container: { log } } }
```

### Problema conhecido, não resolvido

O auto-deploy via webhook do GitHub falhou em disparar (para pelo menos um dos dois projetos/serviços) em quase todo push feito nesta sessão — às vezes o backend, às vezes o frontend, às vezes só um dos dois projetos. Causa raiz não investigada (suspeita: configuração do webhook específica desse projeto no EasyPanel, ou rate limit). **Sempre verifique e dispare manualmente se necessário** — não assuma que o push sozinho é suficiente.

### Onde ficam as credenciais

Nenhuma credencial real está neste arquivo nem em nenhum outro arquivo versionado. Onde encontrar cada uma:
- **API key do EasyPanel**: fornecida pelo usuário em chat quando necessário, não persiste entre sessões — peça novamente se precisar.
- **Senha do admin inicial (banco zerado)**: gerada por `prisma/post-migrate.js`, variáveis de ambiente `GENESIS_ADMIN_EMAIL`/`GENESIS_ADMIN_PASSWORD` (com fallback padrão hardcoded no próprio arquivo — veja o código, não reproduzido aqui).
- **`DATABASE_URL`, `JWT_SECRET`, etc.**: configurados como variável de ambiente de cada serviço no painel do EasyPanel, não em arquivo.

## 6. Linha do tempo do que foi construído (mais recente primeiro)

- **Campo de busca no seletor de categoria** (Novo/Editar Item Patrimonial no Almoxarifado): novo componente reutilizável `frontend/src/components/ui/searchable-select.tsx` (sem dependência externa) para substituir `<select>` nativo em listas longas. O mesmo problema (dezenas de categorias num `<select>`) existe em `LoanRequestsPage.tsx` — não migrado ainda, só onde foi pedido.
- **PWA travado em retrato no Android**: `manifest.webmanifest` tinha `orientation: "any"`, fazendo o app instalado (WebAPK) girar pelo sensor do aparelho mesmo com a rotação automática do Android desativada nas configurações do sistema. Corrigido para `"portrait-primary"` nos dois lugares que definem o manifest (`frontend/public/manifest.webmanifest` e o manifest gerado por `vite-plugin-pwa` em `vite.config.ts`, que sobrescreve o arquivo estático no build — os dois precisam ficar sincronizados).
- **Regra obrigatória de sincronização do handoff**: adicionada regra em `HANDOFF.md` e `AGENTS.md` exigindo que todo agente atualize esses arquivos a cada `git push`, sem exceção — ver seção 8.
- **Remoção da "Linha do Tempo de Viagens"** em Alertas de Manutenção (redundante com Histórico de Viagens) — código exclusivo removido, não só escondido.
- **Fotos múltiplas (até 4) + edição de patrimônio** no Almoxarifado: cadastro de item passou de 1 para 4 fotos; nova rota `PATCH /assets/:id` para editar dados cadastrais (não existia antes — só criação). Edição não altera `currentStatus` (isso continua exclusivo dos fluxos de manutenção/empréstimo).
- **Correções de UI no Almoxarifado**: lightbox de fotos de devolução (não ampliava; depois, ampliava atrás do modal — corrigido com portal + z-index).
- **Consolidação Catálogo de Itens → Almoxarifado > Inventário Geral**: página duplicada removida; `GET /assets` re-gated para `assets.warehouse.inventory`; Almoxarifado passou a esconder suas 5 abas individualmente por permissão (antes, qualquer acesso à rota mostrava as 5 abas juntas).
- **Correção de PWA no iOS**: relógio/status bar sobrepondo o header no app instalado como PWA — `env(safe-area-inset-top)` aplicado no Header, Sidebar e drawer mobile.
- **Bootstrap de admin inicial em banco vazio**: `post-migrate.js` agora cria um usuário administrador automaticamente quando o banco está zerado (resolve o problema de "banco novo, ninguém consegue logar"). Guardado por `user.count() === 0`, nunca roda em banco populado.
- **Provisionamento do ambiente novo** (`3tengenharia` no EasyPanel): 3 serviços criados via API (Postgres, backend, frontend), domínios próprios configurados (`nice.3tengenharia.com.br` / `api-nice.3tengenharia.com.br`).
- **Sistema de Perfis de Acesso Dinâmicos (RBAC)** — ver seção 4. Maior entrega desta fase: schema novo (`AccessProfile`/`AccessProfilePermission`), motor de permissões (`requirePermission`), migração de todas as rotas do backend, `AuthContext` com permissões resolvidas, tela "Controle de Acesso", Sidebar com gating por permissão.
- Antes disso (histórico mais distante, ver `git log` para detalhes): fluxo de solicitações/empréstimo de patrimônio com categorias dinâmicas, geração de PDF de relato de defeito, fotos de validação de devolução, registro de abastecimento em viagens, renomeação "Diário de Classe" → "Registro Diário" com lista de Função gerenciável, etc.

## 7. Pendências e dívidas técnicas conhecidas

- **Migração de dados para o ambiente novo**: ainda não feita. Procedimento já definido em conversa (dump/restore do Postgres, cutover de DNS) mas não executado — aguardando decisão do usuário sobre quando fazer o corte.
- **Auto-deploy instável** (ver seção 5) — causa raiz não investigada.
- **Acoplamento `GET /assets/requests` ↔ `assets.requests`**: a listagem é gated por `assets.requests`, mas a ação de atender/validar (aba "Solicitações & Devoluções" no Almoxarifado) é gated por `assets.warehouse.fulfillment` — um perfil customizado com *fulfillment* mas sem *assets.requests* amplo veria a aba vazia em vez de funcional. Mesma classe de bug que foi corrigida para o Catálogo/Inventário, não resolvida aqui ainda.
- **`timelogs.report` e `timelogs.teams`** (páginas "Relatório por C.C." e "Equipes") não têm endpoint de backend próprio — reaproveitam os mesmos endpoints de "Registro Diário" (`timelogs.daily`) e "Alocar Equipes" (`timelogs.allocation`) respectivamente. Não há como dar permissão independente para essas duas páginas hoje sem criar endpoints dedicados.
- **Exclusão de obra**: antes só `ADMIN` podia excluir; hoje qualquer perfil com Acesso Total em "Cadastro de Obras" pode. Mudança deliberada, não comunicada como aviso formal na época além do chat.
- **Sistema de relatórios com IA**: consultoria/análise de ideias já foi feita e apresentada ao usuário (relatórios de controle de custo, erros recorrentes de equipe, controle de fraude), mas a implementação foi **explicitamente pausada** a pedido do usuário para priorizar o RBAC primeiro. Retomar quando solicitado.

## 8. Como manter este handoff atualizado

**Regra obrigatória, sem exceção**: toda vez que uma mudança for publicada no GitHub (`git push`), atualize este arquivo antes de encerrar a tarefa — adicione uma entrada no topo da seção 6 descrevendo o que mudou, e se a mudança introduzir ou resolver uma pendência/dívida técnica, atualize a seção 7 também. Isso vale mesmo para mudanças pequenas — não decida sozinho que algo é "trivial demais" para registrar.

Vários commits pequenos que fazem parte da mesma tarefa podem virar uma única entrada resumida — não é necessário detalhar commit por commit (o `git log` já serve pra isso); este arquivo deve responder "o que eu preciso saber que não está óbvio só de ler o código." Se a mudança estabelecer uma convenção de código nova (não estado do projeto), registre no `AGENTS.md` em vez daqui — ou nos dois, se for o caso.

Esta regra vale para qualquer agente de IA trabalhando neste repositório, não só Claude Code.
