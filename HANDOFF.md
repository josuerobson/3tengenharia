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
  -d '{"json":{"projectName":"<projeto>","serviceName":"3tengenharia-backend","forceRebuild":true}}'
# serviceName: "3tengenharia-backend" ou "3tengenharia-frontend"
```

**Sempre inclua `"forceRebuild":true`.** Sem essa flag, a chamada retorna 200/`done` mesmo quando o EasyPanel decide não rebuildar nada (aparentemente por achar, incorretamente, que o commit não mudou) — o serviço fica servindo código velho mesmo com status "sucesso". Isso já causou pelo menos um caso real: uma correção foi enviada, o endpoint continuou retornando o comportamento antigo, e só depois de disparar com `forceRebuild:true` o build realmente rodou (confirmado pelo timestamp do log de build mudando).

### Como ver logs de build/runtime

```bash
curl -s "https://logs-do-easypanel-logs.5450wp.easypanel.host/<projeto>/<serviceName>/all" \
  -H "Authorization: Bearer <EASYPANEL_API_KEY>"
# resposta: { dados: { deploy: { status, log }, ultimo_erro, container: { log } } }
```

O campo `dados.deploy.log` termina com um timestamp (`### Thu, 16 Jul 2026 12:32:09 GMT`) — **é isso que prova que o build é recente, não o `status: "done"` sozinho**. Um deploy antigo bem-sucedido também mostra `status: "done"`.

### Problema conhecido — causa provável identificada, correção é usar `forceRebuild`

O auto-deploy via webhook do GitHub (e até disparos manuais sem `forceRebuild`) falharam em produzir um build novo em pelo menos um dos dois projetos/serviços em quase todo push desta sessão — confirmado comparando o timestamp do log de build antes/depois de disparar com `forceRebuild:true`. Hipótese: o EasyPanel decide "nada mudou, pular build" com base numa comparação de ref que não está funcionando corretamente pra este projeto. Não confirmado 100% (a causa raiz no lado do EasyPanel não foi investigada), mas o workaround (`forceRebuild:true` + conferir timestamp) resolve na prática. **Sempre verifique o timestamp do build e dispare com `forceRebuild:true` se necessário** — não assuma que o push sozinho, nem um disparo manual sem essa flag, é suficiente.

### Onde ficam as credenciais

Nenhuma credencial real está neste arquivo nem em nenhum outro arquivo versionado. Onde encontrar cada uma:
- **API key do EasyPanel**: fornecida pelo usuário em chat quando necessário, não persiste entre sessões — peça novamente se precisar.
- **Senha do admin inicial (banco zerado)**: gerada por `prisma/post-migrate.js`, variáveis de ambiente `GENESIS_ADMIN_EMAIL`/`GENESIS_ADMIN_PASSWORD` (com fallback padrão hardcoded no próprio arquivo — veja o código, não reproduzido aqui).
- **`DATABASE_URL`, `JWT_SECRET`, etc.**: configurados como variável de ambiente de cada serviço no painel do EasyPanel, não em arquivo.

## 6. Linha do tempo do que foi construído (mais recente primeiro)

