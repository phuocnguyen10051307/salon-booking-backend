-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_COMPLETED', 'PROMOTION', 'NEW_SERVICE');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');

-- CreateTable
CREATE TABLE "booking_cart_items" (
    "cart_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_id" UUID,
    "service_id" UUID,
    "quantity" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_cart_items_pkey" PRIMARY KEY ("cart_item_id")
);

-- CreateTable
CREATE TABLE "booking_carts" (
    "cart_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_carts_pkey" PRIMARY KEY ("cart_id")
);

-- CreateTable
CREATE TABLE "booking_items" (
    "booking_item_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID,
    "service_id" UUID,
    "quantity" INTEGER DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("booking_item_id")
);

-- CreateTable
CREATE TABLE "booking_reschedules" (
    "reschedule_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID,
    "old_booking_date" DATE,
    "old_booking_time" TIME(6),
    "new_booking_date" DATE,
    "new_booking_time" TIME(6),
    "reason" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_reschedules_pkey" PRIMARY KEY ("reschedule_id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "booking_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_code" VARCHAR(20) NOT NULL,
    "user_id" UUID,
    "stylist_id" UUID,
    "booking_date" DATE NOT NULL,
    "booking_time" TIME(6) NOT NULL,
    "note" TEXT,
    "total_amount" DECIMAL(12,2),
    "status" "booking_status" DEFAULT 'PENDING',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "message_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "sender_type" VARCHAR(20) NOT NULL,
    "message_content" TEXT NOT NULL,
    "sent_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "title" VARCHAR(255),
    "content" TEXT,
    "notification_type" "notification_type",
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "promotion_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255),
    "description" TEXT,
    "discount_percent" INTEGER,
    "start_date" DATE,
    "end_date" DATE,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("promotion_id")
);

-- CreateTable
CREATE TABLE "salon_locations" (
    "location_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salon_name" VARCHAR(150),
    "address" TEXT,
    "hotline" VARCHAR(20),
    "opening_hours" VARCHAR(100),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salon_locations_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "services" (
    "service_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "service_name" VARCHAR(150) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("service_id")
);

-- CreateTable
CREATE TABLE "stylist_services" (
    "stylist_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,

    CONSTRAINT "stylist_services_pkey" PRIMARY KEY ("stylist_id","service_id")
);

-- CreateTable
CREATE TABLE "stylists" (
    "stylist_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(100),
    "avatar_url" TEXT,
    "experience_years" INTEGER,
    "bio" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stylists_pkey" PRIMARY KEY ("stylist_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100),
    "phone" VARCHAR(20),
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- AddForeignKey
ALTER TABLE "booking_cart_items" ADD CONSTRAINT "booking_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "booking_carts"("cart_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_cart_items" ADD CONSTRAINT "booking_cart_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_carts" ADD CONSTRAINT "booking_carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_reschedules" ADD CONSTRAINT "booking_reschedules_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_stylist_id_fkey" FOREIGN KEY ("stylist_id") REFERENCES "stylists"("stylist_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stylist_services" ADD CONSTRAINT "stylist_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("service_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stylist_services" ADD CONSTRAINT "stylist_services_stylist_id_fkey" FOREIGN KEY ("stylist_id") REFERENCES "stylists"("stylist_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
