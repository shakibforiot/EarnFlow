# PubScale Integration Setup Guide

এই ফাইলটি EarnFlow/Freecash-style rewards website-এর জন্য PubScale Web Offerwall এবং Sandbox integration setup করার নির্দেশনা।

## 1. গুরুত্বপূর্ণ বিষয়

PubScale-এ সরাসরি এই URL ব্যবহার করা যাবে না:

```text
http://localhost:3000
```

কারণ `localhost` শুধু নিজের কম্পিউটারে কাজ করে। PubScale-এর server তোমার local website access করতে পারে না।

তাই আগে website-কে temporary public HTTPS URL দিতে হবে।

উদাহরণ:

```text
https://your-project.onrender.com
```

---

## 2. Website Public করার পদ্ধতি

### Option A: Temporary Hosting

Frontend হলে:

- Netlify
- Vercel

Node.js/Express backend থাকলে:

- Render
- Railway

Deploy করার পরে একটি public URL পাওয়া যাবে:

```text
https://your-project-name.onrender.com
```

এই URL PubScale-এর Website URL field-এ দিতে হবে।

### Option B: Localhost Tunnel

Testing-এর জন্য Cloudflare Tunnel বা ngrok ব্যবহার করা যায়।

Local URL:

```text
http://localhost:3000
```

Public URL:

```text
https://temporary-public-url.com
```

Tunnel বন্ধ করলে public URL আর কাজ করবে না।

---

## 3. PubScale App Setup

1. PubScale dashboard-এ login করো।
2. `Add your app` নির্বাচন করো।
3. Platform হিসেবে `Website` নির্বাচন করো।
4. Website URL field-এ public HTTPS URL বসাও।
5. `Import Website Info` চাপো।
6. Website information import হলে app add করো।
7. App ID এবং Pub-Key সংগ্রহ করো।
8. প্রথমে Sandbox mode ব্যবহার করো।
9. Production mode চালু করার আগে integration সম্পূর্ণ test করো।

> Note: PubScale-এর live Web Offerwall বা API integration-এর জন্য approval প্রয়োজন হতে পারে। Approval না পাওয়া পর্যন্ত Sandbox ব্যবহার করো।

---

## 4. Environment Variables

Sensitive information কখনো frontend code-এ রাখবে না।

Backend project-এর `.env` ফাইলে রাখো:

```env
PUBSCALE_APP_ID=
PUBSCALE_PUB_KEY=
PUBSCALE_S2S_SECRET=
PUBSCALE_SANDBOX=true
PUBSCALE_CALLBACK_URL=
```

### Example

```env
PUBSCALE_APP_ID=your_app_id
PUBSCALE_PUB_KEY=your_public_key
PUBSCALE_S2S_SECRET=your_callback_secret
PUBSCALE_SANDBOX=true
PUBSCALE_CALLBACK_URL=https://your-domain.com/api/pubscale/callback
```

`.env` ফাইল GitHub-এ upload করবে না।

`.gitignore` ফাইলে যোগ করো:

```gitignore
.env
.env.*
!.env.example
```

---

## 5. Required Backend Routes

Backend-এ নিচের route তৈরি করা উচিত:

```text
GET  /api/pubscale/offerwall
GET  /api/pubscale/offers
POST /api/pubscale/callback
GET  /api/pubscale/transactions
GET  /api/pubscale/health
```

### Route কাজ

- `/offerwall` — user-এর জন্য offerwall configuration তৈরি করবে।
- `/offers` — custom offer list আনবে, যদি Offers API ব্যবহার করা হয়।
- `/callback` — PubScale-এর S2S reward callback গ্রহণ করবে।
- `/transactions` — user-এর reward history দেখাবে।
- `/health` — integration কাজ করছে কি না check করবে।

---

## 6. Web Offerwall বনাম Offers API

### Web Offerwall

প্রথম integration-এর জন্য Web Offerwall সবচেয়ে সহজ।

সুবিধা:

- দ্রুত setup করা যায়।
- PubScale offerwall নিজেই manage করে।
- Website-এর মধ্যে iframe বা direct offerwall link ব্যবহার করা যায়।
- Custom offer card বানানোর প্রয়োজন কম।

### Offers API

Website-এর নিজের design-এর মধ্যে offer card দেখাতে চাইলে Offers API ব্যবহার করা যায়।

সুবিধা:

- নিজের UI design করা যায়।
- Category, reward এবং offer details নিজের মতো দেখানো যায়।
- User experience বেশি custom করা যায়।

প্রথমে Web Offerwall দিয়ে test করে পরে Offers API যোগ করা ভালো।

---

## 7. S2S Callback Security

Reward দেওয়ার সময় frontend-এর amount বিশ্বাস করবে না।

শুধুমাত্র verified PubScale callback পাওয়ার পরে balance update করবে।

