-- CreateEnum
CREATE TYPE "LostPetStatus" AS ENUM ('ACTIVE', 'FOUND', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SightingSource" AS ENUM ('APP', 'TAG');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LOST_PET_NEARBY';
ALTER TYPE "NotificationType" ADD VALUE 'LOST_PET_SIGHTING';
ALTER TYPE "NotificationType" ADD VALUE 'LOST_PET_FOUND';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "alert_id" UUID,
ADD COLUMN     "pet_id" UUID;

-- AlterTable
ALTER TABLE "pets" ADD COLUMN     "tag_code" VARCHAR(16);

-- CreateTable
CREATE TABLE "lost_pet_alerts" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "status" "LostPetStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "reward_cents" INTEGER,
    "neighborhood" VARCHAR(80) NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lost_pet_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_sightings" (
    "id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "alert_id" UUID,
    "reporter_id" UUID,
    "source" "SightingSource" NOT NULL,
    "message" VARCHAR(300) NOT NULL,
    "contact" VARCHAR(80) NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_sightings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lost_pet_alerts_status_created_at_idx" ON "lost_pet_alerts"("status", "created_at");

-- CreateIndex
CREATE INDEX "lost_pet_alerts_pet_id_idx" ON "lost_pet_alerts"("pet_id");

-- CreateIndex
CREATE INDEX "pet_sightings_pet_id_created_at_idx" ON "pet_sightings"("pet_id", "created_at");

-- CreateIndex
CREATE INDEX "pet_sightings_alert_id_idx" ON "pet_sightings"("alert_id");

-- CreateIndex
CREATE UNIQUE INDEX "pets_tag_code_key" ON "pets"("tag_code");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "lost_pet_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_pet_alerts" ADD CONSTRAINT "lost_pet_alerts_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lost_pet_alerts" ADD CONSTRAINT "lost_pet_alerts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_sightings" ADD CONSTRAINT "pet_sightings_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_sightings" ADD CONSTRAINT "pet_sightings_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "lost_pet_alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_sightings" ADD CONSTRAINT "pet_sightings_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
