# BaasKhoj — Find Your Perfect Space in Nepal

> A trust-first room & space finding platform for Nepal. Tenants discover verified
> hostels, rooms/flats, offices, and business spaces — and reach owners through a
> **protected contact system**, with **no middlemen** and **no exposed phone numbers**
> until an owner accepts.

**BaasKhoj** ("baas" = lodging/shelter, "khoj" = search, in Nepali) is a final-year
capstone project built to solve the everyday friction of finding rental space in
Kathmandu and across Nepal.

---

## The problem (Nepal context)

Finding a room in Nepal today usually means:

- **Brokers (dalals)** charging 50–100% of one month's rent just to show a place.
- **Phone numbers posted publicly** on Facebook/OLX → owners get spammed; numbers go dead.
- **Fake listings** with stolen photos and "advance deposit" scams.
- **No way to verify** that the person on the phone actually owns the property.
- Hostel ads that don't say whether it's **boys-only / girls-only**, has **meals**, or a **curfew**.

BaasKhoj fixes these with verified owners (KYC), a protected contact flow, type-specific
listing fields, and an in-app chat that only unlocks after an owner accepts a request.

---

## Features

### Auth & roles
- Email + password registration with JWT auth.
- Roles: **`user`** (default) · **`owner`** (granted only via admin KYC approval) · **`admin`**.
- Profile management with Cloudinary photo upload.
- Rate-limited login (5 failed attempts / 15 min) to block credential stuffing.

### KYC — verified owners
- Anyone registers as a `user`. To list properties they apply via a **3-step KYC**:
  personal info → citizenship front/back + selfie-with-ID upload → review & submit.
- Admin reviews each application (document viewer + approve/reject with reason).
- Approval flips the user's role to `owner` — the **only** path to becoming an owner.

### Listings
- Full CRUD with **4 space types**, each with its own fields:
  - **Hostel** — gender, room type, beds, meals, curfew, nearby college
  - **Room/Flat** — BHK, furnished status, deposit, min stay, floor, sq ft, pets
  - **Office** — office type, sq ft, meeting rooms, lift, parking slots, fire safety
  - **Business** — space type, sq ft, road frontage, foot traffic, signage, lease term
- Up to 10 images per listing via Cloudinary (5 MB each).
- Amenities checklist, verified badge, pause/mark-as-rented toggle.

### Search & discovery
- Filters: type, district, price range, amenities (multi-select), **dedicated parking toggle**, verified-only.
- Geospatial `$near` search (MongoDB 2dsphere) for "near me" / near-a-college queries.
- Grid / Map view toggle, sort (newest, price, rating), pagination.
- Wishlist (bookmark listings).

### Protected contact system (the core differentiator)
- Tenant sends a contact request with a message → status `pending`.
- Owner gets an in-app notification (+ SMS hook) and sees the tenant's profile.
- Owner **Accept** / **Reject**. Owner phone + WhatsApp link are revealed **only on accept**.
- Requests **auto-expire after 48 hours** via an hourly cron job.
- Multi-state UI on the listing page: logged-out / own-listing / pending / accepted / retryable.

### Real-time chat
- Socket.io chat that unlocks **only after a request is accepted**.
- JWT handshake auth, per-conversation room access control, typing indicator, read receipts.

### Reviews, notifications, admin
- 1–5 star reviews — only the tenant of an accepted request can review (no fake reviews).
- In-app notification bell with unread count.
- Admin panel: stats, KYC queue, listing verification, reports, user ban/unban.

---

## Tech stack (and why)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 14 (App Router) + TypeScript** | SSR-ready, file-based routing, great DX, type safety end-to-end |
| Styling | **Tailwind CSS** + Hanken Grotesk | Utility-first, consistent design tokens (forest-green `#064E3B` system) |
| Forms | **React Hook Form + Zod** | Performant forms + schema validation that mirrors the backend |
| Maps | **Leaflet + OpenStreetMap** | Free, no API key, works well for Nepal coordinates |
| Backend | **Node.js + Express + TypeScript** | Mature, simple middleware model, strict typing |
| Database | **MongoDB + Mongoose** | Flexible schema fits 4 different listing types; native geospatial `$near` |
| Auth | **JWT (jsonwebtoken) + bcrypt** | Stateless auth; tiny token payload (userId + role only) |
| Realtime | **Socket.io** | Room-based chat, reconnection, fallback transports |
| Images | **Cloudinary** | Offloads storage/CDN; required on read-only hosts (Render/Vercel) |
| Security | helmet, express-rate-limit, express-mongo-sanitize | Headers, throttling, NoSQL-injection guard |
| Cron | **node-cron** | Hourly auto-expiry of stale contact requests |

---

## Project structure