- **Hub de Relatórios — Fase 2 (completo)**: os 8 relatórios restantes do documento de especificação original (`Modulos Solicitados/Relatorios Nice 2026.txt`) foram implementados, completando os 12 relatórios previstos. Todos os cards do hub agora abrem um relatório funcional — nenhum "Em breve" restante.
  - **Manutenções Preventivas e Realizadas** (`GET /reports/vehicles/maintenance`, novo): agrega `VehicleMaintenanceType`. Status "Em dia / Requer atenção (≤1000km) / Crítico" segue os limiares **literais do documento**, que são diferentes do sistema de urgência percentual (4 níveis: ok/medium/high/critical) já existente em Alertas de Manutenção (`maintenanceTypes.service.ts`'s `getAlerts`) — são cálculos paralelos, intencionalmente não unificados, pois servem propósitos e públicos diferentes (alerta operacional vs. relatório gerencial pedido com regra própria).
  - **Histórico de Quilometragem por Veículo** (`GET /reports/vehicles/mileage-history`, novo): agrega `VehicleTrip` por veículo+dia, com KM acumulado corrido no período e resumo de média diária de uso por veículo.
  - **Histórico de Uso por Ferramenta** (`GET /reports/assets/usage-history`, novo): agrega `AssetLoanRequest` + `AssetMaintenanceLog` por bem patrimonial (vezes emprestado, total de dias em uso, funcionários que mais utilizaram, contagem de manutenções).
  - **Inventário de Ferramentas e Equipamentos** (`GET /reports/assets/inventory`, novo — **não reaproveita** `GET /assets`): precisa da coluna "Última manutenção" (via `AssetMaintenanceLog` mais recente por bem), que não existe na listagem padrão do Almoxarifado; endpoint dedicado evita modificar uma rota já muito usada só para adicionar um campo específico deste relatório.
  - **Manutenções de Ferramentas** (`GET /reports/assets/maintenance`, novo): agrega `AssetMaintenanceLog`. "Responsável pelo reparo" resolve `reportedByUserId` → `User.email` via *join* manual em lote, porque esse campo **não tem relação FK definida no schema** (é uma string solta) — não dá para usar `include` do Prisma ali.
  - **Resumo Mensal de Rateio de Horas** (`GET /reports/timelogs/monthly-summary`, novo): agrega `TimeLog` por obra+mês, com comparativo de horas ao mês anterior (mesma obra).
  - **Não Conformidades 5S — Pendentes e Resolvidas**: **não criou endpoint novo** — reaproveita `GET /5s/reports` (mesmo padrão de reuso já usado por "Auditoria 5S por Área" na Fase 1), sempre filtrado a `status=NAO_CONFORME`. O documento pede status "Pendente / Em andamento / Resolvida", que **não existe verbatim no schema** — mapeado a partir de `validation`: `AGUARDANDO_AVALIACAO`→Pendente, `REPROVADO`→Em andamento, `APROVADO`→Resolvida. "Evidência de correção" usa presença de fotos como proxy (não há campo de foto pós-correção dedicado no modelo `Audit5S`). Interpretação documentada no cabeçalho de `FiveSNonConformitiesReport.tsx`.
  - **Evolução 5S por Período** (`GET /reports/fiveS/evolution`, novo): agrega `Audit5S` por obra+mês — % de conformidade, contagem de não conformidades, e "correções realizadas" interpretado como não conformidade com `validation=APROVADO` (não existe um estado explícito de "issue resolvida" separado da validação da auditoria em si no schema atual).

  Nenhuma tabela nova — todos os 7 endpoints novos reaproveitam modelos Prisma já existentes, só com agregação nova no `reports.service.ts`.

- **Cancelamento de solicitação de empréstimo pendente**: em "Minhas Solicitações", o colaborador agora pode cancelar uma solicitação que ainda não foi atendida pelo gestor (status `PENDING`). Novo status `CANCELLED` no enum `LoanRequestStatus` do Prisma (mudança aditiva, aplicada via `db push` no deploy — confirmado nos dois ambientes pelo log `"Your database is now in sync with your Prisma schema"`) — **distinto de `REJECTED`** deliberadamente: `REJECTED` fica reservado para um futuro fluxo de rejeição pelo gestor (ainda não implementado, nunca foi usado até hoje), `CANCELLED` é sempre uma ação do próprio solicitante. Novo endpoint `PATCH /assets/requests/:id/cancel`, restrito ao próprio solicitante quando o perfil é own-scoped (mesma checagem de propriedade já usada em `submitReturn`). Botão "Cancelar Solicitação" só aparece em pedidos `PENDING`, com confirmação (`window.confirm`, mesmo padrão de exclusões já usado no resto do sistema) antes de agir.
- **Origem/Destino detalhados no relatório de Utilização de Veículos**: as colunas Origem e Destino agora mostram, em fonte menor abaixo do nome do local, a data/hora do evento (saída = `horarioSaida`/reserva em Nova Viagem, chegada = `horarioChegada`/baixa da viagem) e um link "Google Maps" para a geolocalização GPS registrada em cada ponto (`departureGeolocation`/`arrivalGeolocation` do `VehicleTrip`, já existiam no banco mas não estavam no relatório). Reaproveita o mesmo padrão de link (`google.com/maps/search/?api=1&query=...`) já usado em `TripHistoryPage.tsx`.
- **Hub de Relatórios — Fase 1 (prova de conceito)**: retomada do sistema de relatórios que estava pausado (ver pendência removida na seção 7). Estrutura de 3 níveis definida com o usuário: item "Relatórios" no Sidebar (nível 1) → hub com abas por módulo — Controle de Veículos / Ferramentas e Equipamentos / Rateio de Horas / 5S (nível 2) → grade de cards de relatórios individuais dentro de cada aba (nível 3), mesmo padrão de abas já usado no Almoxarifado. Novo módulo backend `backend/src/modules/reports/` (`reports.routes/controller/service/schema.ts`), registrado com prefixo `/reports`. 4 pageKeys novos, grupo "Relatórios": `reports.vehicles`, `reports.assets`, `reports.timelogs`, `reports.fiveS` — 2 níveis só (Nenhum/Leitura Total), sem "Total Pessoal" (visão gerencial, sem conceito de dono). O administrador libera cada módulo de relatório independentemente no perfil de acesso.

  Fase 1 entrega a infraestrutura completa + 1 relatório funcional por módulo (os demais aparecem como "Em breve" no hub, cadeado visual, aguardando Fase 2):
  - **Utilização de Veículos por Período** (`GET /reports/vehicles/utilization`, novo): agrega `VehicleTrip` + `TripIncident` + `TripFuelRecord`. Campo "Conforme" é calculado comparando o KM inicial de cada viagem com o KM final da viagem anterior do mesmo veículo (ordenado por data) — não existia no banco, foi derivado em memória no service.
  - **Empréstimos Ativos e Pendentes** (`GET /reports/assets/loans`, novo): agrega `AssetLoanRequest`. "Data prevista de devolução" e "Dias em atraso" usam `Worksite.endDate` (data de finalização cadastrada na obra) como referência, exatamente como pedido no documento de especificação — não existe campo de prazo próprio no empréstimo.
  - **Horas Trabalhadas** (`GET /reports/timelogs/worked-hours`, novo): agrega `TimeLog`, retorna linhas + resumo por obra (total de horas no período e média diária).
  - **Auditoria 5S por Área**: **não criou endpoint novo** — reaproveita `GET /5s/reports` (já existia para o Painel de Qualidade), adicionando `reports.fiveS` como pageKey alternativo via `requirePermission(['fiveS.panel', 'reports.fiveS'], 'READ')` (mesmo padrão OR-de-pageKeys usado em vários outros pontos do sistema).

  **Exportação** 100% client-side, reutilizável (`frontend/src/lib/reportExport.ts`): PDF via `pdf-lib` (já era dependência do projeto, tabela paginada em paisagem) e Excel via **`exceljs`** (dependência nova — `xlsx`/SheetJS foi cogitado primeiro mas tem 2 vulnerabilidades de alta severidade sem correção disponível — prototype pollution e ReDoS — então trocado por `exceljs`, que não tem esse problema; `exceljs` carrega só sob demanda via `import()` dinâmico, chunk separado de ~940KB/271KB gzip que não pesa no bundle principal). `SearchableSelect` reaproveitado nos filtros de veículo/obra de cada relatório.

  **Não migrado nesta fase** (ver pendência na seção 7): os 8 relatórios restantes do documento de especificação (Manutenções Preventivas, Histórico de KM, Histórico de Uso por Ferramenta, Inventário, Manutenções de Ferramentas, Resumo Mensal de Rateio, Não Conformidades 5S, Evolução 5S).

  **Verificação**: typecheck + build limpos nos dois lados, confirmado ao vivo nos dois ambientes via conteúdo do bundle servido (a API de status do EasyPanel estava instável no momento do deploy — ver seção 5). **Não testado interativamente logado no navegador** (sem credencial de teste disponível na sessão) — recomendo o usuário conferir o fluxo completo (login → Relatórios → gerar/exportar um relatório) antes de divulgar a funcionalidade.

- **Mesmo fix de filtro por categoria aplicado à alocação em lote**: `BatchAllocateModal.tsx`'s `availableAssetsForRow` tinha o mesmo bug do modal individual (linha abaixo) — listava qualquer bem `AVAILABLE`, sem checar a categoria da solicitação daquela linha. Corrigido para filtrar por `a.categoryId === request?.categoryId` (busca a solicitação pelo `requestId` dentro de `requests`). Agora os dois fluxos de alocação (individual e lote) têm paridade nessa validação.
- **"Alocar Bem e Enviar" agora filtra por categoria da solicitação**: o seletor "Bem Físico a Enviar" listava qualquer bem `AVAILABLE`, independente da categoria pedida pelo solicitante — risco de enviar equipamento de categoria errada. Agora só lista bens com `categoryId` igual ao `categoryId` da solicitação selecionada (`selectedRequestForAllocation.categoryId`).
- **Filtro de categoria quebrado no Inventário Geral + busca adicionada**: o filtro de categoria da aba Inventário Geral (Almoxarifado) comparava `a.category` (enum string legado, ex: `POWER_TOOLS`) com o `id` da categoria dinâmica selecionada no `<select>` — nunca havia correspondência, então escolher qualquer categoria zerava a lista inteira ("Nenhum bem patrimonial encontrado"), mesmo com itens cadastrados naquela categoria. Corrigido para comparar `a.categoryId`. Aproveitado pra trocar o `<select>` nativo pelo `SearchableSelect` (mesmo padrão já usado nos outros seletores de categoria da página), adicionando busca por texto.
- **Busca e categoria no seletor de "Alocar Bem e Enviar"** (Almoxarifado, modal de atender solicitação individual): o `<select>` nativo listava só código + descrição de todos os bens `AVAILABLE`, sem busca por texto e sem mostrar a categoria — difícil de achar o item certo em listas longas, e a categoria (referência mais útil pra quem aloca) não aparecia. Trocado pelo componente reutilizável `SearchableSelect` (já usado no seletor de categoria da mesma página), exibindo `"Código — Categoria"` (`categoryData?.name ?? category`, mesmo fallback usado no resto da página). **Não migrado** (mesmo padrão, mesmo problema, fora do escopo pedido): o seletor equivalente em `BatchAllocateModal.tsx` (fluxo de alocação em lote) continua com `<select>` nativo sem busca/categoria.
- **Obra de Destino passa a ser obrigatória na Solicitação de Equipamento**: campo `destinationWorksiteId` em "Nova Solicitação de Equipamento" (Almoxarifado) permitia envio vazio ("Nenhuma / Almoxarifado"), gerando solicitações sem obra vinculada. Corrigido em 3 camadas: Zod (`createAssetLoanRequestBodySchema` e `createAssetLoanRequestBatchBodySchema` em `assets.schema.ts`, campo passou de `.optional().nullable()` para obrigatório), tipos do `assetsApi` no frontend (`api.ts`) e formulário (`LoanRequestsPage.tsx` — `<select required>`, sem opção vazia, validação explícita antes do submit). As rotas `POST /assets/requests` e `POST /assets/requests/batch` não têm `schema.body.required` no nível do Fastify (só JSDoc/tags), então não havia a armadilha de dupla-camada encontrada antes na "Descrição do Bem".
- **Auditoria completa de acoplamento de pageKey + Nova Viagem respeitando "Total Pessoal" de verdade**: depois do fix de `requirePermission` (linha abaixo), auditei o resto do sistema atrás da mesma classe de bug e achei mais 2 endpoints com o mesmo problema (agora corrigidos, todos usando `requirePermission([...])`):
  - `GET /time-logs/team-allocation`: aceita `timelogs.allocation`, `timelogs.daily` (Registro Diário monta o seletor de equipe com essa rota) OU `timelogs.teams` (tela Equipes usa a mesma rota).
  - `GET/PATCH/DELETE /time-logs` (list/validate/update/delete): aceitam `timelogs.daily` OU `timelogs.report` (Relatório por C.C. não tem endpoint próprio — já era um "pendência conhecida" documentado aqui, agora resolvido).
  - `GET /assets/requests`: aceita `assets.requests` OU `assets.warehouse.fulfillment` (aba Solicitações & Devoluções do Almoxarifado não tem endpoint próprio — mesma coisa, já documentado, agora resolvido).

  Além disso, achei um bug diferente e mais sério: `TripStartPage.tsx` ("Nova Viagem") usava `isManagerOrAdmin` (role **legado**) em 8 pontos pra decidir se mostra o seletor de motorista/funcionários, CNH de terceiros, e se manda `driverEmployeeId` no submit. Um perfil customizado com "Total Pessoal" em Nova Viagem mas role legado `MANAGER_*` (comum — role e perfil de acesso são campos independentes) via a tela inteira como se fosse gestor, **incluindo o seletor com todos os funcionários da empresa**, mesmo estando restrito a si mesmo. O backend já bloqueava a submissão de verdade (`OnlySelfTripCreationAllowedError`) — não era falha de segurança, mas a UI oferecia uma ação que sempre falharia. Trocado por uma única flag `canActForOthers`, derivada de `isOwnScopedPage('vehicles.trips.new')` do novo sistema de perfis, não mais do role legado.

  **Não corrigido nesta rodada** (achado durante a auditoria, mas fora do escopo por ser mais arriscado): `WarehousePage.tsx`, `DailyLogPage.tsx`, `TeamAllocationPage.tsx`, `TeamsPage.tsx` e `ReportPage.tsx` também usam `isManagerOrAdmin`/role legado pra decidir UI. Nenhuma das páginas deles (`assets.warehouse.inventory`, `timelogs.allocation`, `timelogs.teams`, `timelogs.report`) suporta nível "Pessoal" (são 2 níveis só: Nenhum/Leitura Total/Acesso Total) — então o bug específico do usuário (mostrar dados de outros pra um perfil "Total Pessoal") **não se aplica** a essas 5 páginas. O que pode acontecer nelas é o oposto: um perfil customizado com Acesso Total mas role legado não-gestor pode ver a tela **sem** os botões de ação (under-privileged na UI, backend não bloqueia nada de errado). `DailyLogPage.tsx` em especial tem lógica de negócio bem mais nuançada (coordenador por obra, não por indivíduo) que merece uma análise dedicada antes de mexer — não tentei consertar às pressas pra não quebrar o fluxo real que já funciona hoje pra gestores de obra.

- **`requirePermission` aceita array de pageKeys (OR) + Nova Viagem funciona com perfil restrito**: um perfil customizado com só `vehicles.trips.new` (Total Pessoal) e sem `vehicles.trips.history` não conseguia nem abrir a tela "Nova Viagem" — `GET /vehicles/trips` (usado internamente pra checar viagens em andamento antes de abrir uma nova) era gated exclusivamente por `vehicles.trips.history`, e como fazia parte do mesmo `Promise.all` que carregava veículos/obras, a rejeição de uma chamada derrubava as outras que já teriam funcionado. Corrigido em duas frentes: `app.requirePermission` agora aceita `string | string[]` (passa se qualquer uma das pageKeys conceder a capacidade, priorizando a de maior alcance) — `GET /vehicles/trips` passa a aceitar `vehicles.trips.history` OU `vehicles.trips.new`; e `TripStartPage.tsx` ganhou fallback individual em cada chamada do `Promise.all` (mesma classe de robustez já aplicada em `WarehousePage.tsx`). Durante a verificação desse fix foi descoberto o problema do `forceRebuild` (ver seção 5) — o deploy "funcionou" (status done) mas serviu código velho até eu forçar o rebuild.
- **Alocar Equipes aceita qualquer usuário**: a lista de funcionários elegíveis pra alocação de equipe/obra (`listTeamAllocationData` em `time-logs.service.ts`) só mostrava quem tinha role legado `COLLABORATOR`. Removida essa restrição — qualquer usuário ativo com cadastro de funcionário aparece agora (confirmado em produção: 17 → 25 elegíveis). O filtro de quem pode ser o **gestor responsável** pela equipe continua exigindo `MANAGER_WORKSITE` — não foi tocado, só a lista de quem pode ser alocado como membro.
- **Notificações do Header zeradas temporariamente**: o sino tinha 4 notificações mock hardcoded (`INITIAL_NOTIFICATIONS` em `Header.tsx`), nunca ligadas a eventos reais do sistema. Zerado (`[]`), painel mostra "Sem notificações", ícone do sino continua visível sem o badge de contagem. **Pendência**: definir quais eventos reais devem gerar notificação e como (ver seção 7).
- **Descrição do Bem deixou de ser obrigatória** no cadastro/edição de patrimônio no Almoxarifado. Removida a validação em 3 camadas (frontend, schema JSON da rota Fastify — `required: [...]` na rota, que é validado independentemente do Zod, e Zod). Coluna `description` no banco continua `NOT NULL`; quando omitida, o service persiste string vazia.
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

- **Notificações reais ainda não definidas**: sistema de notificações no Header está zerado (era mock). Falta definir quais eventos do sistema devem gerar notificação (ex: alerta de manutenção, avaria reportada, lançamento pendente de validação — os mesmos tipos que existiam no mock, mas agora precisam vir de dados reais) e como isso é persistido/entregue (endpoint dedicado? polling? websocket?).
- **Migração de dados para o ambiente novo**: ainda não feita. Procedimento já definido em conversa (dump/restore do Postgres, cutover de DNS) mas não executado — aguardando decisão do usuário sobre quando fazer o corte.
- **Auto-deploy instável** (ver seção 5) — causa raiz não investigada.
- **UI de 5 páginas ainda usa role legado em vez do perfil de acesso**: `WarehousePage.tsx`, `DailyLogPage.tsx`, `TeamAllocationPage.tsx`, `TeamsPage.tsx` e `ReportPage.tsx` usam `isManagerOrAdmin`/checagens de `role` legado pra decidir o que mostrar (botões de ação, seletores). Achado numa auditoria (ver seção 6) — não é falha de segurança (o backend já valida certo em todo lugar), mas pode causar UI incorreta pra perfis customizados: botões de escrita escondidos mesmo com permissão (`assets.warehouse.inventory`/`timelogs.allocation`/`timelogs.teams`/`timelogs.report` são 2-níveis só, não têm "Total Pessoal", então o risco aqui é sub-privilégio de UI, não vazamento de dados de terceiros). `DailyLogPage.tsx` merece atenção especial antes de mexer — tem lógica de negócio de coordenador-por-obra bem mais nuançada que as outras, não é uma troca mecânica de `isManagerOrAdmin` por `isOwnScopedPage`.
- **Exclusão de obra**: antes só `ADMIN` podia excluir; hoje qualquer perfil com Acesso Total em "Cadastro de Obras" pode. Mudança deliberada, não comunicada como aviso formal na época além do chat.
- **Hub de Relatórios — não testado interativamente logado no navegador**: os 12 relatórios (Fase 1 + Fase 2, ver seção 6) foram verificados via typecheck, build e confirmação de deploy (bundle/log), mas não há credencial de teste disponível nesta sessão para validar o fluxo real logado (filtros, tabela, exportação PDF/Excel) em cada um dos 12. Recomendo o usuário conferir pelo menos os relatórios que fazem cálculo mais complexo (Manutenções Preventivas, Histórico de KM, Evolução 5S) antes de divulgar aos usuários finais.
- **Sistema de relatórios com IA**: ideia original de relatórios *analíticos com IA* (controle de custo, erros recorrentes de equipe, controle de fraude) segue **pausada** — o Hub de Relatórios da Fase 1 é o sistema de relatórios *gerenciais tabulares* pedido pelo documento de especificação, não usa IA. São pendências distintas.

## 8. Como manter este handoff atualizado

**Regra obrigatória, sem exceção**: toda vez que uma mudança for publicada no GitHub (`git push`), atualize este arquivo antes de encerrar a tarefa — adicione uma entrada no topo da seção 6 descrevendo o que mudou, e se a mudança introduzir ou resolver uma pendência/dívida técnica, atualize a seção 7 também. Isso vale mesmo para mudanças pequenas — não decida sozinho que algo é "trivial demais" para registrar.

Vários commits pequenos que fazem parte da mesma tarefa podem virar uma única entrada resumida — não é necessário detalhar commit por commit (o `git log` já serve pra isso); este arquivo deve responder "o que eu preciso saber que não está óbvio só de ler o código." Se a mudança estabelecer uma convenção de código nova (não estado do projeto), registre no `AGENTS.md` em vez daqui — ou nos dois, se for o caso.

Esta regra vale para qualquer agente de IA trabalhando neste repositório, não só Claude Code.
