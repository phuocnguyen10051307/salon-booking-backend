import express from 'express'
import { StatusCodes } from 'http-status-codes'

import { adminRoute } from './admin.route.js'
import { authRoute } from './auth.route.js'
import { billingRoute } from './billing.route.js'
import { bookingsRoute } from './bookings.route.js'
import { cartRoute } from './cart.route.js'
import { categoriesRoute } from './categories.route.js'
import { chatRoute } from './chat.route.js'
import { locationsRoute } from './locations.route.js'
import { notificationsRoute } from './notifications.route.js'
import { promotionsRoute } from './promotions.route.js'
import { servicesRoute } from './services.route.js'
import { sessionsRoute } from './sessions.route.js'
import { stylistsRoute } from './stylists.route.js'
import { usersRoute } from './users.route.js'

const Router = express.Router()

/** Check APIs V1 status */
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use.' })
})

/** Auth APIs */
Router.use('/auth', authRoute)

/** Domain APIs */
Router.use('/users', usersRoute)
Router.use('/categories', categoriesRoute)
Router.use('/services', servicesRoute)
Router.use('/stylists', stylistsRoute)
Router.use('/cart', cartRoute)
Router.use('/bookings', bookingsRoute)
Router.use('/billing', billingRoute)
Router.use('/notifications', notificationsRoute)
Router.use('/promotions', promotionsRoute)
Router.use('/locations', locationsRoute)
Router.use('/sessions', sessionsRoute)
Router.use('/chat', chatRoute)
Router.use('/admin', adminRoute)

export const APIs_V1 = Router
