import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { getUserId, ok } from './helpers.js'

const findOrCreateCart = async (userId) => {
  const cart = await prisma.booking_carts.findFirst({ where: { user_id: userId } })
  if (cart) return cart
  return prisma.booking_carts.create({ data: { user_id: userId } })
}

const findOwnedCartItem = async (itemId, userId) => {
  const item = await prisma.booking_cart_items.findFirst({
    where: {
      cart_item_id: itemId,
      booking_carts: { user_id: userId },
    },
    include: { services: true },
  })

  if (!item) throw new ApiError(StatusCodes.NOT_FOUND, 'Cart item not found')
  return item
}

const getCart = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(getUserId(req))
  const fullCart = await prisma.booking_carts.findUnique({
    where: { cart_id: cart.cart_id },
    include: { booking_cart_items: { include: { services: true } } },
  })
  ok(res, 'Lay gio dat lich thanh cong', { cart: fullCart })
})

const addCartItem = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(getUserId(req))
  const serviceId = req.body.service_id || req.body.serviceId
  const quantity = Math.max(Number(req.body.quantity) || 1, 1)

  const existingItem = await prisma.booking_cart_items.findFirst({
    where: {
      cart_id: cart.cart_id,
      service_id: serviceId,
    },
  })

  const item = existingItem
    ? await prisma.booking_cart_items.update({
        where: { cart_item_id: existingItem.cart_item_id },
        data: { quantity: (existingItem.quantity || 0) + quantity },
        include: { services: true },
      })
    : await prisma.booking_cart_items.create({
        data: {
          cart_id: cart.cart_id,
          service_id: serviceId,
          quantity,
        },
        include: { services: true },
      })

  ok(res, 'Them dich vu vao gio thanh cong', { item }, 201)
})

const updateCartItem = asyncHandler(async (req, res) => {
  await findOwnedCartItem(req.params.itemId, getUserId(req))

  const item = await prisma.booking_cart_items.update({
    where: { cart_item_id: req.params.itemId },
    data: { quantity: req.body.quantity },
    include: { services: true },
  })
  ok(res, 'Cap nhat dich vu trong gio thanh cong', { item })
})

const deleteCartItem = asyncHandler(async (req, res) => {
  await findOwnedCartItem(req.params.itemId, getUserId(req))
  await prisma.booking_cart_items.delete({ where: { cart_item_id: req.params.itemId } })
  ok(res, 'Xoa dich vu khoi gio thanh cong')
})

const clearCart = asyncHandler(async (req, res) => {
  const cart = await findOrCreateCart(getUserId(req))
  await prisma.booking_cart_items.deleteMany({ where: { cart_id: cart.cart_id } })
  ok(res, 'Xoa gio dat lich thanh cong')
})

export const bookingCartsController = {
  getCart,
  addCartItem,
  updateCartItem,
  deleteCartItem,
  clearCart,
}
