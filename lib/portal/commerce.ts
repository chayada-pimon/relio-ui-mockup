// Orders, sales channels, ingestion and loyalty data for the portal mockup.
// Channels, tiers and point rules follow the CRM Center overview (24 ก.ย. 2569).
// All people, shops and order numbers are fictional.

export type ChannelType = "website" | "shopee" | "lazada" | "tiktok" | "pos"

export const channelTypeLabel: Record<ChannelType, string> = {
  website: "เว็บไซต์",
  shopee: "Shopee",
  lazada: "Lazada",
  tiktok: "TikTok Shop",
  pos: "หน้าร้าน (POS)",
}

/** Marketplaces send their own shop id, which must be mapped to a channel. */
export const marketplaceTypes: ChannelType[] = ["shopee", "lazada", "tiktok"]

export type ApiKey = {
  id: string
  /** Only the prefix is stored; the full key is shown once at creation. */
  prefix: string
  createdAt: string
  lastUsedAt?: string
  revokedAt?: string
}

export type Channel = {
  id: string
  companyId: string
  type: ChannelType
  name: string
  status: "active" | "inactive"
  createdAt: string
  apiKeys: ApiKey[]
}

export type ShopMapping = {
  id: string
  companyId: string
  platform: ChannelType
  externalShopId: string
  channelId: string | null
  firstSeenAt: string
}

export type OrderStatus = "pending" | "paid" | "completed" | "cancelled" | "returned"

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: "รอชำระเงิน",
  paid: "ชำระแล้ว",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
  returned: "คืนสินค้า",
}

export type OrderItem = { name: string; qty: number; price: number }

export type Order = {
  id: string
  companyId: string
  customerId: string
  channelId: string
  externalId: string
  status: OrderStatus
  items: OrderItem[]
  discount: number
  shipping: number
  createdAt: string
  completedAt?: string
}

export type IngestStatus = "success" | "failed" | "duplicate"

export type IngestPayload = Pick<Order, "customerId" | "items" | "discount" | "shipping" | "status">

export type IngestEvent = {
  id: string
  companyId: string
  channelId: string | null
  platform: ChannelType
  externalShopId: string
  externalOrderId: string
  status: IngestStatus
  receivedAt: string
  attempts: number
  message?: string
  orderId?: string
  /** Kept for failed events so they can be retried. */
  payload?: IngestPayload
}

export type Tier = "silver" | "gold" | "platinum"

export type TierRule = {
  tier: Tier
  label: string
  /** Baht per point. */
  rate: number
  /** 12-month spend needed to reach the tier. */
  minSpend: number
}

export type LoyaltySettings = {
  companyId: string
  tiers: TierRule[]
  /** Points wait this long after the order completes, in case of a return. */
  confirmDays: number
  expiryMonths: number
  /** Staff see customers whose points expire within this window. */
  expiryNoticeDays: number
  updatedAt: string
}

export type Reward = {
  id: string
  companyId: string
  name: string
  type: "reward" | "coupon"
  points: number
  /** null = unlimited. */
  stock: number | null
  status: "active" | "inactive"
  createdAt: string
}

export const rewardTypeLabel: Record<Reward["type"], string> = {
  reward: "ของรางวัล",
  coupon: "คูปอง",
}

export type Redemption = {
  id: string
  companyId: string
  customerId: string
  rewardId: string
  rewardName: string
  points: number
  code: string
  status: "completed" | "cancelled"
  createdAt: string
  by: string
}

export type PointAdjustment = {
  id: string
  companyId: string
  customerId: string
  points: number
  reason: string
  createdAt: string
  by: string
}

export const defaultTiers: TierRule[] = [
  { tier: "silver", label: "Silver", rate: 25, minSpend: 0 },
  { tier: "gold", label: "Gold", rate: 20, minSpend: 20_000 },
  { tier: "platinum", label: "Platinum", rate: 15, minSpend: 60_000 },
]

export function defaultLoyalty(companyId: string): LoyaltySettings {
  return {
    companyId,
    tiers: defaultTiers.map((t) => ({ ...t })),
    confirmDays: 7,
    expiryMonths: 12,
    expiryNoticeDays: 30,
    updatedAt: "2026-09-01",
  }
}

// ---- helpers ---------------------------------------------------------------

export function orderSubtotal(order: Pick<Order, "items">) {
  return order.items.reduce((s, i) => s + i.qty * i.price, 0)
}

