// Mock data for the OMS + CRM pages. Every number that appears in
// two places is derived from one source here, so the pages always agree with
// each other (e.g. today's summary is the last point of the trend series).

import { TODAY } from "@/lib/relio/data"

export type Text = { th: string; en: string }

/* ------------------------------------------------------------ 1. Alerts */

export type Alert = {
  id: string
  source: "oms" | "crm"
  tone: "danger" | "warning" | "info"
  title: Text
  body: Text
  action?: { label: Text; href: string }
}

export const EVENT_LAG = { events: 1284, minutes: 12 }

export const failedIngestions = [
  {
    id: "ING-5521",
    orderRef: "SHP-240923-88412",
    channel: "shopee" as const,
    at: "2026-09-23T09:58:00",
    reason: {
      th: "ไม่พบ SKU TE-011 ในแคตตาล็อก",
      en: "SKU TE-011 not found in catalogue",
    },
  },
  {
    id: "ING-5518",
    orderRef: "LZD-240923-10277",
    channel: "lazada" as const,
    at: "2026-09-23T09:31:00",
    reason: {
      th: "Lazada API ตอบกลับช้าเกินกำหนด",
      en: "Lazada API timed out",
    },
  },
  {
    id: "ING-5509",
    orderRef: "WEB-240923-00931",
    channel: "website" as const,
    at: "2026-09-23T08:47:00",
    reason: {
      th: "ข้อมูลไม่ครบ: ไม่มีเบอร์โทรหรืออีเมลผู้ซื้อ",
      en: "Incomplete payload: no buyer phone or email",
    },
  },
]

export const QUOTA = { used: 9240, limit: 10000 }

export const alerts: Alert[] = [
  {
    id: "pay",
    source: "oms",
    tone: "danger",
    title: { th: "ชำระเงินไม่ผ่าน 2 ออเดอร์", en: "2 payments failed" },
    body: {
      th: "ส่งลิงก์ชำระเงินใหม่ให้ลูกค้าได้จากหน้าออเดอร์",
      en: "Send a new payment link from the order page.",
    },
    action: { label: { th: "ดูออเดอร์", en: "View orders" }, href: "/orders?status=pending" },
  },
  {
    id: "ingest",
    source: "crm",
    tone: "danger",
    title: {
      th: `นำเข้าออเดอร์ไม่สำเร็จ ${failedIngestions.length} รายการ`,
      en: `${failedIngestions.length} orders failed to ingest`,
    },
    body: {
      th: "ออเดอร์เหล่านี้ยังไม่เข้าโปรไฟล์ลูกค้า ลองนำเข้าใหม่ได้",
      en: "These orders are not on customer profiles yet. You can retry.",
    },
    action: {
      label: { th: "เปิด Ingestion Monitor", en: "Open Ingestion Monitor" },
      href: "/ingestion",
    },
  },
  {
    id: "store",
    source: "oms",
    tone: "warning",
    title: { th: "ร้าน Shopee หลุดการเชื่อมต่อ", en: "Shopee store disconnected" },
    body: {
      th: "ออเดอร์ใหม่จาก Shopee จะยังไม่เข้าระบบจนกว่าจะเชื่อมต่อใหม่",
      en: "New Shopee orders will not arrive until you reconnect.",
    },
    action: { label: { th: "เชื่อมต่อใหม่", en: "Reconnect" }, href: "/operations#stores" },
  },
  {
    id: "lag",
    source: "crm",
    tone: "warning",
    title: { th: "คะแนนอาจยังไม่อัปเดต", en: "Points may not be up to date" },
    body: {
      th: `มี ${EVENT_LAG.events.toLocaleString("th-TH")} event รอประมวลผล ช้ากว่าปกติราว ${EVENT_LAG.minutes} นาที`,
      en: `${EVENT_LAG.events.toLocaleString("en-GB")} events are waiting, about ${EVENT_LAG.minutes} minutes behind.`,
    },
  },
  {
    id: "quota",
    source: "oms",
    tone: "warning",
    title: {
      th: `โควตาออเดอร์ใช้ไปแล้ว ${Math.round((QUOTA.used / QUOTA.limit) * 100)}%`,
      en: `${Math.round((QUOTA.used / QUOTA.limit) * 100)}% of order quota used`,
    },
    body: {
      th: "อัปเกรดแพ็กเกจก่อนครบโควตาเพื่อให้รับออเดอร์ได้ต่อเนื่อง",
      en: "Upgrade before the limit to keep receiving orders.",
    },
    action: { label: { th: "ดูแพ็กเกจ", en: "View plan" }, href: "/operations#plan" },
  },
]

/* -------------------------------------------------------- 2. Today tasks */

export type Task = {
  id: string
  source: "oms" | "crm"
  label: Text
  count: number
  urgent?: boolean
  href: string
}

