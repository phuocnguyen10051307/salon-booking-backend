import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { authRoute } from './auth.route.js'
import { salonRoute } from './salon.route.js'

const Router = express.Router()

/** Check APIs V1 status */
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use.' })
})

/** Auth APIs */
Router.use('/auth', authRoute)

/** Salon APIs */
Router.use('/', salonRoute)

export const APIs_V1 = Router
