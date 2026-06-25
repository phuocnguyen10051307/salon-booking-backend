import express from 'express'
import { validate } from '../../middlewares/validation.middleware.js'
import { authValidation } from '../../validations/auth.validation.js'
import { authController } from '../../controllers/auth.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()

// Register a new user
Router.post('/signup', validate(authValidation.signupSchema), authController.signup)

// Verify signup OTP
Router.post('/verify-signup-otp', validate(authValidation.verifySignupOtpSchema), authController.verifySignupOtp)

// Resend signup OTP
Router.post('/resend-signup-otp', validate(authValidation.resendSignupOtpSchema), authController.resendSignupOtp)

// Login
Router.post('/signin', validate(authValidation.signinSchema), authController.signin)

// Current user
Router.get('/me', authMiddleware.protectedRoute, authController.me)

// Logout
Router.post('/signout', authMiddleware.protectedRoute, authController.signout)

// Refresh access token
Router.post('/refresh-token', authController.refreshToken)

export const authRoute = Router

