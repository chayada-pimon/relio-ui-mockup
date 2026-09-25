// Loyalty rules from the CRM Center customer brief (24 Sep 2026). These are the
// defaults; each company can change them in Settings.

import {
  TODAY,
  daysSince,
  orderSubtotal,
  ordersOf,
  type Order,
} from "@/lib/relio/data"
import { topCustomers } from "@/lib/relio/dashboard"

export type Tier = "silver" | "gold" | "platinum"

/** Baht per point, and the 12-month spend needed to reach the tier. */
export const TIER_RULES: {
  tier: Tier
  label: string
  rate: number
  minSpend: number
}[] = [
  { tier: "silver", label: "Silver", rate: 25, minSpend: 0 },
  { tier: "gold", label: "Gold", rate: 20, minSpend: 20_000 },
  { tier: "platinum", label: "Platinum", rate: 15, minSpend: 60_000 },
]

export const POINT_RULES = {
  /** Points wait this long after the order completes, in case of a return. */
  confirmDays: 7,
  expiryMonths: 12,
  /** Staff get the list of customers whose points expire within this window. */
  expiryNoticeDays: 30,
}

export function tierFor(spend12m: number) {
  return (
    [...TIER_RULES].reverse().find((t) => spend12m >= t.minSpend) ??
    TIER_RULES[0]
  )
}

export function nextTier(tier: Tier) {
  const i = TIER_RULES.findIndex((t) => t.tier === tier)
  return TIER_RULES[i + 1]
}

/** Points for an amount: after discounts, excluding shipping, fractions dropped. */
export function pointsFor(amount: number, tier: Tier) {
  const rule = TIER_RULES.find((t) => t.tier === tier) ?? TIER_RULES[0]
  return Math.floor(amount / rule.rate)
}

export type OrderPoints = {
  points: number
  /** available: usable now · pending: inside the 7-day window · none: not earned (yet) */
  state: "available" | "pending" | "none"
}

export function orderPoints(order: Order, tier: Tier): OrderPoints {
  const points = pointsFor(orderSubtotal(order), tier)
  if (order.status !== "delivered" || order.payment !== "paid") {
    return { points, state: "none" }
  }
  return {
    points,
    state:
      daysSince(order.date) >= POINT_RULES.confirmDays
        ? "available"
        : "pending",
  }
}

function spendLast12Months(customerId: string) {
  const known = topCustomers.find((t) => t.id === customerId)
  if (known) return known.spend12m
  const from = new Date(TODAY)
  from.setFullYear(from.getFullYear() - 1)
  return ordersOf(customerId)
    .filter((o) => o.status !== "cancelled" && new Date(o.date) >= from)
    .reduce((s, o) => s + orderSubtotal(o), 0)
}

export function customerLoyalty(customerId: string) {
  const spend12m = spendLast12Months(customerId)
  const tier = tierFor(spend12m)
  const next = nextTier(tier.tier)
  let available = 0
  let pending = 0
  for (const o of ordersOf(customerId)) {
    const p = orderPoints(o, tier.tier)
    if (p.state === "available") available += p.points
    if (p.state === "pending") pending += p.points
  }
  return { spend12m, tier, next, available, pending }
}
