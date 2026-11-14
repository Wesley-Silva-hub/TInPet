-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('MEETUP', 'ADOPTION_FAIR', 'WALK', 'VACCINATION', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'EVENT_NEARBY';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CANCELLED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "event_id" UUID;

-- CreateTable
CREATE TABLE "pet_events" (
    "id" UUID NOT NULL,
    "organizer_id" UUID NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "description" VARCHAR(1000) NOT NULL DEFAULT '',
    "kind" "EventKind" NOT NULL,
    "species" "Species"[] DEFAULT ARRAY[]::"Species"[],
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "place" VARCHAR(120) NOT NULL,
    "neighborhood" VARCHAR(80) NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "store_reviews" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(500) NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pet_events_starts_at_idx" ON "pet_events"("starts_at");

-- CreateIndex
CREATE INDEX "pet_events_organizer_id_idx" ON "pet_events"("organizer_id");

-- CreateIndex
CREATE INDEX "event_attendees_user_id_idx" ON "event_attendees"("user_id");

-- CreateIndex
CREATE INDEX "store_reviews_store_id_created_at_idx" ON "store_reviews"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "store_reviews_author_id_idx" ON "store_reviews"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_reviews_store_id_author_id_key" ON "store_reviews"("store_id", "author_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "pet_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_events" ADD CONSTRAINT "pet_events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "pet_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_reviews" ADD CONSTRAINT "store_reviews_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_reviews" ADD CONSTRAINT "store_reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Regras que o Prisma não expressa: nota de 1 a 5 e evento que termina depois de começar
ALTER TABLE "store_reviews" ADD CONSTRAINT "store_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "pet_events" ADD CONSTRAINT "pet_events_ends_after_start_check" CHECK ("ends_at" IS NULL OR "ends_at" > "starts_at");

-- CreateIndex
CREATE INDEX "notifications_event_id_idx" ON "notifications"("event_id");
