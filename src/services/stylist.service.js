import { prisma } from '../config/prisma.js'

const staffMatchWhere = (user) => {
  const matches = []
  if (user?.email) matches.push({ email: user.email })
  if (user?.phone) matches.push({ phone: user.phone })
  return matches.length ? { OR: matches } : null
}

const stylistDataFromUser = (user) => ({
  full_name: user.full_name,
  phone: user.phone,
  email: user.email,
  avatar_url: user.avatar_url,
  is_active: user.is_active ?? true,
})

const ensureStaffStylist = async (user, tx = prisma) => {
  if (!user || user.role?.toUpperCase() !== 'STAFF') return null

  const data = stylistDataFromUser(user)
  const where = staffMatchWhere(user)
  const existing = where ? await tx.stylists.findFirst({ where }) : null

  if (existing) {
    return tx.stylists.update({
      where: { stylist_id: existing.stylist_id },
      data,
    })
  }

  return tx.stylists.create({ data })
}

const getStylistForStaffUser = async (userId, tx = prisma) => {
  const user = await tx.users.findUnique({ where: { user_id: userId } })
  const stylist = await ensureStaffStylist(user, tx)
  return stylist
}

const syncStaffUsersToStylists = async () => {
  const staffUsers = await prisma.users.findMany({ where: { role: 'STAFF' } })
  const stylists = []

  for (const user of staffUsers) {
    const stylist = await ensureStaffStylist(user)
    if (stylist) stylists.push(stylist)
  }

  return stylists
}

export const stylistService = {
  ensureStaffStylist,
  getStylistForStaffUser,
  syncStaffUsersToStylists,
}
