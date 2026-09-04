import { COINS_PER_USD } from "@/lib/economy";

export type BotReply = {
  text: string;
  escalate: boolean;
  confidence: "high" | "low";
};

type Rule = {
  keys: string[];
  answer: string;
};

const RULES: Rule[] = [
  {
    keys: ["cashout", "cash out", "withdraw", "payout", "টাকা তুল", "উইথড্র", "ক্যাশআউট"],
    answer: `Cash out steps:
1) Finish your Profile (email verify, country, payout method, phone, KYC).
2) Open Dashboard → Cash Out.
3) Pick PayPal / crypto / gift card and enter USD amount.
Rate: ${COINS_PER_USD.toLocaleString()} coins = $1.00.
Admin reviews pending requests before payment.`,
  },
  {
    keys: ["coin", "rate", "usd", "$", "ডলার", "কয়েন", "1000"],
    answer: `EarnFlow rate is fixed: ${COINS_PER_USD.toLocaleString()} coins = $1.00 USD.
Example: 5,000 coins ≈ $5.00.`,
  },
  {
    keys: ["faucet", "daily free", "daily", "ফসেট", "ডেইলি"],
    answer: `Daily Free (faucet): open Dashboard → Daily Free and claim when the timer is ready.
Cooldown and coin amount are set by admin (Controls). Keep your streak for bonus coins.`,
  },
  {
    keys: ["redeem", "promo", "code", "কুপন", "রিডিম", "কোড"],
    answer: `Redeem promo codes from Dashboard → Redeem.
Enter the code exactly. Each code may have a max use limit or expiry set by admin.`,
  },
  {
    keys: ["kyc", "verify", "verification", "nid", "ভেরিফাই", "কেওয়াইসি"],
    answer: `KYC / verification lives in Profile.
Verify email with the code we send, add phone + country, then submit KYC docs.
Cash out stays locked until profile steps are complete.`,
  },
  {
    keys: ["leaderboard", "rank", "prize", "লিডারবোর্ড", "র‍্যাঙ্ক"],
    answer: `Leaderboard ranks users by coin balance.
Prizes for top places are set by admin (Admin → Leaderboard).
Open Dashboard → Leaderboard to see live ranks and prize pool.`,
  },
  {
    keys: ["offer", "survey", "task", "wall", "অফার", "সার্ভে", "টাস্ক"],
    answer: `Earn coins from Offers, Surveys, and Games in the dashboard.
Complete a task, then claim. Admin adds live offers from Catalog.`,
  },
  {
    keys: ["ban", "banned", "freeze", "locked", "ব্যান", "লক"],
    answer: `If your account is banned or frozen you cannot earn or cash out.
Common reasons: multi-account on same IP, abuse, or admin action.
Only an admin can unban — tap “Talk to admin” and explain your case.`,
  },
  {
    keys: ["ip", "multi", "account", "duplicate", "মাল্টি"],
    answer: `EarnFlow allows one account per IP.
A second signup from the same IP can be blocked or banned.
Use one account only. Need help? Ask admin.`,
  },
  {
    keys: ["streak", "স্ট্রিক"],
    answer: `Claim Daily Free every day to keep your streak.
Miss a day and the streak resets. Streak bonus size is controlled in Admin → Controls.`,
  },
  {
    keys: ["profile", "email", "paypal", "crypto", "প্রোফাইল"],
    answer: `Profile checklist for cash out:
• Verify email
• Country / district
• Phone
• PayPal email or crypto address
• KYC (if required)
Edit everything from Dashboard → Profile.`,
  },
  {
    keys: ["hello", "hi", "hey", "salam", "হ্যালো", "হাই", "আসসালাম"],
    answer: `Hi! I'm EarnFlow Support Bot.
Ask me about cash out, coins rate, faucet, redeem codes, KYC, offers, or leaderboard.
Type "admin" anytime to talk to a human.`,
  },
  {
    keys: ["thank", "thanks", "ধন্যবাদ", "শুকরিয়া"],
    answer: `You're welcome! Anything else I can help with?`,
  },
];

const ESCALATE_KEYS = [
  "admin",
  "human",
  "agent",
  "support staff",
  "real person",
  "talk to admin",
  "speak to admin",
  "অ্যাডমিন",
  "এডমিন",
  "মানুষ",
  "হেল্প ডেস্ক",
];

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function scoreRule(text: string, rule: Rule) {
  let hits = 0;
  for (const k of rule.keys) {
    if (text.includes(k.toLowerCase())) hits += 1;
  }
  return hits;
}

export function generateBotReply(userText: string): BotReply {
  const text = normalize(userText);
  if (!text) {
    return {
      text: "Send a short question — cash out, coins, faucet, codes, KYC…",
      escalate: false,
      confidence: "high",
    };
  }

  if (ESCALATE_KEYS.some((k) => text.includes(k))) {
    return {
      text: `Okay — connecting you to an admin now.
Please wait; an admin will reply in this same chat.
Meanwhile you can keep typing your issue.`,
      escalate: true,
      confidence: "high",
    };
  }

  let best: Rule | null = null;
  let bestScore = 0;
  for (const rule of RULES) {
    const s = scoreRule(text, rule);
    if (s > bestScore) {
      bestScore = s;
      best = rule;
    }
  }

  if (best && bestScore > 0) {
    return {
      text: best.answer,
      escalate: false,
      confidence: bestScore >= 2 ? "high" : "high",
    };
  }

  return {
    text: `I'm not fully sure about that.
I flagged this chat for an admin — they'll reply here soon.
You can also type clearer keywords like: cashout, faucet, redeem, KYC, leaderboard.`,
    escalate: true,
    confidence: "low",
  };
}

export const BOT_WELCOME = `Welcome to EarnFlow Live Support.

I'm the support bot. I can help with:
• Cash out & ${COINS_PER_USD} coins = $1
• Daily Free / streak
• Redeem codes
• Profile & KYC
• Leaderboard prizes

Type your question — or say "admin" to talk to a human.`;
