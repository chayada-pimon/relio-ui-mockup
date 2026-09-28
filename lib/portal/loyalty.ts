// Point balances are derived, not stored: every completed order earns a lot,
// redemptions and deductions use up the oldest lots first, and lots expire
// after the company's expiry window. Mirrors the rules in the CRM Center overview.

import {
  addDays,
  addMonths,
  defaultLoyalty,
  orderNet,
  type LoyaltySettings,
  type Order,
  type TierRule,
} from "@/lib/portal/commerce"
import { today, type PortalData } from "@/lib/portal/data"

export function loyaltyOf(data: PortalData, companyId: string): LoyaltySettings {
  return data.loyalty.find((l) => l.companyId === companyId) ?? defaultLoyalty(companyId)
}

export function tierFor(settings: LoyaltySettings, spend12m: number): TierRule {
  const sorted = [...settings.tiers].sort((a, b) => a.minSpend - b.minSpend)
  return [...sorted].reverse().find((t) => spend12m >= t.minSpend) ?? sorted[0]
}

export function nextTierOf(settings: LoyaltySettings, tier: TierRule) {
  return [...settings.tiers]
    .sort((a, b) => a.minSpend - b.minSpend)
    .find((t) => t.minSpend > tier.minSpend)
}

/** Fractions are dropped: 274 บาท at 25 บาท/แต้ม = 10 แต้ม. */
export function pointsFor(amount: number, tier: TierRule) {
  return Math.floor(amount / tier.rate)
}

export type LedgerEntry = {
  id: string
  date: string
  kind: "earn" | "adjust" | "redeem" | "expire"
  points: number
  label: string
  orderId?: string
  state?: "pending" | "available" | "expired"
  availableAt?: string
  expiresAt?: string
}

export type PointSummary = {
  tier: TierRule
  nextTier?: TierRule
  spend12m: number
  available: number
  pending: number
  expiringSoon: number
  /** Earliest expiry among the points counted in expiringSoon. */
  expiringOn?: string
  earned: number
  entries: LedgerEntry[]
}

type Lot = {
  id: string
  date: string
  points: number
  left: number
  availableAt: string
  expiresAt: string
  label: string
  orderId?: string
  kind: "earn" | "adjust"
}

function completedOrders(data: PortalData, customerId: string) {
  return data.orders
    .filter((o) => o.customerId === customerId && o.status === "completed" && o.completedAt)
    .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))
}

/** Spend in the 12 months before `at`, which decides the tier on that day. */
function spendBefore(orders: Order[], at: string, inclusive: boolean) {
  const from = addMonths(at, -12)
  return orders
    .filter((o) => {
      const d = o.completedAt!.slice(0, 10)
      return d > from && (inclusive ? d <= at : d < at)
    })
    .reduce((s, o) => s + orderNet(o), 0)
}

/** Points an order earned, at the tier the customer held when it completed. */
export function orderPoints(data: PortalData, order: Order) {
  const settings = loyaltyOf(data, order.companyId)
  if (order.status !== "completed" || !order.completedAt) return null
  const history = completedOrders(data, order.customerId)
  const tier = tierFor(settings, spendBefore(history, order.completedAt.slice(0, 10), false))
  const availableAt = addDays(order.completedAt, settings.confirmDays)
  return { tier, points: pointsFor(orderNet(order), tier), availableAt }
}

export function pointSummary(data: PortalData, companyId: string, customerId: string, now = today()): PointSummary {
  const settings = loyaltyOf(data, companyId)
  const history = completedOrders(data, customerId)

  const lots: Lot[] = history.map((o) => {
    const at = o.completedAt!.slice(0, 10)
    const tier = tierFor(settings, spendBefore(history, at, false))
    const points = pointsFor(orderNet(o), tier)
    const availableAt = addDays(at, settings.confirmDays)
    return {
      id: o.id,
      date: o.completedAt!,
      points,
      left: points,
      availableAt,
      expiresAt: addMonths(availableAt, settings.expiryMonths),
      label: `คำสั่งซื้อ ${o.id} (${tier.label} ${tier.rate} บาท = 1 แต้ม)`,
      orderId: o.id,
      kind: "earn",
    }
  })

  const adjustments = data.adjustments.filter((a) => a.customerId === customerId)
  for (const a of adjustments.filter((a) => a.points > 0)) {
    const at = a.createdAt.slice(0, 10)
    lots.push({
      id: a.id,
      date: a.createdAt,
      points: a.points,
      left: a.points,
      availableAt: at,
      expiresAt: addMonths(at, settings.expiryMonths),
      label: `ปรับแต้ม: ${a.reason}`,
      kind: "adjust",
    })
  }

  const debits = [
    ...data.redemptions
      .filter((r) => r.customerId === customerId && r.status === "completed")
      .map((r) => ({
        id: r.id,
        date: r.createdAt,
        points: r.points,
        kind: "redeem" as const,
        label: `แลก ${r.rewardName}`,
      })),
    ...adjustments
      .filter((a) => a.points < 0)
      .map((a) => ({
        id: a.id,
        date: a.createdAt,
        points: -a.points,
        kind: "adjust" as const,
        label: `ปรับแต้ม: ${a.reason}`,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  // Use the lots that expire soonest first.
  for (const d of debits) {
    const on = d.date.slice(0, 10)
    let need = d.points
    const usable = lots
      .filter((l) => l.left > 0 && l.availableAt <= on && l.expiresAt > on)
      .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
    for (const l of usable) {
      if (need === 0) break
      const take = Math.min(l.left, need)
      l.left -= take
      need -= take
    }
  }

  const noticeUntil = addDays(now, settings.expiryNoticeDays)
  let available = 0
  let pending = 0
  let expiringSoon = 0
  let expiringOn: string | undefined
  const entries: LedgerEntry[] = []

  for (const l of lots) {
    const state = l.availableAt > now ? "pending" : l.expiresAt <= now ? "expired" : "available"
    if (state === "pending") pending += l.left
    if (state === "available") {
      available += l.left
      if (l.left > 0 && l.expiresAt <= noticeUntil) {
        expiringSoon += l.left
        if (!expiringOn || l.expiresAt < expiringOn) expiringOn = l.expiresAt
      }
    }
    entries.push({
      id: l.id,
      date: l.date,
      kind: l.kind,
      points: l.points,
      label: l.label,
      orderId: l.orderId,
      state,
      availableAt: l.availableAt,
      expiresAt: l.expiresAt,
    })
    if (state === "expired" && l.left > 0) {
      entries.push({
        id: `${l.id}-exp`,
        date: l.expiresAt,
        kind: "expire",
        points: -l.left,
        label: `แต้มหมดอายุ (จาก ${l.orderId ?? "การปรับแต้ม"})`,
      })
    }
  }
  for (const d of debits) {
    entries.push({ id: d.id, date: d.date, kind: d.kind, points: -d.points, label: d.label })
  }
  entries.sort((a, b) => b.date.localeCompare(a.date))

  const spend12m = spendBefore(history, now, true)
  const tier = tierFor(settings, spend12m)
  return {
    tier,
    nextTier: nextTierOf(settings, tier),
    spend12m,
    available,
    pending,
    expiringSoon,
    expiringOn,
    earned: lots.filter((l) => l.kind === "earn").reduce((s, l) => s + l.points, 0),
    entries,
  }
}
