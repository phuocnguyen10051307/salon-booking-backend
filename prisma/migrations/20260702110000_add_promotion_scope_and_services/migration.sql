CREATE TYPE "promotion_scope" AS ENUM ('ALL_SERVICES', 'SELECTED_SERVICES');

ALTER TABLE "promotions"
ADD COLUMN "scope" "promotion_scope" NOT NULL DEFAULT 'ALL_SERVICES';

CREATE TABLE "promotion_services" (
    "promotion_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_services_pkey" PRIMARY KEY ("promotion_id", "service_id")
);

CREATE INDEX "promotion_services_service_id_idx"
ON "promotion_services"("service_id");

ALTER TABLE "promotion_services"
ADD CONSTRAINT "promotion_services_promotion_id_fkey"
FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "promotion_services"
ADD CONSTRAINT "promotion_services_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "services"("service_id")
ON DELETE CASCADE ON UPDATE NO ACTION;
