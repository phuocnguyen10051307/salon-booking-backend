-- CreateEnum
CREATE TYPE "billing_status" AS ENUM ('UNPAID', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'E_WALLET');

-- CreateTable
CREATE TABLE "billings" (
    "billing_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "billing_code" VARCHAR(20) NOT NULL,
    "booking_id" UUID NOT NULL,
    "user_id" UUID,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "payment_method" DEFAULT 'CASH',
    "status" "billing_status" DEFAULT 'UNPAID',
    "paid_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billings_pkey" PRIMARY KEY ("billing_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billings_billing_code_key" ON "billings"("billing_code");

-- CreateIndex
CREATE UNIQUE INDEX "billings_booking_id_key" ON "billings"("booking_id");

-- AddForeignKey
ALTER TABLE "billings" ADD CONSTRAINT "billings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "billings" ADD CONSTRAINT "billings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
