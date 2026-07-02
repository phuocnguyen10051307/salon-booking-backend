CREATE TABLE "service_reviews" (
    "review_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_reviews_pkey" PRIMARY KEY ("review_id")
);

CREATE UNIQUE INDEX "service_reviews_booking_id_service_id_user_id_key"
ON "service_reviews"("booking_id", "service_id", "user_id");

ALTER TABLE "service_reviews"
ADD CONSTRAINT "service_reviews_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "service_reviews"
ADD CONSTRAINT "service_reviews_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "services"("service_id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "service_reviews"
ADD CONSTRAINT "service_reviews_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE NO ACTION;
