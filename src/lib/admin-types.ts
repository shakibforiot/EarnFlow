export type AdminSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  forceErrorMode: boolean;
  faucetCoins: number;
  faucetCooldownSec: number;
  minCashoutUsd: number;
  cashoutEnabled: boolean;
  streakBaseReward: number;
  streakEnabled: boolean;
  landingHeadline: string;
  landingSubheadline: string;
  landingCta: string;
  leaderboardEnabled: boolean;
  leaderboardTitle: string;
  leaderboardLimit: number;
  rankPrizes: { place: number; coins: number; label: string }[];
  offers: Record<string, unknown>[];
  offerWalls: Record<string, unknown>[];
  surveys: Record<string, unknown>[];
};

export type AdminStats = {
  users: {
    total: number;
    active: number;
    banned: number;
    frozen: number;
    unverifiedEmail: number;
    kycPending: number;
  };
  cashouts: {
    pending: number;
    approved: number;
    pendingUsd: number;
    pendingCoins: number;
  };
  economy: {
    circulatingCoins: number;
    totalXp: number;
    redeemActive: number;
    faucetCoins: number;
    faucetCooldownSec: number;
    minCashoutUsd: number;
  };
  site: {
    maintenanceMode: boolean;
    forceErrorMode: boolean;
    cashoutEnabled: boolean;
    streakEnabled: boolean;
    offers: number;
    walls: number;
  };
  support: {
    waiting: number;
    open: number;
  };
  recent: {
    id: string;
    type: string;
    user: string;
    amount: string;
    source: string;
    createdAt: string;
  }[];
};

export type CashoutRow = {
  id: string;
  userId?: string;
  email: string;
  name: string;
  method: string;
  amountUsd: number;
  coins: number;
  status: string;
  createdAt: string;
};

export type CodeRow = {
  id: string;
  code: string;
  coins: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAt?: string | null;
};

export const ADMIN_SECRET_KEY = "earnflow_admin_secret";

export const ADMIN_NAV: {
  href: string;
  label: string;
  hint: string;
  exact?: boolean;
}[] = [
  { href: "/admin", label: "Home", hint: "Overview", exact: true },
  { href: "/admin/users", label: "Users", hint: "Full control" },
  { href: "/admin/cashouts", label: "Payouts", hint: "Cash outs" },
  { href: "/admin/redeem", label: "Codes", hint: "Redeem" },
  { href: "/admin/catalog", label: "Offers", hint: "Catalog" },
  { href: "/admin/leaderboard", label: "Leaderboard", hint: "Rank prizes" },
  { href: "/admin/chat", label: "Chat", hint: "Live support" },
  { href: "/admin/contact", label: "Inbox", hint: "Contact form" },
  { href: "/admin/landing", label: "Landing", hint: "Homepage" },
  { href: "/admin/controls", label: "Settings", hint: "Site controls" },
];

export function adminHeaders(secret: string) {
  return {
    "Content-Type": "application/json",
    "x-admin-secret": secret,
  };
}

export function ago(iso?: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
