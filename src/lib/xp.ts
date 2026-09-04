/** Level = floor(xp / 100) + 1 (matches earn APIs) */
export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor((xp || 0) / 100) + 1);
}

export function xpProgress(xp: number) {
  const safe = Math.max(0, xp || 0);
  const level = levelFromXp(safe);
  const intoLevel = safe % 100;
  const need = 100;
  return {
    level,
    intoLevel,
    need,
    remaining: need - intoLevel,
    pct: Math.min(100, Math.round((intoLevel / need) * 100)),
  };
}
