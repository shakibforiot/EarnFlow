export type CashoutOption = { id: string; name: string };
export type StreakDay = { day: number; reward: string; highlight?: boolean };

/** Real payout methods shown on the landing page */
export const cashoutOptions: CashoutOption[] = [
  { id: "c1", name: "PayPal" },
  { id: "c2", name: "Visa" },
  { id: "c3", name: "Apple" },
  { id: "c4", name: "Amazon" },
  { id: "c5", name: "Bitcoin" },
  { id: "c6", name: "Ethereum" },
  { id: "c7", name: "Litecoin" },
  { id: "c8", name: "Dogecoin" },
  { id: "c9", name: "Google Play" },
  { id: "c10", name: "Starbucks" },
  { id: "c11", name: "Steam" },
  { id: "c12", name: "Bank" },
];

export const streakDays: StreakDay[] = [
  { day: 1, reward: "10" },
  { day: 2, reward: "15" },
  { day: 3, reward: "25" },
  { day: 4, reward: "40" },
  { day: 5, reward: "60" },
  { day: 6, reward: "80" },
  { day: 7, reward: "150", highlight: true },
];

export const howSteps = [
  {
    title: "Create your account",
    description: "Sign up free and verify your email to unlock earning features.",
  },
  {
    title: "Complete offers & surveys",
    description: "Browse offers, finish tasks, and collect coins as you go.",
  },
  {
    title: "Grab free bonuses",
    description: "Claim Daily Free coins and keep your streak for escalating rewards.",
  },
  {
    title: "Redeem codes & cash out",
    description: "Use promo codes for bonus coins, then withdraw when ready.",
  },
];

export const heroImage =
  "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1800&q=80";
