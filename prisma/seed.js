import 'dotenv/config'

import { prisma } from '../src/config/prisma.js'

const categories = [
  {
    category_id: '11111111-1111-4111-8111-111111111111',
    category_name: 'Haircut',
    description: 'Haircuts, trims, and barber services for all styles.',
  },
  {
    category_id: '22222222-2222-4222-8222-222222222222',
    category_name: 'Coloring',
    description: 'Hair color, highlights, balayage, and color correction.',
  },
  {
    category_id: '33333333-3333-4333-8333-333333333333',
    category_name: 'Hair Care',
    description: 'Washing, styling, scalp care, and repair treatments.',
  },
  {
    category_id: '44444444-4444-4444-8444-444444444444',
    category_name: 'Nails',
    description: 'Manicure, pedicure, gel polish, and nail art.',
  },
  {
    category_id: '55555555-5555-4555-8555-555555555555',
    category_name: 'Facial',
    description: 'Facial cleansing, brightening, hydration, and acne care.',
  },
  {
    category_id: '66666666-6666-4666-8666-666666666666',
    category_name: 'Massage',
    description: 'Relaxation, aromatherapy, and body therapy services.',
  },
  {
    category_id: '77777777-7777-4777-8777-777777777777',
    category_name: 'Makeup',
    description: 'Daily, party, bridal, and event makeup.',
  },
  {
    category_id: '88888888-8888-4888-8888-888888888888',
    category_name: 'Waxing',
    description: 'Eyebrow shaping and body waxing services.',
  },
]

const serviceImage =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80'

