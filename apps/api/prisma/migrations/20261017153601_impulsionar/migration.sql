-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "headline" VARCHAR(80) NOT NULL,
    "discount_percent" INTEGER,
    "coupon_code" VARCHAR(30),
    "species" "Species"[] DEFAULT ARRAY[]::"Species"[],
    "radius_km" INTEGER NOT NULL DEFAULT 10,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "paused_at" TIMESTAMP(3),
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "coupon_reveals" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_impressions" (
    "promotion_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,

    CONSTRAINT "promotion_impressions_pkey" PRIMARY KEY ("promotion_id","user_id","day")
);

-- CreateIndex
CREATE INDEX "promotions_company_id_idx" ON "promotions"("company_id");

-- CreateIndex
CREATE INDEX "promotions_ends_at_starts_at_idx" ON "promotions"("ends_at", "starts_at");

-- CreateIndex
CREATE INDEX "promotions_product_id_idx" ON "promotions"("product_id");

-- CreateIndex
CREATE INDEX "promotion_impressions_user_id_idx" ON "promotion_impressions"("user_id");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_impressions" ADD CONSTRAINT "promotion_impressions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_impressions" ADD CONSTRAINT "promotion_impressions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
