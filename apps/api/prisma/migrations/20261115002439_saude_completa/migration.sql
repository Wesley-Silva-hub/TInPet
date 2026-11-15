-- CreateEnum
CREATE TYPE "HealthRecordKind" AS ENUM ('CONSULTATION', 'EXAM', 'SURGERY', 'WEIGHT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'VACCINE_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'MEDICATION_TODAY';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "dedup_key" VARCHAR(120);

-- CreateTable
CREATE TABLE "pet_medications" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "dosage" VARCHAR(80) NOT NULL DEFAULT '',
    "every_hours" INTEGER NOT NULL,
    "first_dose_at" TIMESTAMP(3) NOT NULL,
    "ends_on" DATE,
    "notes" VARCHAR(300) NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_health_records" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "kind" "HealthRecordKind" NOT NULL,
    "date" DATE NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "notes" VARCHAR(1000) NOT NULL DEFAULT '',
    "clinic" VARCHAR(120) NOT NULL DEFAULT '',
    "weight_grams" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_health_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pet_medications_pet_id_idx" ON "pet_medications"("pet_id");

-- CreateIndex
CREATE INDEX "pet_medications_ends_on_idx" ON "pet_medications"("ends_on");

-- CreateIndex
CREATE INDEX "pet_health_records_pet_id_date_idx" ON "pet_health_records"("pet_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedup_key_key" ON "notifications"("dedup_key");

-- AddForeignKey
ALTER TABLE "pet_medications" ADD CONSTRAINT "pet_medications_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_health_records" ADD CONSTRAINT "pet_health_records_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Regras que o Prisma não expressa
ALTER TABLE "pet_medications" ADD CONSTRAINT "pet_medications_every_hours_check" CHECK ("every_hours" BETWEEN 1 AND 168);
ALTER TABLE "pet_health_records" ADD CONSTRAINT "pet_health_records_weight_check" CHECK ("weight_grams" IS NULL OR "weight_grams" BETWEEN 1 AND 200000);