const services = [
  ['10000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Classic Haircut', 150000, 30],
  ['10000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Men Haircut', 120000, 30],
  ['10000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Layer Haircut', 220000, 45],
  ['10000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'Kids Haircut', 90000, 25],
  ['10000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Beard Trim', 80000, 20],
  ['10000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'Fade Cut', 180000, 40],
  ['10000000-0000-4000-8000-000000000007', '22222222-2222-4222-8222-222222222222', 'Full Hair Coloring', 650000, 120],
  ['10000000-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'Root Touch Up', 350000, 75],
  ['10000000-0000-4000-8000-000000000009', '22222222-2222-4222-8222-222222222222', 'Balayage', 1200000, 180],
  ['10000000-0000-4000-8000-000000000010', '22222222-2222-4222-8222-222222222222', 'Highlights', 850000, 150],
  ['10000000-0000-4000-8000-000000000011', '22222222-2222-4222-8222-222222222222', 'Color Correction', 1500000, 210],
  ['10000000-0000-4000-8000-000000000012', '33333333-3333-4333-8333-333333333333', 'Hair Wash and Blow Dry', 180000, 45],
  ['10000000-0000-4000-8000-000000000013', '33333333-3333-4333-8333-333333333333', 'Keratin Treatment', 950000, 150],
  ['10000000-0000-4000-8000-000000000014', '33333333-3333-4333-8333-333333333333', 'Scalp Detox', 320000, 60],
  ['10000000-0000-4000-8000-000000000015', '33333333-3333-4333-8333-333333333333', 'Hair Spa Repair', 450000, 90],
  ['10000000-0000-4000-8000-000000000016', '33333333-3333-4333-8333-333333333333', 'Perm Styling', 1100000, 180],
  ['10000000-0000-4000-8000-000000000017', '33333333-3333-4333-8333-333333333333', 'Straightening', 1000000, 180],
  ['10000000-0000-4000-8000-000000000018', '44444444-4444-4444-8444-444444444444', 'Classic Manicure', 180000, 45],
  ['10000000-0000-4000-8000-000000000019', '44444444-4444-4444-8444-444444444444', 'Classic Pedicure', 220000, 50],
  ['10000000-0000-4000-8000-000000000020', '44444444-4444-4444-8444-444444444444', 'Gel Polish', 300000, 60],
  ['10000000-0000-4000-8000-000000000021', '44444444-4444-4444-8444-444444444444', 'Nail Art Set', 420000, 90],
  ['10000000-0000-4000-8000-000000000022', '44444444-4444-4444-8444-444444444444', 'Spa Pedicure', 380000, 75],
  ['10000000-0000-4000-8000-000000000023', '55555555-5555-4555-8555-555555555555', 'Deep Cleansing Facial', 450000, 75],
  ['10000000-0000-4000-8000-000000000024', '55555555-5555-4555-8555-555555555555', 'Hydrating Facial', 520000, 80],
  ['10000000-0000-4000-8000-000000000025', '55555555-5555-4555-8555-555555555555', 'Brightening Facial', 600000, 90],
  ['10000000-0000-4000-8000-000000000026', '55555555-5555-4555-8555-555555555555', 'Acne Care Facial', 550000, 85],
  ['10000000-0000-4000-8000-000000000027', '66666666-6666-4666-8666-666666666666', 'Relaxing Massage 60', 500000, 60],
  ['10000000-0000-4000-8000-000000000028', '66666666-6666-4666-8666-666666666666', 'Aromatherapy Massage', 650000, 90],
  ['10000000-0000-4000-8000-000000000029', '66666666-6666-4666-8666-666666666666', 'Hot Stone Massage', 720000, 90],
  ['10000000-0000-4000-8000-000000000030', '66666666-6666-4666-8666-666666666666', 'Foot Massage', 260000, 45],
  ['10000000-0000-4000-8000-000000000031', '77777777-7777-4777-8777-777777777777', 'Daily Makeup', 450000, 60],
  ['10000000-0000-4000-8000-000000000032', '77777777-7777-4777-8777-777777777777', 'Party Makeup', 700000, 90],
  ['10000000-0000-4000-8000-000000000033', '77777777-7777-4777-8777-777777777777', 'Bridal Makeup', 1800000, 150],
  ['10000000-0000-4000-8000-000000000034', '88888888-8888-4888-8888-888888888888', 'Eyebrow Waxing', 100000, 20],
  ['10000000-0000-4000-8000-000000000035', '88888888-8888-4888-8888-888888888888', 'Underarm Waxing', 160000, 25],
  ['10000000-0000-4000-8000-000000000036', '88888888-8888-4888-8888-888888888888', 'Full Leg Waxing', 420000, 60],
].map(([service_id, category_id, service_name, price, duration_minutes]) => ({
  service_id,
  category_id,
  service_name,
  price,
  duration_minutes,
  description: `${service_name} service at Salon Booking.`,
  image_url: serviceImage,
  is_active: true,
}))

const stylists = [
  {
    stylist_id: '20000000-0000-4000-8000-000000000001',
    full_name: 'Linh Nguyen',
    phone: '0901000001',
    email: 'linh.stylist@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
    experience_years: 6,
    bio: 'Senior hair stylist specializing in cuts, color, and styling.',
    is_active: true,
  },
  {
    stylist_id: '20000000-0000-4000-8000-000000000002',
    full_name: 'Minh Tran',
    phone: '0901000002',
    email: 'minh.barber@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=400&q=80',
    experience_years: 5,
    bio: 'Barber and men grooming specialist.',
    is_active: true,
  },
  {
    stylist_id: '20000000-0000-4000-8000-000000000003',
    full_name: 'An Pham',
    phone: '0901000003',
    email: 'an.beauty@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&w=400&q=80',
    experience_years: 7,
    bio: 'Beauty therapist for facial, makeup, nails, and spa services.',
    is_active: true,
  },
]

const locations = [
  {
    location_id: '30000000-0000-4000-8000-000000000001',
    salon_name: 'Glamour Hair Studio',
    address: '123 Nguyen Trai, District 5, HCMC',
    hotline: '19001001',
    opening_hours: '09:00 - 21:00',
    latitude: 10.754792,
    longitude: 106.666023,
  },
  {
    location_id: '30000000-0000-4000-8000-000000000002',
    salon_name: 'Luxe Spa and Nails',
    address: '45 Le Loi, District 1, HCMC',
    hotline: '19001002',
    opening_hours: '09:00 - 22:00',
    latitude: 10.776889,
    longitude: 106.700806,
  },
  {
    location_id: '30000000-0000-4000-8000-000000000003',
    salon_name: 'Modern Men Barbershop',
    address: '12 Nguyen Thi Minh Khai, District 3, HCMC',
    hotline: '19001003',
    opening_hours: '08:30 - 20:30',
    latitude: 10.78331,
    longitude: 106.695834,
  },
]

const promotions = [
  {
    promotion_id: '40000000-0000-4000-8000-000000000001',
    title: 'New Customer Welcome',
    description: 'Get 15% off for your first booking.',
    discount_percent: 15,
    start_date: new Date('2026-01-01T00:00:00.000Z'),
    end_date: new Date('2026-12-31T00:00:00.000Z'),
    is_active: true,
  },
  {
    promotion_id: '40000000-0000-4000-8000-000000000002',
    title: 'Hair Care Combo',
    description: 'Save 20% on selected hair care treatments.',
    discount_percent: 20,
    start_date: new Date('2026-06-01T00:00:00.000Z'),
    end_date: new Date('2026-08-31T00:00:00.000Z'),
    is_active: true,
  },
]

const main = async () => {
  for (const category of categories) {
    await prisma.categories.upsert({
      where: { category_id: category.category_id },
      update: category,
      create: category,
    })
  }

  for (const service of services) {
    await prisma.services.upsert({
      where: { service_id: service.service_id },
      update: service,
      create: service,
    })
  }

  for (const stylist of stylists) {
    await prisma.stylists.upsert({
      where: { stylist_id: stylist.stylist_id },
      update: stylist,
      create: stylist,
    })
  }

  for (const location of locations) {
    await prisma.salon_locations.upsert({
      where: { location_id: location.location_id },
      update: location,
      create: location,
    })
  }

  for (const promotion of promotions) {
    await prisma.promotions.upsert({
      where: { promotion_id: promotion.promotion_id },
      update: promotion,
      create: promotion,
    })
  }

  for (const [index, service] of services.entries()) {
    const stylist = stylists[index % stylists.length]
    await prisma.stylist_services.upsert({
      where: {
        stylist_id_service_id: {
          stylist_id: stylist.stylist_id,
          service_id: service.service_id,
        },
      },
      update: {},
      create: {
        stylist_id: stylist.stylist_id,
        service_id: service.service_id,
      },
    })
  }

  console.log(
    `Seeded ${categories.length} categories, ${services.length} services, ${stylists.length} stylists, ${locations.length} locations, and ${promotions.length} promotions.`
  )
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
