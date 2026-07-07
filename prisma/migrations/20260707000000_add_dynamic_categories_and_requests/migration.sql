-- AlterType
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'RETURNING';

-- CreateEnum
CREATE TYPE "LoanRequestStatus" AS ENUM ('PENDING', 'LOANED', 'RETURNING', 'RETURNED', 'REJECTED');
CREATE TYPE "ReturnValidationStatus" AS ENUM ('OK', 'OK_WITH_DAMAGE', 'DEFECTIVE');

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_loan_requests" (
    "id" TEXT NOT NULL,
    "requester_employee_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "status" "LoanRequestStatus" NOT NULL DEFAULT 'PENDING',
    "destination_worksite_id" TEXT,
    "request_notes" TEXT,
    "allocated_asset_id" TEXT,
    "checkout_photo_1" TEXT,
    "checkout_photo_2" TEXT,
    "checkout_photo_3" TEXT,
    "checkout_photo_4" TEXT,
    "checkout_notes" TEXT,
    "checkout_at" TIMESTAMP(3),
    "checkout_by_user_id" TEXT,
    "return_notes" TEXT,
    "return_photo_1" TEXT,
    "return_photo_2" TEXT,
    "return_photo_3" TEXT,
    "return_photo_4" TEXT,
    "is_working" BOOLEAN,
    "has_damage" BOOLEAN,
    "returned_at" TIMESTAMP(3),
    "validation_notes" TEXT,
    "validated_at" TIMESTAMP(3),
    "validated_by_user_id" TEXT,
    "validation_status" "ReturnValidationStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_loan_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_name_key" ON "asset_categories"("name");

-- CreateIndex
CREATE INDEX "asset_loan_requests_requester_employee_id_idx" ON "asset_loan_requests"("requester_employee_id");
CREATE INDEX "asset_loan_requests_category_id_idx" ON "asset_loan_requests"("category_id");
CREATE INDEX "asset_loan_requests_status_idx" ON "asset_loan_requests"("status");
CREATE INDEX "asset_loan_requests_allocated_asset_id_idx" ON "asset_loan_requests"("allocated_asset_id");

-- AlterTable assets: adicionar category_id e renomear category antiga para legacy_category
ALTER TABLE "assets" ADD COLUMN "category_id" TEXT;
ALTER TABLE "assets" RENAME COLUMN "category" TO "legacy_category";

-- Inserir categorias padrão iniciais com IDs conhecidos
INSERT INTO "asset_categories" ("id", "name", "is_active", "created_at", "updated_at")
VALUES 
    ('cat_power_tools', 'Ferramentas Elétricas', true, NOW(), NOW()),
    ('cat_hand_tools', 'Ferramentas Manuais', true, NOW(), NOW()),
    ('cat_measurement', 'Medição e Topografia', true, NOW(), NOW()),
    ('cat_safety', 'Segurança do Trabalho', true, NOW(), NOW()),
    ('cat_pneumatic', 'Ferramentas Pneumáticas', true, NOW(), NOW()),
    ('cat_lifting', 'Içamento e Movimentação', true, NOW(), NOW()),
    ('cat_electrical', 'Elétrica e Eletrônica', true, NOW(), NOW()),
    ('cat_other', 'Outros', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Mapear os dados de assets legados para a nova categoria estruturada
UPDATE "assets" SET "category_id" = 'cat_power_tools' WHERE "legacy_category" = 'POWER_TOOLS' OR "legacy_category" = 'Ferramentas Elétricas';
UPDATE "assets" SET "category_id" = 'cat_hand_tools' WHERE "legacy_category" = 'HAND_TOOLS' OR "legacy_category" = 'Ferramentas Manuais';
UPDATE "assets" SET "category_id" = 'cat_measurement' WHERE "legacy_category" = 'MEASUREMENT' OR "legacy_category" = 'Medição e Topografia';
UPDATE "assets" SET "category_id" = 'cat_safety' WHERE "legacy_category" = 'SAFETY' OR "legacy_category" = 'Segurança do Trabalho';
UPDATE "assets" SET "category_id" = 'cat_pneumatic' WHERE "legacy_category" = 'PNEUMATIC' OR "legacy_category" = 'Ferramentas Pneumáticas';
UPDATE "assets" SET "category_id" = 'cat_lifting' WHERE "legacy_category" = 'LIFTING' OR "legacy_category" = 'Içamento e Movimentação';
UPDATE "assets" SET "category_id" = 'cat_electrical' WHERE "legacy_category" = 'ELECTRICAL' OR "legacy_category" = 'Elétrica e Eletrônica';
UPDATE "assets" SET "category_id" = 'cat_other' WHERE "legacy_category" = 'OTHER' OR "legacy_category" = 'Outros' OR "category_id" IS NULL;

-- CreateIndex
CREATE INDEX "assets_category_id_idx" ON "assets"("category_id");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_loan_requests" ADD CONSTRAINT "asset_loan_requests_requester_employee_id_fkey" FOREIGN KEY ("requester_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_loan_requests" ADD CONSTRAINT "asset_loan_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_loan_requests" ADD CONSTRAINT "asset_loan_requests_destination_worksite_id_fkey" FOREIGN KEY ("destination_worksite_id") REFERENCES "worksites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_loan_requests" ADD CONSTRAINT "asset_loan_requests_allocated_asset_id_fkey" FOREIGN KEY ("allocated_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_loan_requests" ADD CONSTRAINT "asset_loan_requests_checkout_by_user_id_fkey" FOREIGN KEY ("checkout_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_loan_requests" ADD CONSTRAINT "asset_loan_requests_validated_by_user_id_fkey" FOREIGN KEY ("validated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
