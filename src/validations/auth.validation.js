import { z } from 'zod'
import { PASSWORD_RULE, PASSWORD_RULE_MESSAGE, PHONE_RULE, PHONE_RULE_MESSAGE } from '../utils/validators.js'

const emailRule = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const signupSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters long'),
  phone: z.string().regex(PHONE_RULE, PHONE_RULE_MESSAGE),
  email: z
    .string()
    .optional()
    .refine((value) => !value || emailRule.test(value), {
      message: 'Invalid email address',
    }),
  password: z.string().regex(PASSWORD_RULE, PASSWORD_RULE_MESSAGE),
})

const signinSchema = z
  .object({
    email: z
      .string()
      .optional()
      .refine((value) => !value || emailRule.test(value), {
        message: 'Invalid email address',
      }),
    identifier: z.string().optional(),
    password: z.string().regex(PASSWORD_RULE, PASSWORD_RULE_MESSAGE),
  })
  .refine((data) => data.email || data.identifier, {
    message: 'Email or phone is required',
    path: ['identifier'],
  })

export const authValidation = {
  signupSchema,
  signinSchema,
}
