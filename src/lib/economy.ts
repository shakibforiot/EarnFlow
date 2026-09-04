/** EarnFlow economy: 1000 coins = $1.00 USD */
export const COINS_PER_USD = 1000;

export function coinsToUsd(coins: number): number {
  return (Number(coins) || 0) / COINS_PER_USD;
}

export function usdToCoins(usd: number): number {
  return Math.round((Number(usd) || 0) * COINS_PER_USD);
}
