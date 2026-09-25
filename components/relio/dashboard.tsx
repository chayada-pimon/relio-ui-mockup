"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUDownLeft,
  ArrowsMerge,
  Bell,
  CheckCircle,
  Clock,
  ClockCountdown,
  Coins,
  Gift,
  Hourglass,
  Megaphone,
  Package,
  Plugs,
  PlugsConnected,
  Printer,
  TrendDown,
  TrendUp,
  Truck,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang } from "@/lib/relio/i18n"
import { getCustomer } from "@/lib/relio/data"
import { TIER_RULES, pointsFor } from "@/lib/relio/loyalty"
import { useCampaigns } from "@/lib/relio/campaign-store"
import {
  GOLDEN_RECORDS,
  MULTI_CHANNEL,
  couponsUsed,
  customerOverview,
  days,
  isWeekly,
  loyaltyMonth,
  lowRewards,
  lowStock,
  nearUpgrade,
  plan,
  salesChannelLabel,
  series,
  stores,
  tasks,
  tiers,
  today,
  todayByChannel,
  topCustomers,
  yesterday,
  type Text,
} from "@/lib/relio/dashboard"
import { useRange, useRangeText } from "@/components/relio/range"
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  StatusChip,
} from "@/components/relio/ui"
import {
  BarList,
  ChartFrame,
  LineChart,
  Meter,
  SplitBar,
  StackedColumns,
  compact,
} from "@/components/relio/charts"

