# EarnFlow

GPT-style rewards platform — offers, surveys, games, faucet, referrals, cashout, live support, and admin panel.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- MongoDB / Mongoose

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Configure `MONGODB_URI`, `ADMIN_EMAIL`, and `ADMIN_SECRET` in `.env.local`. See `.env.example` for optional mail / offerwall secrets.

## Notes

- Economy rate: **1000 coins = $1**
- Admin panel: `/admin`
- Dashboard: `/dashboard` (after sign in)
- PubScale offerwall setup notes: [docs/PUBSCALE.md](docs/PUBSCALE.md)
