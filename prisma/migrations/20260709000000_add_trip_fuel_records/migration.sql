-- Registro de abastecimento vinculado a uma viagem de veículo, feito pelo
-- motorista durante o trajeto (hodômetro, cupom fiscal, litros e valor).

CREATE TABLE "trip_fuel_records" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "liters" DECIMAL(10,3) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "odometer_photo" TEXT NOT NULL,
    "receipt_photo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_fuel_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trip_fuel_records_trip_id_idx" ON "trip_fuel_records"("trip_id");

ALTER TABLE "trip_fuel_records" ADD CONSTRAINT "trip_fuel_records_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "vehicle_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
