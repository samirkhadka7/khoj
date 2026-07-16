/**
 * Seed script — populates the database with realistic demo data.
 *
 *   npm run seed
 *   MONGODB_URI="mongodb+srv://..." npm run seed
 *
 * Creates:
 *   - 1 admin
 *   - 3 KYC-approved owners (with Kyc docs marked approved)
 *   - 5 tenant users
 *   - 10 listings (3 hostels, 3 rooms, 2 offices, 2 business) with real KTM lat/lng
 *   - A few accepted contact requests
 *   - A few reviews on those accepted requests
 *
 * DESTRUCTIVE: clears Users, Listings, ContactRequests, Reviews, Notifications,
 * Kyc, Messages before seeding. Intended for dev/demo databases only.
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import {
  User,
  Listing,
  ContactRequest,
  Review,
  Notification,
  Kyc,
  Message,
} from '../src/models'

dotenv.config()

const SALT_ROUNDS = 10
const hash = (pw: string) => bcrypt.hash(pw, SALT_ROUNDS)

/* Real Kathmandu-valley coordinates [lng, lat] for variety */
const LOCATIONS = {
  kirtipur: { area: 'Kirtipur', district: 'Kathmandu', coordinates: [85.2769, 27.6786] },
  pulchowk: { area: 'Pulchowk', district: 'Lalitpur', coordinates: [85.3169, 27.6796] },
  baluwatar: { area: 'Baluwatar', district: 'Kathmandu', coordinates: [85.33, 27.7283] },
  lazimpat: { area: 'Lazimpat', district: 'Kathmandu', coordinates: [85.32, 27.7222] },
  koteshwor: { area: 'Koteshwor', district: 'Kathmandu', coordinates: [85.347, 27.6776] },
  baneshwor: { area: 'New Baneshwor', district: 'Kathmandu', coordinates: [85.338, 27.689] },
  patan: { area: 'Patan Dhoka', district: 'Lalitpur', coordinates: [85.325, 27.673] },
  sanepa: { area: 'Sanepa', district: 'Lalitpur', coordinates: [85.305, 27.681] },
  thamel: { area: 'Thamel', district: 'Kathmandu', coordinates: [85.3123, 27.7154] },
  bhaktapur: { area: 'Durbar Square', district: 'Bhaktapur', coordinates: [85.4298, 27.671] },
} as const

type LocKey = keyof typeof LOCATIONS

