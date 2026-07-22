import assert from 'node:assert/strict'
import test from 'node:test'

import { env } from '../src/config/environment.js'
import { payosService } from '../src/services/payos.service.js'
import { billingsControllerInternals } from '../src/controllers/billings.controller.js'

test('PayOS paid status check is case-insensitive and rejects pending payments', () => {
  assert.equal(payosService.isPaidStatus('PAID'), true)
  assert.equal(payosService.isPaidStatus('paid'), true)
  assert.equal(payosService.isPaidStatus('PENDING'), false)
  assert.equal(payosService.isPaidStatus(undefined), false)
})

test('buildOrderCode changes when the payment session changes', () => {
  const baseBilling = {
    billing_code: 'BL8025107073',
    billing_id: '11111111-1111-1111-1111-111111111111',
    updated_at: '2026-07-22T00:00:00.000Z',
    created_at: '2026-07-21T00:00:00.000Z',
  }

  const first = payosService.buildOrderCode(baseBilling)
  const second = payosService.buildOrderCode({
    ...baseBilling,
    updated_at: '2026-07-22T00:05:00.000Z',
  })

  assert.notEqual(first, second)
})

test('getOrCreatePaymentLink recreates missing QR sessions', async () => {
  const originalFetch = global.fetch
  const originalEnv = {
    PAYOS_CLIENT_ID: env.PAYOS_CLIENT_ID,
    PAYOS_API_KEY: env.PAYOS_API_KEY,
    PAYOS_CHECKSUM_KEY: env.PAYOS_CHECKSUM_KEY,
    PAYOS_RETURN_URL: env.PAYOS_RETURN_URL,
    PAYOS_CANCEL_URL: env.PAYOS_CANCEL_URL,
  }

  env.PAYOS_CLIENT_ID = 'test-client'
  env.PAYOS_API_KEY = 'test-key'
  env.PAYOS_CHECKSUM_KEY = 'test-checksum'
  env.PAYOS_RETURN_URL = 'https://example.com/return'
  env.PAYOS_CANCEL_URL = 'https://example.com/cancel'

  let calls = 0
  global.fetch = async () => {
    calls += 1
    if (calls === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          code: '00',
          data: {
            paymentLinkId: '123',
            orderCode: '8025107073',
            checkoutUrl: '',
            qrCode: '',
          },
        }),
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        code: '00',
        data: {
          paymentLinkId: '456',
          orderCode: '8025107073',
          checkoutUrl: 'https://pay.payos.vn/web/456',
          qrCode: 'QR-456',
        },
      }),
    }
  }

  try {
    const result = await payosService.getOrCreatePaymentLink({
      billing_code: 'BL8025107073',
      total_amount: 120000,
      bookings: { users: { full_name: 'Test User', phone: '0123456789' }, booking_items: [] },
    })

    assert.equal(result.paymentLinkId, '456')
    assert.equal(result.qrCode, 'QR-456')
    assert.equal(calls, 2)
  } finally {
    global.fetch = originalFetch
    Object.assign(env, originalEnv)
  }
})