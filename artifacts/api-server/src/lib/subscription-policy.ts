/**
 * Subscription expiry policy (single source of truth).
 *
 * Every paid activation, every renewal, and every access-code redeem grants
 * the same fixed-length subscription window starting at the moment of the
 * action. Re-anchoring (rather than extending the existing expiresAt) is the
 * spec's "New expiry date = current_date + N days" semantics.
 *
 * Admin grants intentionally bypass this policy and may set any expiresAt
 * (including null for lifetime access).
 */
export const SUBSCRIPTION_DAYS = 365;

export function subscriptionExpiryFromNow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SUBSCRIPTION_DAYS);
  return d;
}
