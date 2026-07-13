import nodemailer from 'nodemailer'
import { StatusCodes } from 'http-status-codes'

import { env } from '../config/environment.js'
import ApiError from '../utils/ApiError.js'

const createTransporter = () => {
  if (!env.SMTP_PASS) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'SMTP_PASS is required to send verification OTP')
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })
}

const sendVerificationOtp = async ({ to, fullName, otp }) => {
  const transporter = createTransporter()

  await transporter.sendMail({
    from: `"Salon Booking" <${env.SMTP_USER}>`,
    to,
    subject: 'Salon Booking - Verify your account',
    text: `Hi ${fullName}, your Salon Booking verification OTP is ${otp}. This code expires in ${env.OTP_EXPIRES_IN_MINUTES} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verify your Salon Booking account</h2>
        <p>Hi ${fullName},</p>
        <p>Your verification OTP is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
        <p>This code expires in ${env.OTP_EXPIRES_IN_MINUTES} minutes.</p>
      </div>
    `,
  })
}

export const emailService = {
  sendVerificationOtp,
}
