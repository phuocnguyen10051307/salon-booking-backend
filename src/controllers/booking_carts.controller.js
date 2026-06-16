import asyncHandler from 'express-async-handler'

import { prisma } from '../config/prisma.js'
import { getUserId, ok } from './helpers.js'

const findOrCreateCart = async (userId) => {
  const cart = await prisma.booking_carts.findFirst({ where: { user_id: userId } })
  if (cart) return cart
  return prisma.booking_carts.create({ data: { user_id: userId } })
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
  const item = await prisma.booking_cart_items.create({
    data: {
      cart_id: cart.cart_id,
      service_id: req.body.service_id || req.body.serviceId,
      quantity: req.body.quantity || 1,
    },
    include: { services: true },
  })
  ok(res, 'Them dich vu vao gio thanh cong', { item }, 201)
})

const updateCartItem = asyncHandler(async (req, res) => {
  const item = await prisma.booking_cart_items.update({
    where: { cart_item_id: req.params.itemId },
    data: { quantity: req.body.quantity },
    include: { services: true },
  })
  ok(res, 'Cap nhat dich vu trong gio thanh cong', { item })
})

const deleteCartItem = asyncHandler(async (req, res) => {
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