Callback processing-এর নিয়ম:

1. Request গ্রহণ করো।
2. Signature বা hash verify করো।
3. App ID এবং user ID validate করো।
4. Transaction ID check করো।
5. একই transaction আগে process হয়েছে কি না দেখো।
6. Valid হলে wallet balance update করো।
7. Wallet transaction log তৈরি করো।
8. Callback response পাঠাও।

### Duplicate Protection

একই transaction ID দ্বিতীয়বার process করা যাবে না।

Database-এ unique index ব্যবহার করো:

```text
providerTransactionId
```

---

## 8. MongoDB Collections

প্রয়োজন অনুযায়ী নিচের collection ব্যবহার করা যেতে পারে:

### users

```text
_id
name
email
balance
totalEarned
createdAt
```

### offer_clicks

```text
_id
userId
provider
offerId
clickedAt
```

### offer_completions

```text
_id
userId
provider
offerId
providerTransactionId
rewardAmount
status
createdAt
updatedAt
```

### wallet_transactions

```text
_id
userId
type
amount
provider
referenceId
status
description
createdAt
```

### callback_logs

```text
_id
provider
payload
signatureValid
processed
error
createdAt
```

---

## 9. User ID Rules

প্রতিটি user-এর জন্য stable unique ID ব্যবহার করতে হবে।

ভালো উদাহরণ:

```text
user_64f8a21d
```

Email, password বা অন্য sensitive information PubScale-এর user ID হিসেবে পাঠাবে না।

একজন user-এর user ID বারবার পরিবর্তন করা যাবে না। এতে reward tracking নষ্ট হতে পারে।

---

## 10. Frontend UI

Dashboard-এ একটি section তৈরি করো:

```text
Earn Offers
```

এখানে দেখাবে:

- Available offers
- Reward amount
- Offer status
- Completed offers
- Pending rewards
- Total earned
- Sandbox mode label
- Loading state
- Empty state
- Error state

Sandbox mode চালু থাকলে স্পষ্টভাবে দেখাবে:

```text
Sandbox Mode
Test rewards only. No real earnings.
```

---

## 11. Testing Checklist

### Website

- [ ] Website public HTTPS URL-এ open হচ্ছে।
- [ ] PubScale Website URL accept করছে।
- [ ] App ID সঠিক।
- [ ] Pub-Key সঠিক।
- [ ] Sandbox mode চালু।
- [ ] Logged-in user ID সঠিকভাবে পাঠানো হচ্ছে।
- [ ] Offerwall mobile responsive।
- [ ] Offer click log হচ্ছে।
- [ ] Callback URL public।
- [ ] Callback signature verify হচ্ছে।
- [ ] Duplicate transaction আটকানো হচ্ছে।
- [ ] Wallet balance সঠিকভাবে update হচ্ছে।
- [ ] Admin callback logs দেখতে পারছে।

---

## 12. Production Launch Checklist

Website publish করার পরে:

1. Production domain PubScale dashboard-এ add করো।
2. Production callback URL সেট করো।
3. Sandbox mode বন্ধ করো।
4. Production credentials `.env` ফাইলে বসাও।
5. HTTPS চালু রাখো।
6. Callback endpoint public রাখো।
7. Error logging চালু রাখো।
8. Duplicate reward protection test করো।
9. Admin approval এবং withdrawal system test করো।
10. সব test শেষ হলে live offerwall চালু করো।

---

## 13. Security Rules

- Pub-Key বা secret frontend-এ রাখবে না।
- `.env` GitHub-এ push করবে না।
- Frontend থেকে balance update allow করবে না।
- Callback signature verify ছাড়া reward দেবে না।
- একই transaction ID একাধিকবার process করবে না।
- User নিজের ID পরিবর্তন করে reward নিতে পারবে না।
- Admin ছাড়া balance manually edit করার সুযোগ সীমিত রাখবে।
- Callback payload এবং error log সংরক্ষণ করবে।
- Production এবং Sandbox environment আলাদা রাখবে।

---

## 14. Recommended Workflow

```text
Local Website
     ↓
Temporary Public HTTPS URL
     ↓
PubScale Website App
     ↓
Sandbox Web Offerwall
     ↓
S2S Callback Testing
     ↓
Wallet Transaction Testing
     ↓
Production Domain
     ↓
PubScale Approval
     ↓
Live Offerwall
```

---

## 15. Final Note

Website এখনো publish না হলেও development শুরু করা যাবে। তবে PubScale-এর server থেকে website এবং callback endpoint access করার জন্য temporary public HTTPS URL প্রয়োজন।

প্রথমে Sandbox Web Offerwall integrate করো। Integration সম্পূর্ণ stable হলে production domain এবং live credentials ব্যবহার করো।
