-- CreateEnum
CREATE TYPE "WalkStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'DONE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'WALK_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'WALK_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'WALK_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'WALK_CANCELLED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "walk_id" UUID;

-- CreateTable
CREATE TABLE "walker_profiles" (
    "user_id" UUID NOT NULL,
    "bio" VARCHAR(500) NOT NULL DEFAULT '',
    "price_cents" INTEGER NOT NULL,
    "walk_minutes" INTEGER NOT NULL DEFAULT 30,
    "neighborhoods" VARCHAR(200) NOT NULL DEFAULT '',
    "species" "Species"[] DEFAULT ARRAY['DOG']::"Species"[],
    "weekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "walker_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "walk_requests" (
    "id" UUID NOT NULL,
    "walker_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "pet_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "note" VARCHAR(300) NOT NULL DEFAULT '',
    "response_note" VARCHAR(300) NOT NULL DEFAULT '',
    "status" "WalkStatus" NOT NULL DEFAULT 'REQUESTED',
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "walk_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "walk_requests_walker_id_starts_at_idx" ON "walk_requests"("walker_id", "starts_at");

-- CreateIndex
CREATE INDEX "walk_requests_owner_id_starts_at_idx" ON "walk_requests"("owner_id", "starts_at");

-- CreateIndex
CREATE INDEX "walk_requests_pet_id_idx" ON "walk_requests"("pet_id");

-- CreateIndex
CREATE INDEX "notifications_walk_id_idx" ON "notifications"("walk_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_walk_id_fkey" FOREIGN KEY ("walk_id") REFERENCES "walk_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walker_profiles" ADD CONSTRAINT "walker_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_requests" ADD CONSTRAINT "walk_requests_walker_id_fkey" FOREIGN KEY ("walker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_requests" ADD CONSTRAINT "walk_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "walk_requests" ADD CONSTRAINT "walk_requests_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Regras que o Prisma não expressa
ALTER TABLE "walker_profiles" ADD CONSTRAINT "walker_profiles_price_check" CHECK ("price_cents" BETWEEN 0 AND 100000);
ALTER TABLE "walker_profiles" ADD CONSTRAINT "walker_profiles_minutes_check" CHECK ("walk_minutes" BETWEEN 15 AND 180);
ALTER TABLE "walk_requests" ADD CONSTRAINT "walk_requests_duration_check" CHECK ("duration_minutes" BETWEEN 15 AND 180);
ALTER TABLE "walk_requests" ADD CONSTRAINT "walk_requests_not_self_check" CHECK ("walker_id" <> "owner_id");
