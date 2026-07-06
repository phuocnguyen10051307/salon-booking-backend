import { StatusCodes } from 'http-status-codes'
import ApiError from '../utils/ApiError.js'

export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join(', ')
      next(new ApiError(StatusCodes.BAD_REQUEST, message))
      return
    }

    if (source === 'query') {
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      })
    } else {
      req[source] = result.data
    }
    next()
  }
}
