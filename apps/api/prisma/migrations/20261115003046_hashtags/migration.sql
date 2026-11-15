-- CreateTable
CREATE TABLE "post_hashtags" (
    "post_id" UUID NOT NULL,
    "tag" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_hashtags_pkey" PRIMARY KEY ("post_id","tag")
);

-- CreateIndex
CREATE INDEX "post_hashtags_tag_created_at_idx" ON "post_hashtags"("tag", "created_at");

-- CreateIndex
CREATE INDEX "post_hashtags_created_at_idx" ON "post_hashtags"("created_at");

-- AddForeignKey
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Preenche as hashtags das legendas já publicadas (mesma regra de extractHashtags no shared)
INSERT INTO "post_hashtags" ("post_id", "tag", "created_at")
SELECT DISTINCT p."id", lower(m[1]), p."created_at"
FROM "posts" p
CROSS JOIN LATERAL regexp_matches(p."caption", '#([0-9A-Za-zÀ-ÖØ-öø-ÿ_]{2,40})', 'g') AS m
ON CONFLICT DO NOTHING;
