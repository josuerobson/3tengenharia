-- CreateTable
CREATE TABLE "trip_incidents" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_incidents_trip_id_idx" ON "trip_incidents"("trip_id");

-- AddForeignKey
ALTER TABLE "trip_incidents" ADD CONSTRAINT "trip_incidents_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "vehicle_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
