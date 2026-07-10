-- Permite agrupar múltiplas solicitações (uma por unidade/quantidade) criadas
-- juntas em um único pedido com vários tipos de equipamento. Cada unidade
-- continua sendo uma AssetLoanRequest própria (devolução permanece unitária) —
-- batch_id é apenas uma tag de agrupamento para exibição, sem FK.

ALTER TABLE "asset_loan_requests" ADD COLUMN "batch_id" TEXT;

CREATE INDEX "asset_loan_requests_batch_id_idx" ON "asset_loan_requests"("batch_id");