const loc = (key: LocKey, address: string) => ({
  address,
  area: LOCATIONS[key].area,
  district: LOCATIONS[key].district,
  coordinates: { type: 'Point' as const, coordinates: [...LOCATIONS[key].coordinates] },
})

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI is not set — aborting.')
    process.exit(1)
  }

  console.log(`[Seed] Connecting to ${uri.replace(/:[^:@]+@/, ':****@')}`)
  await mongoose.connect(uri)
  console.log(`[Seed] Connected to ${mongoose.connection.name}`)

  // ---- Wipe ----
  console.log('[Seed] Clearing collections...')
  await Promise.all([
    User.deleteMany({}),
    Listing.deleteMany({}),
    ContactRequest.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
    Kyc.deleteMany({}),
    Message.deleteMany({}),
  ])

  // ---- Users ----
  console.log('[Seed] Creating users...')
  const [adminPw, ownerPw, tenantPw] = await Promise.all([
    hash('Admin@123'),
    hash('Owner@123'),
    hash('Tenant@123'),
  ])

  const admin = await User.create({
    name: 'Bibek Admin',
    email: 'admin@baaskhoj.com',
    passwordHash: adminPw,
    role: 'admin',
    phone: '9800000000',
    isPhoneVerified: true,
    isVerified: true,
  })

  const owners = await User.create([
    {
      name: 'Rajesh Sharma',
      email: 'rajesh@baaskhoj.com',
      passwordHash: ownerPw,
      role: 'owner',
      phone: '9812345670',
      isPhoneVerified: true,
      isVerified: true,
      bio: 'Verified owner managing student hostels near TU, Kirtipur.',
    },
    {
      name: 'Sushila Maharjan',
      email: 'sushila@baaskhoj.com',
      passwordHash: ownerPw,
      role: 'owner',
      phone: '9812345671',
      isPhoneVerified: true,
      isVerified: true,
      bio: 'Runs girls hostels and rental flats in Lalitpur.',
    },
    {
      name: 'Bibek Thapa',
      email: 'bibek@baaskhoj.com',
      passwordHash: ownerPw,
      role: 'owner',
      phone: '9812345672',
      isPhoneVerified: true,
      isVerified: true,
      bio: 'Commercial spaces and offices around Baneshwor & Koteshwor.',
    },
  ])

  const tenants = await User.create([
    { name: 'Anjali Singh', email: 'anjali@baaskhoj.com', passwordHash: tenantPw, role: 'user', phone: '9843000001', isPhoneVerified: true },
    { name: 'Bishal Karki', email: 'bishal@baaskhoj.com', passwordHash: tenantPw, role: 'user', phone: '9843000002' },
    { name: 'Sandeep Gurung', email: 'sandeep@baaskhoj.com', passwordHash: tenantPw, role: 'user', phone: '9843000003' },
    { name: 'Priya Shrestha', email: 'priya@baaskhoj.com', passwordHash: tenantPw, role: 'user', phone: '9843000004' },
    { name: 'Suresh Tamang', email: 'suresh@baaskhoj.com', passwordHash: tenantPw, role: 'user', phone: '9843000005' },
  ])

  // ---- KYC (approved) for the 3 owners ----
  console.log('[Seed] Creating approved KYC records...')
  const ph = 'https://res.cloudinary.com/demo/image/upload/sample.jpg' // placeholder docs
  await Kyc.create(
    owners.map((o, i) => ({
      userId: o._id,
      legalName: o.name,
      phone: o.phone,
      isPhoneVerified: true,
      address: { district: ['Kathmandu', 'Lalitpur', 'Kathmandu'][i], area: ['Kirtipur', 'Patan', 'Baneshwor'][i] },
      citizenshipFront: ph,
      citizenshipBack: ph,
      selfieWithId: ph,
      status: 'approved',
      reviewedBy: admin._id,
      submittedAt: new Date(Date.now() - 5 * 86400000),
      reviewedAt: new Date(Date.now() - 4 * 86400000),
    }))
  )

  // ---- Listings ----
  console.log('[Seed] Creating listings...')
  const [o1, o2, o3] = owners

  const listingsData = [
    // --- 3 Hostels ---
    {
      ownerId: o1._id,
      type: 'hostel' as const,
      title: 'Sunrise Boys Hostel — Near TU Gate',
      description:
        'Clean, secure boys hostel a 5-minute walk from Tribhuvan University. Home-cooked meals included, high-speed WiFi, and 24/7 security.',
      price: 8000,
      negotiable: true,
      location: loc('kirtipur', 'Kirtipur-3, near TU Gate'),
      amenities: ['WiFi', 'Hot Water', 'Meals', 'Security/CCTV', '24/7 Access', 'Drinking Water'],
      typeFields: { gender: 'boys', roomType: 'double', totalBeds: 24, mealsIncluded: true, visitorsAllowed: false, curfewTime: '21:00', nearbyCollege: 'IOE / TU Kirtipur' },
      isVerified: true,
      isFeatured: true,
    },
    {
      ownerId: o2._id,
      type: 'hostel' as const,
      title: 'Sunrise Girls Hostel — Patan',
      description:
        'Safe, study-focused girls hostel in Patan with gated entry, daily meals, and laundry service. Walking distance to multiple colleges.',
      price: 7500,
      negotiable: false,
      location: loc('patan', 'Patan Dhoka, near Mangal Bazaar'),
      amenities: ['WiFi', 'Hot Water', 'Meals', 'Laundry', 'Security/CCTV', 'Study Room'],
      typeFields: { gender: 'girls', roomType: 'double', totalBeds: 18, mealsIncluded: true, visitorsAllowed: true, curfewTime: '20:00', nearbyCollege: 'Patan Multiple Campus' },
      isVerified: true,
    },
    {
      ownerId: o1._id,
      type: 'hostel' as const,
      title: 'Mixed Dormitory — Thamel Backpacker Style',
      description:
        'Affordable mixed dormitory in Thamel, ideal for students and young professionals. Generator backup and solar hot water.',
      price: 5500,
      negotiable: true,
      location: loc('thamel', 'Thamel Marg, near Garden of Dreams'),
      amenities: ['WiFi', 'Hot Water', 'Generator', 'Solar', 'Drinking Water'],
      typeFields: { gender: 'mixed', roomType: 'dormitory', totalBeds: 30, mealsIncluded: false, visitorsAllowed: true, nearbyCollege: 'Kathmandu Model College' },
      isVerified: false,
    },

    // --- 3 Rooms/Flats ---
    {
      ownerId: o2._id,
      type: 'room' as const,
      title: 'Modern 2BHK Flat — Baluwatar',
      description:
        'Semi-furnished 2BHK on the top floor with abundant natural light, parking, and a sunny balcony. Family preferred.',
      price: 25000,
      negotiable: true,
      location: loc('baluwatar', 'Baluwatar, near Embassy area'),
      amenities: ['WiFi', 'Parking', 'Hot Water', 'Balcony', 'Drinking Water'],
      typeFields: { bhkType: '2BHK', furnished: 'semi-furnished', forWhom: 'family', depositAmount: 50000, minStayMonths: 6, sqft: 850, floor: 4, petAllowed: false, facing: 'East' },
      isVerified: true,
      isFeatured: true,
    },
    {
      ownerId: o3._id,
      type: 'room' as const,
      title: 'Furnished Studio Apartment — Sanepa',
      description:
        'Fully furnished studio perfect for a single professional. Quiet neighborhood, lift access, dedicated parking.',
      price: 18000,
      negotiable: false,
      location: loc('sanepa', 'Sanepa Heights, Ring Road'),
      amenities: ['WiFi', 'Parking', 'AC', 'Hot Water', 'Elevator'],
      typeFields: { bhkType: 'single', furnished: 'furnished', forWhom: 'bachelor', depositAmount: 36000, minStayMonths: 3, sqft: 420, floor: 3, petAllowed: true },
      isVerified: true,
    },
    {
      ownerId: o2._id,
      type: 'room' as const,
      title: 'Spacious 1BHK — Lazimpat',
      description:
        'Unfurnished 1BHK in a calm residential lane in Lazimpat. Good for couples or a small family. Long-term preferred.',
      price: 15000,
      negotiable: true,
      location: loc('lazimpat', 'Lazimpat, near Saleways'),
      amenities: ['Parking', 'Hot Water', 'Drinking Water'],
      typeFields: { bhkType: '1BHK', furnished: 'unfurnished', forWhom: 'both', depositAmount: 30000, minStayMonths: 12, sqft: 600, floor: 2, petAllowed: false },
      isVerified: false,
    },

    // --- 2 Offices ---
    {
      ownerId: o3._id,
      type: 'office' as const,
      title: 'Private Office Suite — New Baneshwor',
      description:
        'Ready-to-move private office with dedicated internet, lift, and 5 parking slots. Fire-safety certified building.',
      price: 45000,
      negotiable: true,
      location: loc('baneshwor', 'New Baneshwor, near Everest Hotel'),
      amenities: ['WiFi', 'Parking', 'AC', 'Elevator', 'Generator', 'Reception'],
      typeFields: { officeType: 'private', sqft: 1200, totalRooms: 4, meetingRooms: 1, dedicatedInternet: true, liftAvailable: true, parkingSlots: 5, fireSafetyCertified: true },
      isVerified: true,
      isFeatured: true,
    },
    {
      ownerId: o3._id,
      type: 'office' as const,
      title: 'Co-working Desks — Pulchowk',
      description:
        'Flexible co-working space near IOE Pulchowk. Hot desks, meeting room, generator backup, and great community.',
      price: 12000,
      negotiable: false,
      location: loc('pulchowk', 'Pulchowk, near IOE Campus'),
      amenities: ['WiFi', 'AC', 'Generator', 'Drinking Water', 'Reception'],
      typeFields: { officeType: 'coworking', sqft: 800, totalRooms: 1, meetingRooms: 2, dedicatedInternet: true, liftAvailable: false, parkingSlots: 3, fireSafetyCertified: true },
      isVerified: true,
    },

    // --- 2 Business spaces ---
    {
      ownerId: o3._id,
      type: 'business' as const,
      title: 'Ground-floor Shop — Koteshwor Chowk',
      description:
        'High-foot-traffic corner shop at Koteshwor Chowk. Excellent road frontage and signage rights — ideal for retail.',
      price: 60000,
      negotiable: true,
      location: loc('koteshwor', 'Koteshwor Chowk, main road'),
      amenities: ['Security/CCTV', 'Generator', 'Drinking Water'],
      typeFields: { spaceType: 'shop', sqft: 600, roadFrontage: 22, floor: 'ground', footTraffic: 'high', cornerPlot: true, storageRoom: true, signageAllowed: true, minLeaseMonths: 12 },
      isVerified: true,
    },
    {
      ownerId: o1._id,
      type: 'business' as const,
      title: 'Restaurant Space — Bhaktapur Durbar Square',
      description:
        'Charming restaurant-ready space steps from Bhaktapur Durbar Square. Tourist footfall, storage room, signage allowed.',
      price: 55000,
      negotiable: true,
      location: loc('bhaktapur', 'Durbar Square area'),
      amenities: ['Hot Water', 'Drinking Water', 'Security/CCTV'],
      typeFields: { spaceType: 'restaurant', sqft: 750, roadFrontage: 15, floor: 'ground', footTraffic: 'high', cornerPlot: false, storageRoom: true, signageAllowed: true, minLeaseMonths: 24 },
      isVerified: false,
    },
  ]

  const listings = await Listing.create(
    listingsData.map((l) => ({ ...l, viewCount: Math.floor(Math.random() * 200) + 10 }))
  )
  console.log(`[Seed] Created ${listings.length} listings`)

  // ---- Contact requests (a few accepted) ----
  console.log('[Seed] Creating contact requests...')
  const accepted: { tenant: typeof tenants[number]; listing: typeof listings[number] }[] = [
    { tenant: tenants[0], listing: listings[1] }, // Anjali → Girls hostel (Sushila)
    { tenant: tenants[1], listing: listings[0] }, // Bishal → Boys hostel (Rajesh)
    { tenant: tenants[3], listing: listings[3] }, // Priya → 2BHK (Sushila)
  ]

  const acceptedRequests = await Promise.all(
    accepted.map(({ tenant, listing }) =>
      ContactRequest.create({
        tenantId: tenant._id,
        ownerId: listing.ownerId,
        listingId: listing._id,
        message: `Namaste, I am interested in "${listing.title}". Is it still available for a visit?`,
        status: 'accepted',
        respondedAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 47 * 3600000),
      })
    )
  )

  // a couple of pending ones too
  await ContactRequest.create([
    {
      tenantId: tenants[2]._id,
      ownerId: listings[6].ownerId,
      listingId: listings[6]._id,
      message: 'Hi, is the private office suite open for a tour this week?',
      status: 'pending',
      expiresAt: new Date(Date.now() + 40 * 3600000),
    },
    {
      tenantId: tenants[4]._id,
      ownerId: listings[8].ownerId,
      listingId: listings[8]._id,
      message: 'Interested in the Koteshwor shop for a mobile accessories store.',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 3600000),
    },
  ])

  // ---- Reviews (only on accepted requests) ----
  console.log('[Seed] Creating reviews...')
  const reviewTexts = [
    'The room was exactly as pictured. Very clean and the staff is incredibly helpful.',
    'Secure gates and the food tastes just like home. Highly recommended for students.',
    'Spacious, sunny, and the owner was very responsive throughout. Smooth move-in.',
  ]
  for (let i = 0; i < acceptedRequests.length; i++) {
    const req = acceptedRequests[i]
    const rating = [5, 5, 4][i]
    await Review.create({
      tenantId: req.tenantId,
      ownerId: req.ownerId,
      listingId: req.listingId,
      contactRequestId: req._id,
      rating,
      comment: reviewTexts[i],
    })
    // keep listing aggregates consistent
    await Listing.findByIdAndUpdate(req.listingId, {
      averageRating: rating,
      totalReviews: 1,
    })
  }

  console.log('\n[Seed] ✅ Done!')
  console.log('  Admin:  admin@baaskhoj.com / Admin@123')
  console.log('  Owners: rajesh@ / sushila@ / bibek@baaskhoj.com / Owner@123')
  console.log('  Tenants: anjali@ / bishal@ / sandeep@ / priya@ / suresh@baaskhoj.com / Tenant@123')

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error('[Seed] Failed:', err)
  process.exit(1)
})
