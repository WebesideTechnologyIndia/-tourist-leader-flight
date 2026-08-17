# TouristLeader.com ✈️

A MakeMyTrip-style, fully responsive flight booking platform.
**Make travel caring, seamless, and sustainable — Comfort before, during, and after take off.**

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma · TiDB Cloud (MySQL)**.

## Quick start

```bash
npm install
npx prisma generate
npx prisma db push        # syncs schema to TiDB
npm run dev               # https://localhost:3001 (self-signed cert via mkcert)
```

## What's implemented (full flight workflow)

| Step | Route | Highlights |
|------|-------|-----------|
| Homepage | `/` | Nav tabs (Flights/Hotels/Holidays/Trains/Bus/Visa), trip-type tabs (One Way / Round Trip / Multi-City) each with info popup, **passenger-type dropdown** (Regular, Student, Senior, Disability, Mothers, Armed Forces, Medical, Minor, Group 4+) each with eligibility/benefit/document info popups, searchable airport selectors with swap, date pickers, traveller & cabin-class selector, animated **offers carousel** |
| Search results | `/flights/search` | **Fare calendar** (±7 days, cheapest highlighted), sort (Cheapest/Fastest/Earliest/Late/Your Choice with info), full **filter panel** (airlines, stops, time, price slider, refundable), flight cards |
| View Prices | (inline) | Expands **4 fare types** — Fee Saver / Regular / Comfort / Your Choice — with baggage, seat, meal, cancellation details |
| Booking details | `/flights/book` | Flight summary, fare breakdown, promo code + offers, ID requirements / cancellation / wheelchair info popups |
| Travellers | `/flights/passengers` | Per-passenger form, special-assistance, contact, tooltips, save-profile |
| Seats | `/flights/seats` | Interactive **aircraft seat map** (available/premium/booked/selected, prices on hover, per-passenger, skip option) |
| Meals | `/flights/meals` | Veg / Non-veg / Dry fruits / Fruit basket / Special, per-passenger, info popups |
| Payment | `/flights/payment` | UPI / Card / Net banking / Wallet / EMI, bank offers, secure-pay |
| Confirmation | `/flights/confirmation` | Booking ID + PNR, baggage & cancellation rules, PDF/calendar/share/invoice, **add cab** + **airport services** popups, confirmation email |

Responsive across mobile → desktop (mobile filter drawer, sticky summaries, fluid grids).

## Architecture

- `src/lib/benzy.ts` — Benzy Infotech (Akbar Travels B2B) client: **Signature → Bearer token → ExpressSearch/GetExpSearch**. Falls back to realistic generated fares until the API IP is whitelisted (see below).
- `src/lib/mock-flights.ts` — deterministic flight + fare-calendar generator (seeded per route/date).
- `src/lib/mailer.ts` — Gmail SMTP (nodemailer) booking confirmation email.
- `src/lib/blob.ts` — Vercel Blob image upload/list/delete helper.
- `src/store/booking.ts` — Zustand store (persisted) carrying selection across the booking flow.
- `prisma/schema.prisma` — `User`, `TravellerProfile`, `Booking`, `SearchCache` on TiDB Cloud.
- `src/app/api/flights/search` & `src/app/api/bookings` — API routes (search + create booking with DB write + email).

## ⚠️ Action items before going live

0. **Turn on flight ticketing — `FLIGHT_BOOKING_LIVE=1`.** Checkout issues the PNR through the
   supplier (`src/lib/flight-booking.ts` → Amadeus `runBookingFlow` / Benzy `runBookingFlow`);
   nothing is generated locally. Ticketing spends real money — Amadeus issues an e-ticket and
   Benzy's StartPay draws on the agent Deposit wallet — so it sits behind its own flag on top of
   `AMADEUS_LIVE` / `BENZY_LIVE`, the same way `BUS_BOOKING_LIVE` guards the bus wallet.
   **With the flag unset, every flight booking is refused** rather than confirmed with a fake PNR.
   Set it only after one live ticket has been verified end to end against the certification host.
1. **Whitelist the deployment's static IP with Benzy** (email `apisupport@benzyinfotech.com`,
   `Deepak@benzyinfotech.com`, cc `api@akbartravelsonline.com`, `Jyoti.varma@akbatravels.com`).
   Until then the app serves clearly-labelled *demo fares* and live calls are skipped gracefully.
   Once whitelisted, finish the response mapping in `normalizeBenzyFlights()` against a real
   ExpressSearch sample from the WRC portal.
2. **Set the real Gmail address** in `.env` → `SMTP_USER` / `MAIL_FROM`. The app password from the
   screenshot is configured, but the matching Gmail account address is unknown — Gmail currently
   rejects login (`535 BadCredentials`) because the username is a placeholder.
3. **Rotate the shared secrets.** The TiDB password, Benzy credentials and Gmail app password were
   shared in plaintext; rotate them and load via your hosting provider's secret manager.
4. **TiDB database** uses the `test` schema (the provided `sys` is a protected system DB).

## Env

See `.env.example`. Secrets live in `.env` (gitignored).
