export type OfferItem = {
  id: string;
  title: string;
  provider: string;
  reward: number;
  coins: number;
  category: "game" | "survey" | "offer" | "app" | "ptc";
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  featured?: boolean;
  image: string;
};

export type OfferWall = {
  id: string;
  name: string;
  description: string;
  offers: number;
  accent: string;
  image: string;
};

export type CashMethod = {
  id: string;
  name: string;
  min: string;
  fee: string;
};

export type DailyTask = {
  id: string;
  title: string;
  description: string;
  reward: number;
  kind: "faucet" | "offer" | "redeem" | "profile" | "streak";
};

/** Live catalog — empty until partner offerwalls are connected */
export const offerWalls: OfferWall[] = [];
export const offers: OfferItem[] = [];

export const dailyTasks: DailyTask[] = [
  {
    id: "task-faucet",
    title: "Claim Daily Free coins",
    description: "Use the faucet at least once today.",
    reward: 25,
    kind: "faucet",
  },
  {
    id: "task-profile",
    title: "Open your profile",
    description: "Visit Profile and review your settings.",
    reward: 15,
    kind: "profile",
  },
  {
    id: "task-streak",
    title: "Check in for streak",
    description: "Claim today’s streak bonus.",
    reward: 20,
    kind: "streak",
  },
];

export const cashMethods: CashMethod[] = [
  { id: "cm1", name: "PayPal", min: "$5.00", fee: "Free" },
  { id: "cm2", name: "Visa", min: "$10.00", fee: "Free" },
  { id: "cm3", name: "Bitcoin", min: "$3.00", fee: "Network" },
  { id: "cm4", name: "Ethereum", min: "$5.00", fee: "Network" },
  { id: "cm5", name: "Litecoin", min: "$3.00", fee: "Network" },
  { id: "cm6", name: "Amazon", min: "$5.00", fee: "Free" },
  { id: "cm7", name: "Google Play", min: "$5.00", fee: "Free" },
  { id: "cm8", name: "Apple", min: "$10.00", fee: "Free" },
  { id: "cm9", name: "Starbucks", min: "$5.00", fee: "Free" },
  { id: "cm10", name: "Bank Transfer", min: "$20.00", fee: "$1.00" },
];

export function getOfferById(id: string) {
  return offers.find((o) => o.id === id) ?? null;
}

export function formatCoins(n: number) {
  return n.toLocaleString();
}

export function formatUsd(n: number) {
  return `$${n.toFixed(2)}`;
}

/** Re-export economy helpers — 1000 coins = $1 */
export { COINS_PER_USD, coinsToUsd, usdToCoins } from "@/lib/economy";
