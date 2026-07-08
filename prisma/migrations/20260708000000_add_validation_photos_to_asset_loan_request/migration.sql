-- Adiciona campos de fotos tiradas pelo gestor do almoxarifado no momento
-- de validar a devolução do bem (dar baixa), independentes das fotos que
-- o colaborador já anexa ao registrar a intenção de devolução.

ALTER TABLE "asset_loan_requests" ADD COLUMN "validation_photo_1" TEXT;
ALTER TABLE "asset_loan_requests" ADD COLUMN "validation_photo_2" TEXT;
ALTER TABLE "asset_loan_requests" ADD COLUMN "validation_photo_3" TEXT;
ALTER TABLE "asset_loan_requests" ADD COLUMN "validation_photo_4" TEXT;