```
roomfind/
├── server/                 # Express + TypeScript API
│   ├── src/
│   │   ├── models/         # User, Listing, ContactRequest, Message, Review, Notification, Kyc
│   │   ├── controllers/    # auth, listing, contact, review, notification, admin, kyc
│   │   ├── routes/         # one router per resource
│   │   ├── middleware/     # auth (JWT), role gate, multer upload
│   │   ├── socket/         # Socket.io chat
│   │   ├── utils/          # jwt, cloudinary, rateLimit, cronJobs, escapeRegex, ...
│   │   └── server.ts       # app bootstrap (DB-first, then listen)
│   └── scripts/            # migrate-tenant-role.ts, seed.ts
└── client/                 # Next.js 14 frontend
    ├── app/                # routes (landing, auth, listings, dashboard, admin)
    ├── components/         # landing, listings, listing-detail, dashboard, kyc, admin, messages
    ├── lib/axios.ts        # axios instance w/ JWT interceptor
    └── types/              # shared TS interfaces (mirror server)
```

---

## Local setup

### Prerequisites
- Node.js 18+ (tested on Node 22)
- MongoDB running locally **or** a MongoDB Atlas connection string
- A free Cloudinary account (for image uploads)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env        # then fill in the values (see below)
# generate a strong JWT secret:
openssl rand -hex 64        # paste into JWT_SECRET=
npm run dev                 # http://localhost:5050
```

Expected boot log:
```
[DB] MongoDB connected: 127.0.0.1/baskhoj
[Cron] Scheduled: expire pending contact requests (hourly)
[Server] Running on http://localhost:5050
[Server] Socket.io: ws://localhost:5050
```

### 2. Frontend

```bash
cd client
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:5050" > .env.local
npm run dev                 # http://localhost:3000
```

### 3. Seed demo data (optional but recommended)

```bash
cd server
npm run seed                # creates admin, owners, tenants, listings, requests, reviews
```

> In development, the API allows any `localhost:<port>` origin, so if Next.js falls back
> to port 3001 (when 3000 is busy) it still works.

---

## Environment variables

### `server/.env`

| Variable | Required | Description |
|---|---|---|
| `PORT` | no | API port (default `5050`) |
| `NODE_ENV` | no | `development` / `production` |
| `MONGODB_URI` | **yes** | Mongo connection string |
| `JWT_SECRET` | **yes** | Long random string (`openssl rand -hex 64`) |
| `JWT_EXPIRES_IN` | no | Token lifetime (default `7d`) |
| `ALLOWED_ORIGINS` | prod | Comma-separated frontend origins (prod + staging + preview) |
| `FRONTEND_URL` | no | Legacy single-origin fallback |
| `CLOUDINARY_CLOUD_NAME` | for uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | for uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | for uploads | Cloudinary API secret |
| `SPARROW_SMS_TOKEN` | Phase 2 | Sparrow SMS (Nepal) token |
| `ESEWA_MERCHANT_CODE` | Phase 2 | eSewa merchant code |
| `KHALTI_SECRET_KEY` | Phase 2 | Khalti secret key |
| `RATE_LIMIT_ENABLED` / `RATE_LIMIT_DISABLED` | no | Force rate limiting on/off (default: on in prod only) |

### `client/.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **yes** | Backend base URL (e.g. `http://localhost:5050`) |

---

## Demo credentials

After running `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@baaskhoj.com` | `Admin@123` |
| Owner | `rajesh@baaskhoj.com` | `Owner@123` |
| Owner | `sushila@baaskhoj.com` | `Owner@123` |
| Owner | `bibek@baaskhoj.com` | `Owner@123` |
| Tenant | `anjali@baaskhoj.com` | `Tenant@123` |
| Tenant | `bishal@baaskhoj.com` | `Tenant@123` |

> Admin lands on `/admin`; owners and tenants land on `/dashboard`.

---

## Known limitations

- **Payments not live** — eSewa/Khalti integration (for featured listings) is stubbed.
- **SMS not live** — Sparrow SMS is a console stub; phone OTP verification shows "coming soon".
- **Google OAuth** — button is present, backend route not implemented.
- **Map view** — the search "Map" toggle is a placeholder; pins/clustering land in Phase 2.
- **Cloudinary cleanup** — orphaned assets are deleted best-effort (fire-and-forget), no sweep job.
- **No refresh tokens** — JWTs last 7 days; expiry means a hard re-login.
- **No automated tests** — manual + typecheck only (Jest/Supertest planned).
- **Next.js advisories** — pinned to 14.2.x (latest stable 14); upstream CVEs are fixed only in 15+/16 which require a React 19 migration, deferred for this academic build.

---

## Future roadmap (Phase 2)

- **Payments**: eSewa / Khalti for featured listings + a small "verified owner" fee.
- **SMS + OTP**: real Sparrow SMS for contact alerts and phone verification.
- **Interactive map**: Leaflet pins + clustering on search, "draw area to search".
- **Visit scheduling**: tenant proposes a date/time, owner confirms.
- **Roommate finder**: post "looking for roommate" with budget/area/lifestyle matching.
- **Nepali/English i18n** toggle.
- **PWA + push notifications**.
- **Owner response-rate** badges ("usually replies within 2 hours").
- **Refresh-token** rotation + email verification on signup.
- **Test suite**: Jest + Supertest (API), Playwright (critical user flows).

---

## License

Academic / educational project. © 2026 BaasKhoj.
