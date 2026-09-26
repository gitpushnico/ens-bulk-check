export const GRACE_PERIOD_SECONDS = 90 * 24 * 60 * 60;
export const PREMIUM_WINDOW_SECONDS = 21 * 24 * 60 * 60;
export const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export type NameStatus =
  | "registered"
  | "grace"
  | "premium"
  | "available"
  | "invalid";

export function classifyName(input: {
  expires: bigint;
  available: boolean;
  premiumWei: bigint;
  labelChars: number;
  now: number;
  readFailed?: boolean;
}): NameStatus {
  if (input.readFailed) return "invalid";
  const now = BigInt(input.now);
  if (input.expires > now) return "registered";
  if (!input.available && input.expires > 0n) return "grace";
  if (input.expires === 0n && input.labelChars < 3) return "invalid";
  if (input.premiumWei > 0n) return "premium";
  return "available";
}

export function graceEndsAt(expires: bigint): number {
  if (expires <= 0n) return 0;
  return Number(expires) + GRACE_PERIOD_SECONDS;
}

export function premiumEndsAt(expires: bigint): number {
  if (expires <= 0n) return 0;
  return Number(expires) + GRACE_PERIOD_SECONDS + PREMIUM_WINDOW_SECONDS;
}
