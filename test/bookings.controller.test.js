import assert from 'node:assert/strict'
import test from 'node:test'

import { bookingsControllerInternals } from '../src/controllers/bookings.controller.js'

test('staff schedule keeps same-day completed bookings visible and hides cancelled ones', () => {
  const bookingDate = new Date('2026-07-22T00:00:00.000Z')
  const where = bookingsControllerInternals.buildStaffBookingsWhere({
    stylistId: 'stylist-1',
    bookingDate,
  })

  assert.deepEqual(where, {
    stylist_id: 'stylist-1',
    booking_date: bookingDate,
    status: { not: 'CANCELLED' },
  })
})
