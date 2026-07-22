import crypto from 'crypto'
import { StatusCodes } from 'http-status-codes'

import { env } from '../config/environment.js'
import ApiError from '../utils/ApiError.js'

const PAYOS_BASE_URL = 'https://api-merchant.payos.vn'

const PAYOS_SUCCESS_CODES = new Set(['00'])
const PAYOS_PAID_STATUSES = new Set(['PAID'])

const normalizeBaseUrl = (value) => value.replace(/\/+$/, '')

const sortObjectKeys = (input) =>
  Object.keys(input)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${key}=${input[key] ?? ''}`)
    .join('&')

const requirePayOSConfig = () => {
  if (!env.PAYOS_CLIENT_ID || !env.PAYOS_API_KEY || !env.PAYOS_CHECKSUM_KEY) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'PayOS chua duoc cau hinh. Vui long thiet lap PAYOS_CLIENT_ID, PAYOS_API_KEY va PAYOS_CHECKSUM_KEY',
    )
  }
  if (!env.PAYOS_RETURN_URL || !env.PAYOS_CANCEL_URL) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Chua cau hinh URL return/cancel cua PayOS. Vui long thiet lap PAYOS_RETURN_URL va PAYOS_CANCEL_URL',
    )
  }
}

const buildSignature = ({ amount, cancelUrl, description, orderCode, returnUrl }) => {
  const data = sortObjectKeys({
    amount,
    cancelUrl,
    description,
    orderCode,
    returnUrl,
  })

  return crypto.createHmac('sha256', env.PAYOS_CHECKSUM_KEY).update(data).digest('hex')
}

const requestPayOS = async (path, options = {}) => {
  requirePayOSConfig()

  const response = await fetch(`${PAYOS_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': env.PAYOS_CLIENT_ID,
      'x-api-key': env.PAYOS_API_KEY,
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null)
  const payloadCode = String(payload?.code || '')
  const payloadDesc = String(payload?.desc || payload?.message || '')

  if (response.ok && payload && PAYOS_SUCCESS_CODES.has(payloadCode)) {
    return payload.data
  }

  const isMissingPaymentLink =
    path.startsWith('/v2/payment-requests/') &&
    (payloadCode === '101' || /khong ton tai/i.test(payloadDesc) || response.status === StatusCodes.NOT_FOUND)

  if (isMissingPaymentLink) return null

  if (response.ok && payload) {
    console.warn('[PayOS] Unexpected response payload', { path, payload })
  }

  const message = payload?.desc || payload?.message || 'Yeu cau PayOS that bai'
  throw new ApiError(response.status || StatusCodes.BAD_GATEWAY, message, payload?.code, payload)
}

const sanitizeDescription = (value) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized.slice(0, 25) || 'Thanh toan don hang'
}

const buildOrderCode = (billing) => {
  const digits = String(billing.billing_code || '')
    .replace(/\D/g, '')
    .slice(0, 12)

  if (!digits) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Ma hoa don khong hop le de tao ma don hang PayOS')
  }

  return Number(digits)
}

const buildItemName = (billing) => {
  const services = billing.bookings?.booking_items || []
  const names = services
    .map((item) => item.services?.service_name || item.services?.name || '')
    .filter(Boolean)

  if (names.length === 0) return 'Salon booking'
  if (names.length === 1) return names[0]
  return `${names[0]} +${names.length - 1}`
}

const createPaymentLink = async (billing) => {
  const orderCode = buildOrderCode(billing)
  const amount = Math.max(Math.round(Number(billing.total_amount || 0)), 0)
  const description = sanitizeDescription(`TT ${billing.billing_code}`)
  const cancelUrl = normalizeBaseUrl(env.PAYOS_CANCEL_URL)
  const returnUrl = normalizeBaseUrl(env.PAYOS_RETURN_URL)

  const body = {
    orderCode,
    amount,
    description,
    items: [
      {
        name: buildItemName(billing),
        quantity: 1,
        price: amount,
      },
    ],
    cancelUrl,
    returnUrl,
    buyerName: billing.bookings?.users?.full_name || undefined,
    buyerPhone: billing.bookings?.users?.phone || undefined,
    signature: buildSignature({
      amount,
      cancelUrl,
      description,
      orderCode,
      returnUrl,
    }),
  }

  try {
    return await requestPayOS('/v2/payment-requests', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  } catch (error) {
    const isExistsError = error?.code?.toString() === '231' || /da ton tai/i.test(error?.message || '')
    if (!isExistsError) throw error

    const existing = await getPaymentLink(billing)
    if (existing) return existing
    throw error
  }
}

const getPaymentLink = async (billing) => {
  const orderCode = buildOrderCode(billing)
  return requestPayOS(`/v2/payment-requests/${orderCode}`)
}

const hasUsablePaymentLink = (paymentLink) => Boolean(paymentLink?.qrCode?.toString()?.trim() || paymentLink?.checkoutUrl?.toString()?.trim())

const getOrCreatePaymentLink = async (billing) => {
  const existing = await getPaymentLink(billing)
  if (existing && hasUsablePaymentLink(existing)) return existing
  return createPaymentLink(billing)
}

const isPaidStatus = (status) => PAYOS_PAID_STATUSES.has(String(status || '').toUpperCase())

export const payosService = {
  buildOrderCode,
  getPaymentLink,
  getOrCreatePaymentLink,
  isConfigured: () =>
    Boolean(
      env.PAYOS_CLIENT_ID &&
        env.PAYOS_API_KEY &&
        env.PAYOS_CHECKSUM_KEY &&
        env.PAYOS_RETURN_URL &&
        env.PAYOS_CANCEL_URL,
    ),
  isPaidStatus,
}
