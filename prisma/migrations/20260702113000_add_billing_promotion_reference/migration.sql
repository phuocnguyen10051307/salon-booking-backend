ALTER TABLE "billings"
ADD COLUMN "promotion_id" UUID;

CREATE INDEX "billings_promotion_id_idx"
ON "billings"("promotion_id");

ALTER TABLE "billings"
ADD CONSTRAINT "billings_promotion_id_fkey"
FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id")
ON DELETE SET NULL ON UPDATE NO ACTION;