export const tasks: Task[] = [
  { id: "ship", source: "oms", label: { th: "รอจัดส่ง", en: "To ship" }, count: 18, href: "/orders?status=packing" },
  { id: "late", source: "oms", label: { th: "ใกล้เลย deadline", en: "Near deadline" }, count: 4, urgent: true, href: "/orders?status=confirmed" },
  { id: "label", source: "oms", label: { th: "รอพิมพ์ใบปะหน้า", en: "Labels to print" }, count: 11, href: "/orders?status=packing" },
  { id: "return", source: "oms", label: { th: "คำขอคืนสินค้า", en: "Return requests" }, count: 2, href: "/orders" },
  { id: "merge", source: "crm", label: { th: "รอตัดสินใจรวมลูกค้า", en: "Merges to review" }, count: 5, href: "/customers" },
  { id: "reward", source: "crm", label: { th: "ของรางวัลใกล้หมด", en: "Rewards running low" }, count: 2, href: "/campaigns" },
]

/* --------------------------------------------------- 3 + 7. Daily series */

export type Day = {
  date: string
  orders: number
  sales: number
  newCustomers: number
  returning: number
}

function prng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = prng(20260923)

export const days: Day[] = Array.from({ length: 91 }, (_, i) => {
  const d = new Date(`${TODAY}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - (90 - i))
  const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6
  const growth = 1 + i * 0.003
  const orders = Math.round((96 + (weekend ? 28 : 0) + rand() * 22) * growth)
  const ticket = 390 + rand() * 70
  const buyers = Math.round(orders * 0.82)
  const newCustomers = Math.round(buyers * (0.3 + rand() * 0.08))
  return {
    date: d.toISOString().slice(0, 10),
    orders,
    sales: Math.round(orders * ticket),
    newCustomers,
    returning: buyers - newCustomers,
  }
})

export type Range = "7d" | "30d" | "90d"

export const rangeLabel: Record<Range, Text> = {
  "7d": { th: "7 วัน", en: "7 days" },
  "30d": { th: "30 วัน", en: "30 days" },
  "90d": { th: "90 วัน", en: "90 days" },
}

/** Points for a range: daily for 7/30 days, weekly buckets for 90 days. */
export function series(range: Range): Day[] {
  if (range === "7d") return days.slice(-7)
  if (range === "30d") return days.slice(-30)
  const weeks: Day[] = []
  for (let i = 0; i < 13; i++) {
    const chunk = days.slice(i * 7, i * 7 + 7)
    weeks.push({
      date: chunk[0].date,
      orders: chunk.reduce((s, d) => s + d.orders, 0),
      sales: chunk.reduce((s, d) => s + d.sales, 0),
      newCustomers: chunk.reduce((s, d) => s + d.newCustomers, 0),
      returning: chunk.reduce((s, d) => s + d.returning, 0),
    })
  }
  return weeks
}

export const today = days[days.length - 1]
export const yesterday = days[days.length - 2]

export type SalesChannel = "line" | "shopee" | "lazada" | "website" | "pos"

export const salesChannelLabel: Record<SalesChannel, Text> = {
  line: { th: "LINE", en: "LINE" },
  shopee: { th: "Shopee", en: "Shopee" },
  lazada: { th: "Lazada", en: "Lazada" },
  website: { th: "เว็บไซต์", en: "Website" },
  pos: { th: "หน้าร้าน", en: "In store" },
}

const channelShare: [SalesChannel, number][] = [
  ["line", 0.33],
  ["shopee", 0.25],
  ["website", 0.16],
  ["lazada", 0.14],
  ["pos", 0.12],
]

/** Split a total by shares with the largest-remainder method so parts sum exactly. */
function split(total: number) {
  const raw = channelShare.map(([c, s]) => ({ c, v: total * s }))
  const floored = raw.map((r) => ({ ...r, f: Math.floor(r.v) }))
  let rest = total - floored.reduce((s, r) => s + r.f, 0)
  ;[...floored]
    .sort((a, b) => b.v - b.f - (a.v - a.f))
    .forEach((r) => {
      if (rest > 0) {
        r.f += 1
        rest -= 1
      }
    })
  return floored
}

export const todayByChannel = (() => {
  const o = split(today.orders)
  const s = split(today.sales)
  return o.map((row, i) => ({ channel: row.c, orders: row.f, sales: s[i].f }))
})()

/* ---------------------------------------------------- 4. Customer overview */

export const GOLDEN_RECORDS = 12480
export const MULTI_CHANNEL = 2316

export function customerOverview(range: Range) {
  const list = series(range)
  const newCustomers = list.reduce((s, d) => s + d.newCustomers, 0)
  const returning = list.reduce((s, d) => s + d.returning, 0)
  return {
    newCustomers,
    repeatRate: returning / (newCustomers + returning),
  }
}

export const topCustomers: {
  id: string
  spend12m: number
  orders: number
  channels: SalesChannel[]
}[] = [
  { id: "C-1002", spend12m: 486200, orders: 42, channels: ["line", "website"] },
  { id: "C-1007", spend12m: 312750, orders: 58, channels: ["pos", "shopee"] },
  { id: "C-1001", spend12m: 268400, orders: 36, channels: ["line"] },
  { id: "C-1005", spend12m: 221900, orders: 19, channels: ["shopee", "website", "pos"] },
  { id: "C-1009", spend12m: 198300, orders: 44, channels: ["line", "pos"] },
  { id: "C-1008", spend12m: 176050, orders: 21, channels: ["website"] },
  { id: "C-1010", spend12m: 142800, orders: 12, channels: ["lazada", "website"] },
  { id: "C-1004", spend12m: 118600, orders: 27, channels: ["pos"] },
  { id: "C-1003", spend12m: 96400, orders: 15, channels: ["line", "shopee"] },
  { id: "C-1006", spend12m: 88250, orders: 9, channels: ["website"] },
]

/* --------------------------------------------------------- 5. Loyalty */

export const loyaltyMonth = {
  issued: 486200,
  redeemed: 212450,
  expired: 18300,
  outstanding: 3842900,
  // Marketplace orders only complete after the buyer confirms receipt or the
  // return window ends; their points wait here until then. Open decision.
  pending: 58300,
  expiring30d: { points: 96400, customers: 1127 },
}

export const tiers: { tier: "silver" | "gold" | "platinum"; label: Text; count: number }[] = [
  { tier: "silver", label: { th: "Silver", en: "Silver" }, count: 9870 },
  { tier: "gold", label: { th: "Gold", en: "Gold" }, count: 2140 },
  { tier: "platinum", label: { th: "Platinum", en: "Platinum" }, count: 470 },
]

export const nearUpgrade = [
  { from: "Silver", to: "Gold", customers: 264 },
  { from: "Gold", to: "Platinum", customers: 54 },
]

/* --------------------------------------------- 6. Campaigns and rewards */

export const campaigns: {
  id: string
  name: Text
  start: string
  end: string
  priority: number
  orders: number
  points: number
}[] = [
  {
    id: "CP-01",
    name: { th: "วันเกิดรับคะแนน 2 เท่า", en: "Birthday double points" },
    start: "2026-09-01",
    end: "2026-09-30",
    priority: 1,
    orders: 412,
    points: 64800,
  },
  {
    id: "CP-02",
    name: { th: "ช้อปครบ ฿1,000 รับ 100 คะแนน", en: "Spend ฿1,000, get 100 points" },
    start: "2026-09-15",
    end: "2026-10-15",
    priority: 2,
    orders: 1028,
    points: 102800,
  },
  {
    id: "CP-03",
    name: { th: "สมาชิกใหม่ LINE OA", en: "New LINE OA members" },
    start: "2026-09-01",
    end: "2026-12-31",
    priority: 3,
    orders: 236,
    points: 23600,
  },
]

export const couponsUsed = { store: 684, web: 1142 }

export const lowRewards: { name: Text; left: number; total: number }[] = [
  { name: { th: "คูปองส่วนลด ฿100", en: "฿100 discount coupon" }, left: 42, total: 500 },
  { name: { th: "แก้วเซรามิก RELIO", en: "RELIO ceramic mug" }, left: 8, total: 120 },
]

/* ------------------------------------- 8. Stock, stores, plan and quota */

export const lowStock: { sku: string; name: Text; left: number; reorder: number }[] = [
  { sku: "CF-021", name: { th: "เมล็ดกาแฟคั่วกลาง 250 g", en: "Medium roast beans 250 g" }, left: 6, reorder: 30 },
  { sku: "BK-002", name: { th: "กล่องของขวัญ ขนาด L", en: "Gift box, large" }, left: 14, reorder: 40 },
  { sku: "TE-010", name: { th: "ชาเขียวออร์แกนิก 100 g", en: "Organic green tea 100 g" }, left: 21, reorder: 50 },
]

export const stores: { channel: SalesChannel; connected: boolean; synced: Text }[] = [
  { channel: "line", connected: true, synced: { th: "ซิงก์ 2 นาทีที่แล้ว", en: "Synced 2 min ago" } },
  { channel: "shopee", connected: false, synced: { th: "หลุดตั้งแต่ 09:12", en: "Disconnected at 09:12" } },
  { channel: "lazada", connected: true, synced: { th: "ซิงก์ 5 นาทีที่แล้ว", en: "Synced 5 min ago" } },
  { channel: "website", connected: true, synced: { th: "ซิงก์ 1 นาทีที่แล้ว", en: "Synced 1 min ago" } },
  { channel: "pos", connected: true, synced: { th: "ซิงก์ 3 นาทีที่แล้ว", en: "Synced 3 min ago" } },
]

export const plan = {
  name: "RELIO Pro",
  renews: "2026-10-01",
  meters: [
    { id: "orders", label: { th: "ออเดอร์เดือนนี้", en: "Orders this month" }, ...QUOTA },
    { id: "line", label: { th: "ข้อความ LINE", en: "LINE messages" }, used: 32100, limit: 50000 },
    { id: "seats", label: { th: "ผู้ใช้งาน", en: "Team seats" }, used: 7, limit: 10 },
  ],
}
