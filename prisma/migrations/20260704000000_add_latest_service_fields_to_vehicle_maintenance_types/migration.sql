-- AlterTable
ALTER TABLE "vehicle_maintenance_types" 
ADD COLUMN "last_service_provider" VARCHAR(120),
ADD COLUMN "last_service_warranty" VARCHAR(60),
ADD COLUMN "last_service_cost" DECIMAL(10, 2),
ADD COLUMN "last_service_notes" TEXT;