/* UI copy local to the dashboard, TH + EN side by side. */
const c = {
  pulse: { th: "ตัวเลขสำคัญ", en: "Key numbers" },
  salesToday: { th: "ยอดขายวันนี้", en: "Sales today" },
  ordersToday: { th: "ออเดอร์วันนี้", en: "Orders today" },
  sales30: { th: "ยอดขาย 30 วัน", en: "Sales, last 30 days" },
  vsPrev30: { th: "จาก 30 วันก่อน", en: "vs previous 30 days" },
  allCustomers: { th: "ลูกค้าทั้งหมด", en: "All customers" },
  newIn30: { th: "ลูกค้าใหม่ 30 วัน", en: "new in 30 days" },
  repeat30: { th: "ซื้อซ้ำ", en: "repeat" },
  trend30: { th: "ยอดขาย 30 วันล่าสุด", en: "Sales, last 30 days" },
  seeReports: { th: "ดูรายงาน", en: "See reports" },
  tasks: { th: "งานที่ต้องทำวันนี้", en: "To do today" },
  urgent: { th: "ด่วน", en: "Urgent" },
  todayShort: { th: "วันนี้", en: "Today" },
  orders: { th: "ออเดอร์", en: "Orders" },
  sales: { th: "ยอดขาย", en: "Sales" },
  vsYesterday: { th: "จากเมื่อวาน", en: "vs yesterday" },
  byChannel: { th: "ยอดขายตามช่องทาง", en: "Sales by channel" },
  ordersUnit: { th: "ออเดอร์", en: "orders" },
  period: { th: "ช่วงเวลา", en: "Period" },
  thisMonth: { th: "เดือนนี้", en: "This month" },
  customers: { th: "ภาพรวมลูกค้า", en: "Customer overview" },
  multiChannel: { th: "ลูกค้าที่ซื้อมากกว่าหนึ่งช่องทาง", en: "Customers buying on more than one channel" },
  multiChannelSub: {
    th: "จับคู่จากเบอร์โทร อีเมล และรหัสจากแต่ละช่องทาง",
    en: "Matched by phone, email and channel IDs",
  },
  ofAll: { th: "ของลูกค้าทั้งหมด", en: "of all customers" },
  golden: { th: "ลูกค้าทั้งหมด (Golden Record)", en: "All customers (Golden Record)" },
  newInRange: { th: "ลูกค้าใหม่", en: "New customers" },
  repeatRate: { th: "สัดส่วนลูกค้าซื้อซ้ำ", en: "Repeat customer rate" },
  top10: { th: "ลูกค้ายอดซื้อสูงสุด 10 อันดับ", en: "Top 10 customers by spend" },
  last12m: { th: "ยอดซื้อ 12 เดือน", en: "12-month spend" },
  channels: { th: "ช่องทาง", en: "Channels" },
  customer: { th: "ลูกค้า", en: "Customer" },
  loyalty: { th: "คะแนนสะสม", en: "Loyalty points" },
  issued: { th: "แจกออก", en: "Issued" },
  redeemed: { th: "ถูกแลก", en: "Redeemed" },
  expired: { th: "หมดอายุ", en: "Expired" },
  outstanding: { th: "คะแนนคงค้างทั้งหมด", en: "Outstanding points" },
  outstandingSub: { th: "ภาระทางบัญชีของร้าน", en: "The store's accounting liability" },
  pending: { th: "คะแนนรอยืนยัน", en: "Points awaiting confirmation" },
  pendingSub: {
    th: "รอ 7 วันหลังออเดอร์สำเร็จ เผื่อลูกค้าคืนสินค้า",
    en: "Held for 7 days after the order completes, in case of a return",
  },
  expiring: { th: "หมดอายุใน 30 วัน", en: "Expiring in 30 days" },
  customersUnit: { th: "ลูกค้า", en: "customers" },
  pointsUnit: { th: "คะแนน", en: "points" },
  notifyExpiring: { th: "ดูรายชื่อลูกค้า", en: "View customer list" },
  notifyNote: {
    th: "รุ่นแรกยังไม่ส่ง SMS ให้ทีมงานติดต่อลูกค้าเอง",
    en: "Version 1 sends no SMS. The team contacts these customers.",
  },
  rules: { th: "กติกาคะแนน", en: "Points rules" },
  rulesSub: { th: "ค่าเริ่มต้น แต่ละบริษัทปรับเองได้", en: "Defaults. Each company can change them." },
  tierCol: { th: "ระดับ", en: "Tier" },
  rateCol: { th: "อัตรา", en: "Rate" },
  reachCol: { th: "ยอดซื้อ 12 เดือน", en: "12-month spend" },
  per1000: { th: "ซื้อ ฿1,000", en: "On ฿1,000" },
  starter: { th: "ระดับเริ่มต้น", en: "Starting tier" },
  from: { th: "ตั้งแต่", en: "From" },
  rateUnit: { th: "บาท = 1 แต้ม", en: "baht = 1 point" },
  ruleEarn: {
    th: "คิดจากยอดหลังหักส่วนลด ไม่รวมค่าส่ง ตัดเศษทิ้ง (Silver: ฿274 = 10 แต้ม)",
    en: "Based on the amount after discounts, excluding shipping. Fractions are dropped (Silver: ฿274 = 10 points).",
  },
  ruleWait: {
    th: "แต้มรอยืนยัน 7 วันหลังออเดอร์สำเร็จ ถ้าคืนสินค้าภายใน 7 วัน แต้มถูกยกเลิก",
    en: "Points wait 7 days after the order completes. A return within 7 days cancels them.",
  },
  ruleExpire: {
    th: "แต้มมีอายุ 12 เดือน ใช้แต้มที่ใกล้หมดอายุก่อน",
    en: "Points last 12 months. The oldest points are used first.",
  },
  ruleTier: {
    th: "เลื่อนระดับทันทีเมื่อถึงเกณฑ์ ทบทวนระดับทุกต้นเดือน",
    en: "Customers move up as soon as they qualify. Tiers are reviewed at the start of each month.",
  },
  tierMix: { th: "ลูกค้าตาม Tier", en: "Customers by tier" },
  nearUpgrade: { th: "ใกล้ถึงเกณฑ์อัปเกรด Tier", en: "Close to a tier upgrade" },
  makeSegment: { th: "สร้างกลุ่มเป้าหมาย", en: "Create segment" },
  campaigns: { th: "แคมเปญและของรางวัล", en: "Campaigns and rewards" },
  activeCampaigns: { th: "แคมเปญที่กำลังทำงาน", en: "Active campaigns" },
  priorityNote: {
    th: "ออเดอร์ที่เข้าหลายแคมเปญ ใช้ได้เฉพาะแคมเปญที่ priority สูงสุด",
    en: "An order that matches several campaigns uses only the highest priority one.",
  },
  priority: { th: "Priority", en: "Priority" },
  campaign: { th: "แคมเปญ", en: "Campaign" },
  periodCol: { th: "ช่วงเวลา", en: "Period" },
  pointsCol: { th: "คะแนนที่แจก", en: "Points issued" },
  coupons: { th: "คูปองที่ถูกใช้เดือนนี้", en: "Coupons used this month" },
  store: { th: "หน้าร้าน", en: "In store" },
  web: { th: "เว็บไซต์", en: "Website" },
  lowRewards: { th: "ของรางวัลใกล้หมด", en: "Rewards running low" },
  left: { th: "เหลือ", en: "left" },
  trends: { th: "แนวโน้ม", en: "Trends" },
  salesTrend: { th: "ยอดขาย", en: "Sales" },
  salesTrendSub: { th: "ทุกช่องทาง ไม่รวมออเดอร์ที่ยกเลิก", en: "All channels, excluding cancelled orders" },
  custTrend: { th: "ลูกค้าใหม่เทียบลูกค้าเดิม", en: "New vs returning customers" },
  custTrendSub: { th: "จำนวนลูกค้าที่ซื้อในแต่ละช่วง", en: "Customers who bought in each period" },
  newCust: { th: "ลูกค้าใหม่", en: "New" },
  returning: { th: "ลูกค้าเดิม", en: "Returning" },
  date: { th: "วันที่", en: "Date" },
  weekOf: { th: "สัปดาห์เริ่ม", en: "Week of" },
  weeklyTotals: { th: "รวมรายสัปดาห์", en: "Weekly totals" },
  showTable: { th: "ดูเป็นตาราง", en: "Show table" },
  showChart: { th: "ดูเป็นกราฟ", en: "Show chart" },
  operations: { th: "สต็อก ร้านค้า และแพ็กเกจ", en: "Stock, stores and plan" },
  lowStock: { th: "สต็อกใกล้หมด", en: "Low stock" },
  reorderAt: { th: "จุดสั่งซื้อ", en: "Reorder at" },
  storeStatus: { th: "สถานะร้าน", en: "Store connections" },
  connected: { th: "เชื่อมต่อแล้ว", en: "Connected" },
  disconnected: { th: "หลุดการเชื่อมต่อ", en: "Disconnected" },
  reconnect: { th: "เชื่อมต่อใหม่", en: "Reconnect" },
  planTitle: { th: "แพ็กเกจและโควตา", en: "Plan and quota" },
  renews: { th: "ต่ออายุ", en: "Renews" },
  nearLimit: { th: "ใกล้เต็ม", en: "Near limit" },
  upgrade: { th: "อัปเกรดแพ็กเกจ", en: "Upgrade plan" },
} satisfies Record<string, Text>

