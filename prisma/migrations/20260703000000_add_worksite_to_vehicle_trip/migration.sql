-- AlterTable
ALTER TABLE "vehicle_trips" ADD COLUMN "worksite_id" TEXT;

-- CreateIndex
CREATE INDEX "vehicle_trips_worksite_id_idx" ON "vehicle_trips"("worksite_id");

-- AddForeignKey
ALTER TABLE "vehicle_trips" ADD CONSTRAINT "vehicle_trips_worksite_id_fkey" FOREIGN KEY ("worksite_id") REFERENCES "worksites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