/** After discount, before shipping — the amount points are earned on. */
export function orderNet(order: Pick<Order, "items" | "discount">) {
  return Math.max(0, orderSubtotal(order) - order.discount)
}

export function orderTotal(order: Pick<Order, "items" | "discount" | "shipping">) {
  return orderNet(order) + order.shipping
}

export function formatBaht(n: number) {
  return `${n.toLocaleString("th-TH")} บาท`
}

export function formatNumber(n: number) {
  return n.toLocaleString("th-TH")
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export function addMonths(iso: string, months: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  d.setMonth(d.getMonth() + months)
  return isoDate(d)
}

function isoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function nowIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function randomCode(length: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

// ---- seed ------------------------------------------------------------------

const catalog = {
  cream: { name: "ครีมบำรุงผิว 50 มล.", price: 1250 },
  serum: { name: "เซรั่มวิตามินซี 30 มล.", price: 500 },
  sunscreen: { name: "กันแดด SPF50", price: 450 },
  giftSet: { name: "ชุดของขวัญ", price: 1300 },
  lotion: { name: "โลชั่นบำรุงผิว", price: 390 },
  shampoo: { name: "แชมพูสมุนไพร", price: 290 },
  mask: { name: "มาส์กหน้า (กล่อง 10 แผ่น)", price: 650 },
  perfume: { name: "น้ำหอม 50 มล.", price: 2900 },
  premium: { name: "ชุดเซ็ตพรีเมียม", price: 5800 },
}

type Sku = keyof typeof catalog

const items = (...lines: [Sku, number][]): OrderItem[] =>
  lines.map(([sku, qty]) => ({ ...catalog[sku], qty }))

export const seedChannels: Channel[] = [
  channel("ch-a-web", "company-a", "website", "เว็บไซต์บริษัท", "2026-01-12", "crm_live_Wb7q", "2026-09-26T10:05"),
  channel("ch-a-shopee1", "company-a", "shopee", "Shopee ร้านที่ 1", "2026-01-15", "crm_live_Sp1k", "2026-09-26T09:40"),
  channel("ch-a-shopee2", "company-a", "shopee", "Shopee ร้านที่ 2", "2026-02-02", "crm_live_Sp2m", "2026-09-21T18:12"),
  channel("ch-a-lazada", "company-a", "lazada", "Lazada", "2026-02-10", "crm_live_Lz4r", "2026-09-24T11:30"),
  channel("ch-a-tiktok", "company-a", "tiktok", "TikTok Shop", "2026-05-01", "crm_live_Tt9x", "2026-09-25T20:47"),
  channel("ch-a-pos", "company-a", "pos", "หน้าร้าน สาขาสยาม", "2026-01-20", "crm_live_Ps3n", "2026-09-02T16:31"),
  channel("ch-b-web", "company-b", "website", "เว็บไซต์บริษัท", "2026-02-20", "crm_live_Bw5e", "2026-09-23T08:15"),
  channel("ch-b-lazada", "company-b", "lazada", "Lazada", "2026-03-01", "crm_live_Bl8t", "2026-09-24T13:02"),
  channel("ch-b-pos", "company-b", "pos", "หน้าร้าน สาขาเชียงใหม่", "2026-03-05", "crm_live_Bp2h", "2026-08-19T15:20"),
]

function channel(
  id: string,
  companyId: string,
  type: ChannelType,
  name: string,
  createdAt: string,
  prefix: string,
  lastUsedAt: string
): Channel {
  return {
    id,
    companyId,
    type,
    name,
    status: "active",
    createdAt,
    apiKeys: [{ id: `key-${id}`, prefix, createdAt, lastUsedAt }],
  }
}

export const seedMappings: ShopMapping[] = [
  { id: "map-1", companyId: "company-a", platform: "shopee", externalShopId: "shop_220145", channelId: "ch-a-shopee1", firstSeenAt: "2026-01-15" },
  { id: "map-2", companyId: "company-a", platform: "shopee", externalShopId: "shop_220188", channelId: "ch-a-shopee2", firstSeenAt: "2026-02-02" },
  { id: "map-3", companyId: "company-a", platform: "lazada", externalShopId: "LZ-TH-5501", channelId: "ch-a-lazada", firstSeenAt: "2026-02-10" },
  { id: "map-4", companyId: "company-a", platform: "tiktok", externalShopId: "7494-TT", channelId: "ch-a-tiktok", firstSeenAt: "2026-05-01" },
  { id: "map-5", companyId: "company-a", platform: "shopee", externalShopId: "shop_998877", channelId: null, firstSeenAt: "2026-09-25" },
  { id: "map-6", companyId: "company-b", platform: "lazada", externalShopId: "LZ-TH-7720", channelId: "ch-b-lazada", firstSeenAt: "2026-03-01" },
]

type OrderSpec = [
  id: string,
  customerId: string,
  channelId: string,
  createdAt: string,
  status: OrderStatus,
  items: OrderItem[],
  extra?: { discount?: number; shipping?: number; completedAt?: string },
]

const orderSpecs: OrderSpec[] = [
  // สมใจ — the overview's example: 4 orders, 4 channels, 4,000 บาท, 160 แต้ม.
  ["ORD-A-1001", "C-0008", "ch-a-web", "2026-06-12T10:20", "completed", items(["cream", 1])],
  ["ORD-A-1002", "C-0008", "ch-a-shopee1", "2026-07-03T20:11", "completed", items(["serum", 2])],
  ["ORD-A-1003", "C-0008", "ch-a-shopee2", "2026-08-15T13:45", "completed", items(["sunscreen", 1])],
  ["ORD-A-1004", "C-0008", "ch-a-pos", "2026-09-02T16:30", "completed", items(["giftSet", 1]), { completedAt: "2026-09-02" }],
  // ธนกร — Platinum.
  ["ORD-A-0901", "C-0005", "ch-a-web", "2025-10-02T09:12", "completed", items(["premium", 3])],
  ["ORD-A-0902", "C-0005", "ch-a-lazada", "2025-12-10T21:04", "completed", items(["perfume", 4])],
  ["ORD-A-0903", "C-0005", "ch-a-pos", "2026-03-20T15:40", "completed", items(["premium", 2], ["perfume", 1]), { completedAt: "2026-03-20" }],
  ["ORD-A-1010", "C-0005", "ch-a-tiktok", "2026-06-18T19:25", "completed", items(["premium", 3])],
  ["ORD-A-1011", "C-0005", "ch-a-web", "2026-09-10T11:02", "completed", items(["perfume", 2]), { discount: 300 }],
  // สมหญิง — Gold.
  ["ORD-A-1005", "C-0002", "ch-a-shopee1", "2026-04-05T12:30", "completed", items(["perfume", 3])],
  ["ORD-A-1006", "C-0002", "ch-a-lazada", "2026-05-22T22:10", "completed", items(["premium", 2]), { discount: 500 }],
  ["ORD-A-1012", "C-0002", "ch-a-shopee1", "2026-09-22T08:45", "completed", items(["serum", 2], ["mask", 1]), { shipping: 30 }],
  // สมชาย and the suspected duplicate record.
  ["ORD-A-1007", "C-0001", "ch-a-web", "2026-03-15T14:18", "completed", items(["lotion", 2], ["shampoo", 1]), { shipping: 50 }],
  ["ORD-A-1013", "C-0001", "ch-a-shopee2", "2026-08-01T10:05", "completed", items(["shampoo", 1]), { discount: 16, shipping: 30 }],
  ["ORD-A-1014", "C-0001", "ch-a-tiktok", "2026-09-25T20:46", "paid", items(["sunscreen", 2])],
  ["ORD-A-1008", "C-0006", "ch-a-shopee1", "2026-03-18T17:52", "completed", items(["mask", 1]), { shipping: 30 }],
  // วิชัย
  ["ORD-A-1009", "C-0003", "ch-a-pos", "2026-04-10T13:10", "completed", items(["cream", 1], ["serum", 1]), { completedAt: "2026-04-10" }],
  ["ORD-A-1015", "C-0003", "ch-a-web", "2026-09-26T10:04", "pending", items(["perfume", 1]), { shipping: 50 }],
  // อรทัย
  ["ORD-A-1016", "C-0004", "ch-a-lazada", "2026-05-05T09:30", "cancelled", items(["giftSet", 1])],
  ["ORD-A-1017", "C-0004", "ch-a-web", "2026-07-20T16:22", "returned", items(["serum", 1]), { shipping: 50 }],
  ["ORD-A-1018", "C-0004", "ch-a-web", "2026-07-28T11:48", "completed", items(["cream", 1])],
  // พิมพ์ชนก
  ["ORD-A-1019", "C-0007", "ch-a-tiktok", "2026-08-08T21:15", "completed", items(["mask", 2], ["lotion", 1])],
  ["ORD-A-1020", "C-0007", "ch-a-shopee2", "2026-09-21T18:10", "completed", items(["giftSet", 2]), { completedAt: "2026-09-23" }],
  // company-b
  ["ORD-B-2001", "C-0101", "ch-b-web", "2026-04-02T10:40", "completed", items(["premium", 1])],
  ["ORD-B-2002", "C-0101", "ch-b-pos", "2026-08-19T15:18", "completed", items(["perfume", 1]), { completedAt: "2026-08-19" }],
  ["ORD-B-2003", "C-0102", "ch-b-lazada", "2026-05-11T19:55", "completed", items(["lotion", 3]), { shipping: 40 }],
  ["ORD-B-2004", "C-0102", "ch-b-lazada", "2026-09-24T13:01", "paid", items(["sunscreen", 1]), { shipping: 40 }],
]

function externalIdFor(type: ChannelType, id: string, createdAt: string) {
  const n = id.slice(-4)
  const ymd = createdAt.slice(2, 10).replace(/-/g, "")
  switch (type) {
    case "website":
      return `WEB-1${n}`
    case "shopee":
      return `${ymd}${n}SP`
    case "lazada":
      return `5${ymd}${n}`
    case "tiktok":
      return `57${ymd}${n}`
    case "pos":
      return `POS-${n}`
  }
}

export const seedOrders: Order[] = orderSpecs.map(
  ([id, customerId, channelId, createdAt, status, lines, extra = {}]) => {
    const ch = seedChannels.find((c) => c.id === channelId)!
    const done = status === "completed" || status === "returned"
    return {
      id,
      companyId: ch.companyId,
      customerId,
      channelId,
      externalId: externalIdFor(ch.type, id, createdAt),
      status,
      items: lines,
      discount: extra.discount ?? 0,
      shipping: extra.shipping ?? 0,
      createdAt,
      completedAt: done ? (extra.completedAt ?? addDays(createdAt, 3)) : undefined,
    }
  }
)

/** Where an order's shop id comes from: the mapping for marketplaces, the channel otherwise. */
function shopIdOf(channelId: string) {
  return seedMappings.find((m) => m.channelId === channelId)?.externalShopId ?? channelId
}

export const seedIngestEvents: IngestEvent[] = [
  ...seedOrders.map((o, i): IngestEvent => {
    const ch = seedChannels.find((c) => c.id === o.channelId)!
    return {
      id: `ev-${String(i + 1).padStart(4, "0")}`,
      companyId: o.companyId,
      channelId: o.channelId,
      platform: ch.type,
      externalShopId: shopIdOf(o.channelId),
      externalOrderId: o.externalId,
      status: "success",
      receivedAt: o.createdAt,
      attempts: 1,
      orderId: o.id,
    }
  }),
  {
    id: "ev-9001",
    companyId: "company-a",
    channelId: null,
    platform: "shopee",
    externalShopId: "shop_998877",
    externalOrderId: "2609250041SP",
    status: "failed",
    receivedAt: "2026-09-25T14:02",
    attempts: 1,
    message: "ไม่พบ mapping ของร้าน shop_998877",
    payload: { customerId: "C-0002", items: items(["serum", 1]), discount: 0, shipping: 30, status: "completed" },
  },
  {
    id: "ev-9002",
    companyId: "company-a",
    channelId: null,
    platform: "shopee",
    externalShopId: "shop_998877",
    externalOrderId: "2609260017SP",
    status: "failed",
    receivedAt: "2026-09-26T09:40",
    attempts: 2,
    message: "ไม่พบ mapping ของร้าน shop_998877",
    payload: { customerId: "C-0007", items: items(["sunscreen", 2]), discount: 0, shipping: 30, status: "paid" },
  },
  {
    id: "ev-9003",
    companyId: "company-a",
    channelId: "ch-a-web",
    platform: "website",
    externalShopId: "ch-a-web",
    externalOrderId: "WEB-10088",
    status: "failed",
    receivedAt: "2026-09-26T10:05",
    attempts: 1,
    message: "ไม่มีเบอร์โทรหรืออีเมลของลูกค้า จับคู่ลูกค้าไม่ได้",
  },
  {
    id: "ev-9004",
    companyId: "company-a",
    channelId: "ch-a-lazada",
    platform: "lazada",
    externalShopId: "LZ-TH-5501",
    externalOrderId: seedOrders.find((o) => o.id === "ORD-A-1006")!.externalId,
    status: "duplicate",
    receivedAt: "2026-05-22T22:14",
    attempts: 1,
    message: "ออเดอร์นี้รับเข้าระบบแล้ว",
    orderId: "ORD-A-1006",
  },
  {
    id: "ev-9005",
    companyId: "company-b",
    channelId: "ch-b-web",
    platform: "website",
    externalShopId: "ch-b-web",
    externalOrderId: "WEB-12031",
    status: "failed",
    receivedAt: "2026-09-23T08:15",
    attempts: 3,
    message: "ข้อมูลสินค้าไม่ครบ (ไม่มีราคา)",
  },
]

export const seedLoyalty: LoyaltySettings[] = [defaultLoyalty("company-a"), defaultLoyalty("company-b")]

export const seedRewards: Reward[] = [
  { id: "rw-a-1", companyId: "company-a", name: "คูปองส่วนลด 50 บาท", type: "coupon", points: 100, stock: null, status: "active", createdAt: "2026-06-01" },
  { id: "rw-a-2", companyId: "company-a", name: "คูปองส่งฟรี", type: "coupon", points: 300, stock: null, status: "active", createdAt: "2026-06-01" },
  { id: "rw-a-3", companyId: "company-a", name: "บัตรกำนัล 500 บาท", type: "coupon", points: 1000, stock: 20, status: "active", createdAt: "2026-06-01" },
  { id: "rw-a-4", companyId: "company-a", name: "กระเป๋าผ้า CRM Center", type: "reward", points: 400, stock: 34, status: "active", createdAt: "2026-06-15" },
  { id: "rw-a-5", companyId: "company-a", name: "ชุดทดลอง 5 ชิ้น", type: "reward", points: 800, stock: 0, status: "active", createdAt: "2026-07-01" },
  { id: "rw-a-6", companyId: "company-a", name: "ร่มพับ", type: "reward", points: 600, stock: 12, status: "inactive", createdAt: "2026-07-10" },
  { id: "rw-b-1", companyId: "company-b", name: "คูปองส่วนลด 100 บาท", type: "coupon", points: 200, stock: null, status: "active", createdAt: "2026-06-01" },
  { id: "rw-b-2", companyId: "company-b", name: "แก้วเก็บความเย็น", type: "reward", points: 900, stock: 10, status: "active", createdAt: "2026-06-01" },
]

export const seedRedemptions: Redemption[] = [
  { id: "rd-1", companyId: "company-a", customerId: "C-0002", rewardId: "rw-a-2", rewardName: "คูปองส่งฟรี", points: 300, code: "FS-7KQ2MX", status: "completed", createdAt: "2026-06-10T13:20", by: "staff.a@exampleco.co.th" },
  { id: "rd-2", companyId: "company-a", customerId: "C-0005", rewardId: "rw-a-4", rewardName: "กระเป๋าผ้า CRM Center", points: 400, code: "RW-P4H8ZA", status: "completed", createdAt: "2026-07-01T10:05", by: "manager.a@exampleco.co.th" },
  { id: "rd-3", companyId: "company-a", customerId: "C-0008", rewardId: "rw-a-1", rewardName: "คูปองส่วนลด 50 บาท", points: 100, code: "DC-3NW9RT", status: "completed", createdAt: "2026-09-15T16:42", by: "staff.a@exampleco.co.th" },
  { id: "rd-4", companyId: "company-a", customerId: "C-0007", rewardId: "rw-a-4", rewardName: "กระเป๋าผ้า CRM Center", points: 400, code: "RW-8YB2KC", status: "cancelled", createdAt: "2026-08-25T11:10", by: "staff.a@exampleco.co.th" },
]

export const seedAdjustments: PointAdjustment[] = [
  { id: "adj-1", companyId: "company-a", customerId: "C-0007", points: 100, reason: "ชดเชยสินค้าส่งล่าช้า", createdAt: "2026-08-20T09:30", by: "manager.a@exampleco.co.th" },
]