type Key = keyof typeof c

function useCopy() {
  const lang = useLang()
  return {
    ...lang,
    l: (k: Key) => c[k][lang.lang],
    tx: (t: Text) => t[lang.lang],
    num: (n: number) => n.toLocaleString(lang.lang === "th" ? "th-TH" : "en-GB"),
  }
}

/* ------------------------------------------------------------ helpers */

function Section({
  id,
  title,
  aside,
  children,
}: {
  id: string
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-h`} className="text-xl leading-[1.4] font-semibold">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

const figureTone = {
  success: { bar: "border-l-3 border-success pl-3", icon: "text-success" },
  info: { bar: "border-l-3 border-info pl-3", icon: "text-info" },
  warning: { bar: "border-l-3 border-warning pl-3", icon: "text-warning" },
} as const

function Figure({
  label,
  value,
  sub,
  icon: IconCmp,
  tone,
  className,
}: {
  label: string
  value: string
  sub?: React.ReactNode
  icon?: Icon
  tone?: keyof typeof figureTone
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1", tone && figureTone[tone].bar, className)}>
      <span className="flex items-center gap-1.5 text-sm leading-[1.4] font-medium text-content-secondary">
        {IconCmp && <IconCmp size={18} aria-hidden className={cn("shrink-0", tone && figureTone[tone].icon)} />}
        {label}
      </span>
      <span className="text-[28px] leading-[1.2] font-semibold">{value}</span>
      {sub && <span className="text-xs leading-[1.5] text-content-quiet">{sub}</span>}
    </div>
  )
}

function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  const pct = ((now - before) / before) * 100
  const up = pct >= 0
  const IconCmp = up ? TrendUp : TrendDown
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", up ? "text-success" : "text-danger")}>
      <IconCmp size={14} weight="bold" aria-hidden />
      {up ? "+" : "−"}
      {Math.abs(pct).toFixed(1)}%
      <span className="font-normal text-content-quiet">{label}</span>
    </span>
  )
}

/* ------------------------------------------------------------- 2. Tasks */

const taskIcon: Record<string, Icon> = {
  ship: Truck,
  late: Clock,
  label: Printer,
  return: ArrowUDownLeft,
  merge: ArrowsMerge,
  reward: Gift,
}

function TasksSection() {
  const { l, tx, num } = useCopy()
  return (
    <Section id="tasks" title={l("tasks")}>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tasks.map((t) => {
          const IconCmp = taskIcon[t.id]
          return (
            <li key={t.id}>
              <Link
                href={t.href}
                className="flex h-full min-h-[128px] flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors duration-[120ms] hover:border-control"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex size-9 items-center justify-center rounded-md bg-info-soft text-info">
                    <IconCmp size={20} aria-hidden />
                  </span>
                  {t.urgent ? (
                    <StatusChip tone="warning" icon={WarningCircle}>
                      {l("urgent")}
                    </StatusChip>
                  ) : (
                    <span className="text-[11px] font-medium text-content-quiet">{t.source.toUpperCase()}</span>
                  )}
                </div>
                <span className="mt-auto text-[28px] leading-[1.1] font-semibold">{num(t.count)}</span>
                <span className="text-sm leading-[1.4] text-content-secondary">{tx(t.label)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

/* ------------------------------------------------------- 1. Key numbers */

function sum(list: typeof days, key: "orders" | "sales") {
  return list.reduce((s, d) => s + d[key], 0)
}

function PulseSection() {
  const { l, num, money, date } = useCopy()
  const last30 = sum(days.slice(-30), "sales")
  const prev30 = sum(days.slice(-60, -30), "sales")
  const cust = customerOverview("30d")
  return (
    <Section id="pulse" title={l("pulse")} aside={<span className="text-sm text-content-quiet">{date(today.date)}</span>}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <Figure
            label={l("salesToday")}
            value={money(today.sales)}
            sub={<Delta now={today.sales} before={yesterday.sales} label={l("vsYesterday")} />}
          />
        </Card>
        <Card className="p-5">
          <Figure
            label={l("ordersToday")}
            value={num(today.orders)}
            sub={<Delta now={today.orders} before={yesterday.orders} label={l("vsYesterday")} />}
          />
        </Card>
        <Card className="p-5">
          <Figure
            label={l("sales30")}
            value={money(last30)}
            sub={<Delta now={last30} before={prev30} label={l("vsPrev30")} />}
          />
        </Card>
        <Card className="p-5">
          <Figure
            label={l("allCustomers")}
            value={num(GOLDEN_RECORDS)}
            sub={
              <>
                +{num(cust.newCustomers)} {l("newIn30")} · {(cust.repeatRate * 100).toFixed(0)}% {l("repeat30")}
              </>
            }
          />
        </Card>
      </div>
    </Section>
  )
}

/* -------------------------------------------------- 3. Sales at a glance */

function SalesSection() {
  const { l, tx, num, money, lang } = useCopy()
  const list = series("30d")
  const locale = lang === "th" ? "th-TH" : "en-GB"
  const fmtX = (x: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${x}T00:00:00Z`))
  return (
    <Section
      id="sales"
      title={l("trend30")}
      aside={
        <Link href="/reports" className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-content-secondary hover:bg-hover hover:text-content">
          {l("seeReports")}
          <ArrowRight size={16} aria-hidden />
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Card className="min-w-0">
          <ChartFrame
            title={l("salesTrend")}
            description={l("salesTrendSub")}
            labels={{ showTable: l("showTable"), showChart: l("showChart") }}
            table={{
              columns: [l("date"), l("orders"), l("sales")],
              rows: list.map((d) => [fmtX(d.date), num(d.orders), money(d.sales)]),
            }}
          >
            <LineChart
              points={list.map((d) => ({ x: d.date, v: d.sales }))}
              color="var(--chart-oms)"
              seriesLabel={l("sales")}
              formatValue={money}
              formatTick={(v) => `฿${compact(v, lang)}`}
              formatX={fmtX}
              ariaLabel={`${l("trend30")}: ${money(list[list.length - 1].sales)}`}
            />
          </ChartFrame>
        </Card>
        <Card className="min-w-0">
          <h3 className="mb-4 text-base leading-[1.4] font-semibold">
            {l("byChannel")} · {l("todayShort")}
          </h3>
          <BarList
            ariaLabel={l("byChannel")}
            color="var(--chart-oms)"
            rows={todayByChannel.map((r) => ({
              label: tx(salesChannelLabel[r.channel]),
              value: r.sales,
              display: money(r.sales),
              sub: `${num(r.orders)} ${l("ordersUnit")}`,
            }))}
          />
        </Card>
      </div>
    </Section>
  )
}

