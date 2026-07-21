import dotenv from 'dotenv'

dotenv.config()

export const env = {
  HOST: process.env.HOST || '0.0.0.0',
  PORT: Number(process.env.PORT || 3000),
  BUILD_MODE: process.env.BUILD_MODE,

  // Database
  // MONGO_URI: process.env.MONGO_URI,
  DATABASE_URL: process.env.DATABASE_URL,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,

  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || 'phuocnghse184632@fpt.edu.vn',
  SMTP_PASS: process.env.SMTP_PASS,
  OTP_EXPIRES_IN_MINUTES: Number(process.env.OTP_EXPIRES_IN_MINUTES || 10),

  BANK_QR_BANK_BIN: process.env.BANK_QR_BANK_BIN,
  BANK_QR_BANK_NAME: process.env.BANK_QR_BANK_NAME,
  BANK_QR_ACCOUNT_NUMBER: process.env.BANK_QR_ACCOUNT_NUMBER,
  BANK_QR_ACCOUNT_NAME: process.env.BANK_QR_ACCOUNT_NAME,
  BANK_QR_TEMPLATE: process.env.BANK_QR_TEMPLATE || 'compact2',

  // CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  // CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  // CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
}