/* ----------------------------------------------------- 4. Customers */

export function CustomerInsights() {
  const { l, tx, num, money } = useCopy()
  const { range } = useRange()
  const rangeText = useRangeText()
  const o = customerOverview(range)
  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="flex flex-col gap-6">
          <div>
            <p className="text-sm leading-[1.4] font-medium text-content-secondary">{l("multiChannel")}</p>
            <p className="mt-1 text-5xl leading-[1.05] font-semibold">{num(MULTI_CHANNEL)}</p>
            <p className="mt-2 text-sm text-content-secondary">
              <span className="font-semibold text-crm">{((MULTI_CHANNEL / GOLDEN_RECORDS) * 100).toFixed(1)}%</span>{" "}
              {l("ofAll")}
            </p>
            <p className="mt-1 text-xs leading-[1.5] text-content-quiet">{l("multiChannelSub")}</p>
          </div>
          <div className="grid grid-cols-1 gap-5 border-t border-line pt-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <Figure label={l("golden")} value={num(GOLDEN_RECORDS)} />
            <Figure label={`${l("newInRange")} · ${rangeText(range)}`} value={num(o.newCustomers)} />
            <Figure label={l("repeatRate")} value={`${(o.repeatRate * 100).toFixed(1)}%`} />
          </div>
        </Card>

        <Card className="min-w-0 p-0">
          <h3 className="px-6 pt-5 pb-3 text-base leading-[1.4] font-semibold">{l("top10")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-y border-line bg-raised text-xs text-content-secondary">
                <tr>
                  <th scope="col" className="w-10 py-2.5 pl-6 font-medium">#</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">{l("customer")}</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">{l("channels")}</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">{l("orders")}</th>
                  <th scope="col" className="py-2.5 pr-6 pl-3 text-right font-medium">{l("last12m")}</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((t, i) => {
                  const cu = getCustomer(t.id)
                  if (!cu) return null
                  return (
                    <tr key={t.id} className="group relative border-b border-line last:border-0 hover:bg-raised">
                      <td className="tabular py-2.5 pl-6 text-content-quiet">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={cu.name} size={28} />
                          <Link href={`/customers/${cu.id}`} className="truncate font-medium after:absolute after:inset-0 group-hover:text-crm">
                            {cu.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {t.channels.map((ch) => (
                            <span key={ch} className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-content-secondary group-hover:bg-surface">
                              {tx(salesChannelLabel[ch])}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">{num(t.orders)}</td>
                      <td className="tabular py-2.5 pr-6 pl-3 text-right font-semibold">{money(t.spend12m)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}

/* -------------------------------------------------------- 5. Loyalty */

export function LoyaltyPanel() {
  const { l, tx, num, lang } = useCopy()
  const members = tiers.reduce((s, t) => s + t.count, 0)
  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex flex-col gap-5 lg:col-span-2">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {(
              [
                ["issued", Coins, "success"],
                ["redeemed", Gift, "info"],
                ["expired", ClockCountdown, "warning"],
              ] as const
            ).map(([k, icon, tone]) => (
              <Figure key={k} icon={icon} tone={tone} label={`${l(k)} · ${l("thisMonth")}`} value={num(loyaltyMonth[k])} sub={l("pointsUnit")} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-line pt-5 md:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-md bg-raised p-4">
              <span className="flex items-center gap-1.5 text-sm font-medium text-content-secondary">
                <Coins size={18} aria-hidden />
                {l("outstanding")}
              </span>
              <span className="text-2xl leading-[1.25] font-semibold">{num(loyaltyMonth.outstanding)}</span>
              <span className="text-xs text-content-quiet">{l("outstandingSub")}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-raised p-4">
              <span className="flex items-center gap-1.5 text-sm font-medium text-content-secondary">
                <Hourglass size={18} aria-hidden />
                {l("pending")}
              </span>
              <span className="text-2xl leading-[1.25] font-semibold">{num(loyaltyMonth.pending)}</span>
              <span className="text-xs text-content-quiet">{l("pendingSub")}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-warning-soft p-4">
              <span className="flex items-center gap-1.5 text-sm font-medium text-warning">
                <WarningCircle size={18} aria-hidden />
                {l("expiring")}
              </span>
              <span className="text-2xl leading-[1.25] font-semibold">{num(loyaltyMonth.expiring30d.points)}</span>
              <span className="text-xs text-content-secondary">
                {num(loyaltyMonth.expiring30d.customers)} {l("customersUnit")}
              </span>
              <Link href="/customers" className="mt-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md bg-surface px-3 text-sm font-medium hover:bg-hover">
                <Bell size={16} aria-hidden />
                {l("notifyExpiring")}
              </Link>
              <span className="text-xs text-content-secondary">{l("notifyNote")}</span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <div>
            <h3 className="mb-4 text-base leading-[1.4] font-semibold">{l("tierMix")}</h3>
            <BarList
              ariaLabel={l("tierMix")}
              color="var(--chart-crm)"
              rows={tiers.map((t) => ({
                label: tx(t.label),
                value: t.count,
                display: compact(t.count, lang),
                sub: `${((t.count / members) * 100).toFixed(0)}%`,
              }))}
            />
          </div>
          <div className="border-t border-line pt-5">
            <h3 className="mb-3 text-base leading-[1.4] font-semibold">{l("nearUpgrade")}</h3>
            <ul className="flex flex-col gap-2">
              {nearUpgrade.map((u) => (
                <li key={u.to} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-content-secondary">
                    {u.from} <ArrowRight size={14} aria-hidden className="inline" /> {u.to}
                  </span>
                  <span className="tabular font-semibold">
                    {num(u.customers)} <span className="font-normal text-content-quiet">{l("customersUnit")}</span>
                  </span>
                </li>
              ))}
            </ul>
            <ButtonLink href="/loyalty/segments/new" icon={Megaphone} className="mt-4 w-full">
              {l("makeSegment")}
            </ButtonLink>
          </div>
        </Card>

        <Card className="min-w-0 p-0 lg:col-span-3">
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-base leading-[1.4] font-semibold">{l("rules")}</h3>
            <p className="text-sm leading-[1.55] text-content-secondary">{l("rulesSub")}</p>
          </div>
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-left text-sm">
                <thead className="border-y border-line bg-raised text-xs text-content-secondary">
                  <tr>
                    <th scope="col" className="py-2.5 pl-6 font-medium">{l("tierCol")}</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">{l("rateCol")}</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">{l("reachCol")}</th>
                    <th scope="col" className="py-2.5 pr-6 pl-3 text-right font-medium">{l("per1000")}</th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_RULES.map((r) => (
                    <tr key={r.tier} className="border-b border-line last:border-0">
                      <td className="py-3 pl-6 font-medium">{r.label}</td>
                      <td className="tabular px-3 py-3">{r.rate} {l("rateUnit")}</td>
                      <td className="tabular px-3 py-3 text-content-secondary">
                        {r.minSpend === 0 ? l("starter") : `${l("from")} ฿${num(r.minSpend)}`}
                      </td>
                      <td className="tabular py-3 pr-6 pl-3 text-right font-semibold">
                        {num(pointsFor(1000, r.tier))} {l("pointsUnit")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="flex flex-col gap-3 border-t border-line px-6 py-5 text-sm leading-[1.55] text-content-secondary lg:border-t-0 lg:border-l">
              {(["ruleEarn", "ruleWait", "ruleExpire", "ruleTier"] as const).map((k) => (
                <li key={k} className="flex gap-2.5">
                  <CheckCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-crm" />
                  {l(k)}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </>
  )
}

/* ------------------------------------------------------ 6. Campaigns */

export function CampaignsPanel() {
  const { l, tx, num, date } = useCopy()
  const campaigns = useCampaigns()
  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="min-w-0 p-0 lg:col-span-2">
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-base leading-[1.4] font-semibold">{l("activeCampaigns")}</h3>
            <p className="text-sm leading-[1.55] text-content-secondary">{l("priorityNote")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-y border-line bg-raised text-xs text-content-secondary">
                <tr>
                  <th scope="col" className="py-2.5 pl-6 font-medium">{l("priority")}</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">{l("campaign")}</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">{l("periodCol")}</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">{l("orders")}</th>
                  <th scope="col" className="py-2.5 pr-6 pl-3 text-right font-medium">{l("pointsCol")}</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((cp) => (
                  <tr key={cp.id} className="group relative border-b border-line last:border-0 hover:bg-raised">
                    <td className="py-3 pl-6">
                      <span className="tabular inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-oms-soft px-2 text-xs font-semibold text-oms-on-soft">
                        P{cp.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium">
                      <Link href={`/campaigns/${cp.id}`} className="group-hover:text-crm after:absolute after:inset-0">
                        {tx(cp.name)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-content-secondary">
                      {date(cp.start)} – {date(cp.end)}
                    </td>
                    <td className="tabular px-3 py-3 text-right">{num(cp.orders)}</td>
                    <td className="tabular py-3 pr-6 pl-3 text-right font-semibold">{num(cp.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <div>
            <h3 className="mb-4 text-base leading-[1.4] font-semibold">{l("coupons")}</h3>
            <SplitBar
              parts={[
                { label: l("store"), value: couponsUsed.store, color: "var(--chart-crm)" },
                { label: l("web"), value: couponsUsed.web, color: "var(--chart-oms)" },
              ]}
            />
          </div>
          <div className="border-t border-line pt-5">
            <h3 className="mb-3 flex items-center gap-2 text-base leading-[1.4] font-semibold">
              {l("lowRewards")}
            </h3>
            <ul className="flex flex-col gap-4">
              {lowRewards.map((r) => (
                <li key={r.name.en}>
                  <Meter
                    label={tx(r.name)}
                    used={r.total - r.left}
                    limit={r.total}
                    display={`${l("left")} ${num(r.left)}/${num(r.total)}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </>
  )
}

/* --------------------------------------------------------- 7. Trends */

export function TrendsPanel() {
  const { l, num, money, lang } = useCopy()
  const { range } = useRange()
  const list = series(range)
  const weekly = isWeekly(range)
  const locale = lang === "th" ? "th-TH" : "en-GB"
  const fmtX = (x: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${x}T00:00:00Z`))
  const xHead = weekly ? l("weekOf") : l("date")
  const labels = { showTable: l("showTable"), showChart: l("showChart") }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <ChartFrame
            title={l("salesTrend")}
            description={weekly ? `${l("salesTrendSub")} · ${l("weeklyTotals")}` : l("salesTrendSub")}
            labels={labels}
            table={{
              columns: [xHead, l("orders"), l("sales")],
              rows: list.map((d) => [fmtX(d.date), num(d.orders), money(d.sales)]),
            }}
          >
            <LineChart
              points={list.map((d) => ({ x: d.date, v: d.sales }))}
              color="var(--chart-oms)"
              seriesLabel={l("sales")}
              formatValue={money}
              formatTick={(v) => `฿${compact(v, lang)}`}
              formatX={fmtX}
              ariaLabel={`${l("salesTrend")}: ${money(list[list.length - 1].sales)}`}
            />
          </ChartFrame>
        </Card>
        <Card>
          <ChartFrame
            title={l("custTrend")}
            description={weekly ? `${l("custTrendSub")} · ${l("weeklyTotals")}` : l("custTrendSub")}
            labels={labels}
            legend={[
              { color: "var(--chart-crm)", label: l("newCust") },
              { color: "var(--chart-oms)", label: l("returning") },
            ]}
            table={{
              columns: [xHead, l("newCust"), l("returning")],
              rows: list.map((d) => [fmtX(d.date), num(d.newCustomers), num(d.returning)]),
            }}
          >
            <StackedColumns
              points={list.map((d) => ({ x: d.date, returning: d.returning, fresh: d.newCustomers }))}
              series={[
                { key: "returning", label: l("returning"), color: "var(--chart-oms)" },
                { key: "fresh", label: l("newCust"), color: "var(--chart-crm)" },
              ]}
              formatValue={num}
              formatX={fmtX}
              ariaLabel={l("custTrend")}
            />
          </ChartFrame>
        </Card>
      </div>
    </>
  )
}

/* ---------------------------------------------------- 8. Operations */

export function OperationsPanel() {
  const { l, tx, num, date } = useCopy()
  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-base leading-[1.4] font-semibold">
            <Package size={20} aria-hidden />
            {l("lowStock")}
          </h3>
          <ul className="flex flex-col divide-y divide-line">
            {lowStock.map((s) => (
              <li key={s.sku} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tx(s.name)}</p>
                  <p className="tabular text-xs text-content-quiet">
                    {s.sku} · {l("reorderAt")} {num(s.reorder)}
                  </p>
                </div>
                <StatusChip tone={s.left < 10 ? "danger" : "warning"} icon={WarningCircle}>
                  {l("left")} {num(s.left)}
                </StatusChip>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 id="stores" className="mb-3 flex scroll-mt-24 items-center gap-2 text-base leading-[1.4] font-semibold">
            <PlugsConnected size={20} aria-hidden />
            {l("storeStatus")}
          </h3>
          <ul className="flex flex-col divide-y divide-line">
            {stores.map((s) => (
              <li key={s.channel} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tx(salesChannelLabel[s.channel])}</p>
                  <p className="text-xs text-content-quiet">{tx(s.synced)}</p>
                </div>
                {s.connected ? (
                  <StatusChip tone="success" icon={CheckCircle}>
                    {l("connected")}
                  </StatusChip>
                ) : (
                  <div className="flex items-center gap-2">
                    <StatusChip tone="danger" icon={Plugs}>
                      {l("disconnected")}
                    </StatusChip>
                    <Button variant="primary">
                      {l("reconnect")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card id="plan" className="scroll-mt-24">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base leading-[1.4] font-semibold">{l("planTitle")}</h3>
              <p className="text-sm text-content-secondary">
                {plan.name} · {l("renews")} {date(plan.renews)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {plan.meters.map((m) => (
              <Meter
                key={m.id}
                label={tx(m.label)}
                used={m.used}
                limit={m.limit}
                display={`${num(m.used)} / ${num(m.limit)}`}
                warnLabel={l("nearLimit")}
              />
            ))}
          </div>
          <Button className="mt-5 w-full">{l("upgrade")}</Button>
        </Card>
      </div>
    </>
  )
}

/* ------------------------------------------------------------- Page */

export function Dashboard() {
  return (
    <div className="flex flex-col gap-10">
      <TasksSection />
      <PulseSection />
      <SalesSection />
    </div>
  )
}
