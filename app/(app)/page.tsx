"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartBar,
  CheckCircle,
  Crown,
  DotsThree,
  Globe,
  Medal,
  ShoppingBag,
  Storefront,
  Sparkle,
  UsersThree,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import {
  addDays,
  channelTypeLabel,
  formatBaht,
  formatNumber,
  orderTotal,
  type ChannelType,
  type Order,
  type Tier,
} from "@/lib/portal/commerce"
import { formatDate, maskPhone, today } from "@/lib/portal/data"
import { loyaltyOf, pointSummary } from "@/lib/portal/loyalty"
import { usePortal } from "@/lib/portal/store"
import { NoCompany } from "@/components/portal/shell"
import { OrderList } from "@/components/portal/orders"
import { EmptyState, Tag } from "@/components/portal/ui"

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
]

/** Orders that count as sales: not cancelled or returned. */
const isSale = (o: Order) => o.status !== "cancelled" && o.status !== "returned"

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString("th-TH", { maximumFractionDigits: 1 })}k` : formatNumber(n)

const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number)
  return `${d} ${thaiMonths[m - 1]}`
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "สวัสดีตอนเช้า" : h < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น"
}

export default function DashboardPage() {
  const { session } = usePortal()
  if (!session?.currentCompanyId) return <NoCompany />
  return <Dashboard key={session.currentCompanyId} companyId={session.currentCompanyId} />
}

function Dashboard({ companyId }: { companyId: string }) {
  const { data, can, user } = usePortal()
  const company = data.companies.find((c) => c.id === companyId)
  const now = today()
  const yearAgo = addDays(now, -365)
  const monthAgo = addDays(now, -30)
  const twoMonthsAgo = addDays(now, -60)

  const customers = data.customers.filter((c) => c.companyId === companyId)
  const orders = data.orders.filter((o) => o.companyId === companyId)
  const sales = orders.filter(isSale)
  const sales12m = sales.filter((o) => o.createdAt.slice(0, 10) > yearAgo)
  const newCustomers = customers.filter((c) => c.createdAt > monthAgo).length

  const settings = loyaltyOf(data, companyId)
  const summaries = customers.map((c) => ({ customer: c, ...pointSummary(data, companyId, c.id) }))
  const expiringCustomers = summaries.filter((p) => p.expiringSoon > 0).length

  // Last 6 calendar months, oldest first.
  const [y, m] = now.split("-").map(Number)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const own = sales.filter((o) => o.createdAt.startsWith(key))
    return {
      key,
      label: thaiMonths[d.getMonth()],
      total: own.reduce((s, o) => s + orderTotal(o), 0),
      orders: own.length,
      customers: customers.filter((c) => c.createdAt.startsWith(key)).length,
    }
  })

  // Running sales total over the last 30 days, one point per day.
  const days = Array.from({ length: 30 }, (_, i) => addDays(now, i - 29))
  let running = 0
  const cumulative = days.map((day) => {
    running += sales.filter((o) => o.createdAt.startsWith(day)).reduce((s, o) => s + orderTotal(o), 0)
    return { day, total: running }
  })
  const sales30d = running
  const salesPrev30d = sales
    .filter((o) => {
      const d = o.createdAt.slice(0, 10)
      return d > twoMonthsAgo && d <= monthAgo
    })
    .reduce((s, o) => s + orderTotal(o), 0)

  const byChannel = data.channels
    .filter((c) => c.companyId === companyId)
    .map((c) => {
      const own = sales12m.filter((o) => o.channelId === c.id)
      return { id: c.id, type: c.type, label: c.name, total: own.reduce((s, o) => s + orderTotal(o), 0), count: own.length }
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total)

  const byTier = settings.tiers.map((t) => ({
    tier: t.tier,
    label: t.label,
    minSpend: t.minSpend,
    count: summaries.filter((s) => s.tier.tier === t.tier).length,
  }))

  const top = [...summaries].sort((a, b) => b.spend12m - a.spend12m)[0]
  const failed = data.ingestEvents.filter((e) => e.companyId === companyId && e.status === "failed").length
  const unmapped = data.mappings.filter((mp) => mp.companyId === companyId && !mp.channelId).length
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  const news: News[] = []
  if (can("integration.read") && failed > 0)
    news.push({
      icon: WarningCircle,
      title: `รับคำสั่งซื้อไม่สำเร็จ ${failed} รายการ`,
      body: "ตรวจดูสาเหตุ แก้ข้อมูล แล้วกดส่งใหม่ได้จากหน้าติดตามการรับข้อมูล",
      href: `/integration/ingestion`,
      cta: "ดูรายการ",
    })
  if (can("integration.read") && unmapped > 0)
    news.push({
      icon: WarningCircle,
      title: `ร้านค้ายังไม่ได้ Mapping ${unmapped} ร้าน`,
      body: "คำสั่งซื้อจากร้านเหล่านี้จะยังไม่เข้าระบบจนกว่าจะผูกกับช่องทาง",
      href: `/integration/mapping`,
      cta: "ผูกร้านค้า",
    })
  if (can("loyalty.read") && expiringCustomers > 0)
    news.push({
      icon: Sparkle,
      title: `แต้มใกล้หมดอายุ ${expiringCustomers} ราย`,
      body: `ลูกค้าเหล่านี้มีแต้มที่จะหมดอายุภายใน ${settings.expiryNoticeDays} วัน ชวนมาแลกของรางวัลก่อนหมดอายุ`,
      href: `/loyalty/points`,
      cta: "ดูรายชื่อ",
    })
  news.push({
    icon: news.length ? UsersThree : CheckCircle,
    title: news.length ? `ลูกค้าใหม่ ${newCustomers} รายใน 30 วัน` : "วันนี้ไม่มีเรื่องค้าง",
    body: news.length
      ? "ดูรายชื่อลูกค้าที่เพิ่งเข้ามาและตรวจข้อมูลซ้ำก่อนเริ่มสะสมแต้ม"
      : `ไม่มีคำสั่งซื้อค้างรับเข้าหรือแต้มใกล้หมดอายุ · ลูกค้าใหม่ ${newCustomers} รายใน 30 วัน`,
    href: `/customers`,
    cta: "ดูลูกค้า",
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Hero: same radial gradient + grid as the login illustration panel. */}
      {/* Decor clips inside its own layer so the company dropdown can overflow the hero. */}
      <section className="relative mb-2 rounded-xl bg-brand-radial">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-brand-grid" />
          <Image
            src="/login-mascots.webp"
            alt=""
            width={1400}
            height={1134}
            priority
            sizes="240px"
            className="absolute right-6 -bottom-6 hidden w-[240px] animate-[portal-float_6s_ease-in-out_infinite] drop-shadow-[0_20px_30px_rgb(10_40_120/0.35)] lg:block"
          />
        </div>
        <div className="relative flex min-h-[180px] flex-wrap items-end justify-between gap-4 p-6 md:p-8 lg:pr-[300px]">
          <div className="min-w-0">
            <h1 className="text-[28px] leading-[1.25] font-semibold text-content md:text-[36px]">
              {greeting()}, <span className="text-oms">{user?.email.split("@")[0]}</span>!
            </h1>
            <p className="mt-1 text-[15px] text-content-secondary">
              ภาพรวมลูกค้า ยอดขาย และแต้มของ {company?.name ?? companyId} · ข้อมูลถึง {formatDate(now)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader title="ลูกค้าและคำสั่งซื้อ" action={can("orders.read") && <PillLink href={`/orders`}>รายงาน</PillLink>} />
          <TrendLines rows={months} />
        </Card>

        <NewsCard items={news} />

        <Card>
          <CardHeader
            title="ยอดขาย 30 วัน"
            action={can("orders.read") && <MoreLink href={`/orders`} label="ดูคำสั่งซื้อ" />}
          />
          <SalesRun rows={cumulative} total={sales30d} previous={salesPrev30d} />
        </Card>

        <Card className="p-0 sm:p-0">
          <CardHeader
            divided
            title="สมาชิกตามระดับ"
            action={can("loyalty.read") && <MoreLink href={`/loyalty/points`} label="ดูแต้มสะสม" />}
          />
          <TierProgress rows={byTier} total={customers.length} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.7fr_1fr]">
        <Card className="p-0 sm:p-0">
          <CardHeader
            divided
            title="ลูกค้ายอดซื้อสูงสุด"
            action={top && can("customers.read") && <PillLink href={`/customers/${top.customer.id}`}>ดูรายละเอียด</PillLink>}
          />
          {top ? (
            <TopCustomer
              name={top.customer.name}
              phone={top.customer.phone}
              tier={top.tier.label}
              tierKey={top.tier.tier}
              facts={[
                { label: "ยอดซื้อ 12 เดือน", value: formatBaht(top.spend12m) },
                { label: "แต้มใช้ได้", value: `${formatNumber(top.available)} แต้ม` },
                { label: "คำสั่งซื้อทั้งหมด", value: `${orders.filter((o) => o.customerId === top.customer.id).length} รายการ` },
                {
                  label: "ซื้อล่าสุด",
                  value: (() => {
                    const last = orders.filter((o) => o.customerId === top.customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
                    return last ? formatDate(last.createdAt) : "-"
                  })(),
                },
              ]}
            />
          ) : (
            <EmptyState icon={UsersThree} title="ยังไม่มีลูกค้า">ลูกค้าจะแสดงเมื่อมีคำสั่งซื้อแรกเข้ามา</EmptyState>
          )}
        </Card>

        <Card className="p-0 sm:p-0 md:order-first md:col-span-2 xl:order-none xl:col-span-1">
          <CardHeader divided title="ยอดขายรายเดือน" action={<span className="text-xs text-content-quiet">6 เดือนล่าสุด</span>} />
          <div className="p-5 sm:px-6">
            <MonthlyColumns rows={months} />
          </div>
        </Card>

        <Card className="p-0 sm:p-0">
          <CardHeader
            divided
            title="ยอดขายตามช่องทาง"
            action={can("integration.read") && <PillLink href={`/integration/connections`}>ดูรายละเอียด</PillLink>}
          />
          {byChannel.length === 0 ? (
            <EmptyState icon={ChartBar} title="ยังไม่มียอดขาย">
              ยอดขายจะแสดงเมื่อช่องทางเริ่มส่งคำสั่งซื้อเข้ามา
            </EmptyState>
          ) : (
            <ChannelList rows={byChannel.slice(0, 4)} />
          )}
        </Card>
      </div>

      <Card className="p-0 sm:p-0">
        <CardHeader
          divided
          title="คำสั่งซื้อล่าสุด"
          action={can("orders.read") && <PillLink href={`/orders`}>ดูทั้งหมด</PillLink>}
        />
        <div className="p-4 sm:p-6">
          {!can("orders.read") ? (
            <EmptyState>บัญชีของคุณไม่มีสิทธิ์ดูคำสั่งซื้อ</EmptyState>
          ) : recent.length === 0 ? (
            <EmptyState>ยังไม่มีคำสั่งซื้อ</EmptyState>
          ) : (
            <OrderList orders={recent} />
          )}
        </div>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------ Card chrome */

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-lg border border-line bg-surface p-5 sm:p-6", className)}>
      {children}
    </section>
  )
}

function CardHeader({ title, action, divided }: { title: string; action?: React.ReactNode; divided?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-3",
        divided ? "border-b border-line px-5 py-3 sm:px-6" : "mb-4"
      )}
    >
      <h2 className="text-[17px] leading-[1.4] font-semibold text-content">{title}</h2>
      {action}
    </div>
  )
}

function PillLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-line px-3.5 text-[13px] font-medium text-oms transition-colors duration-[120ms] hover:border-oms hover:bg-oms-soft"
    >
      {children}
    </Link>
  )
}

function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-content-secondary hover:bg-hover hover:text-content"
    >
      <DotsThree size={18} weight="bold" />
    </Link>
  )
}

/* ------------------------------------------------------------ News */

type News = { icon: Icon; title: string; body: string; href: string; cta: string }

/** Brand-blue card that rotates through what needs attention today. */
function NewsCard({ items }: { items: News[] }) {
  const [index, setIndex] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const item = items[Math.min(index, items.length - 1)]

  React.useEffect(() => {
    if (paused || items.length < 2) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % items.length), 6000)
    return () => window.clearTimeout(t)
  }, [index, paused, items.length])

  const IconCmp = item.icon
  return (
    <section
      aria-roledescription="carousel"
      aria-label="สิ่งที่ต้องดูแลวันนี้"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="flex min-h-[248px] min-w-0 flex-col rounded-lg bg-action p-5 text-on-action sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-surface text-oms">
          <IconCmp size={24} weight="bold" aria-hidden />
        </span>
        <span className="inline-flex h-8 items-center rounded-full bg-surface px-3.5 text-[13px] font-medium text-oms">
          วันนี้
        </span>
      </div>
      <div key={index} aria-live="polite" className="animate-in fade-in-0 slide-in-from-bottom-1 mt-5 flex-1 duration-300">
        <h2 className="text-lg leading-[1.4] font-semibold">{item.title}</h2>
        <p className="mt-1.5 text-sm leading-[1.6] text-on-action/85">{item.body}</p>
        <Link
          href={item.href}
          className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-full text-sm font-medium underline-offset-4 hover:underline"
        >
          {item.cta}
          <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
      {items.length > 1 && (
        <div className="mt-4 flex gap-2">
          {items.map((n, i) => (
            <button
              key={n.title}
              type="button"
              aria-label={`เรื่องที่ ${i + 1} จาก ${items.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="flex h-4 flex-1 items-center"
            >
              <span className="h-1 w-full overflow-hidden rounded-full bg-on-action/30">
                <span className={cn("block h-full rounded-full bg-on-action transition-[width] duration-300", i === index ? "w-full" : "w-0")} />
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------ Charts */

type Month = { key: string; label: string; total: number; orders: number; customers: number }

/** Smooth path through points (Catmull-Rom as cubic Béziers). */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return ""
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
}

/** Two counts on one axis: orders placed and new customers per month. */
function TrendLines({ rows }: { rows: Month[] }) {
  const [active, setActive] = React.useState(rows.length - 1)
  const W = 300
  const H = 130
  const max = Math.max(2, ...rows.map((r) => Math.max(r.orders, r.customers)))
  const x = (i: number) => (i / (rows.length - 1)) * W
  const yv = (v: number) => H - 6 - (v / max) * (H - 16)
  const series = [
    { key: "orders" as const, label: "คำสั่งซื้อ", color: "var(--chart-oms)" },
    { key: "customers" as const, label: "ลูกค้าใหม่", color: "var(--chart-crm)" },
  ]
  const r = rows[active]
  const left = `${(active / (rows.length - 1)) * 100}%`

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-content-secondary">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-3.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex flex-1 gap-2">
        <div className="flex flex-col justify-between pt-6 pb-6 text-right text-[11px] text-content-quiet tabular-nums">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="relative pt-7">
            <svg viewBox={`0 -4 ${W} ${H + 8}`} className="block h-auto w-full overflow-visible" aria-hidden>
              {[0, 0.5, 1].map((t) => (
                <line key={t} x1={0} x2={W} y1={yv(max * t)} y2={yv(max * t)} stroke="var(--chart-grid)" strokeWidth={1} />
              ))}
              <line x1={x(active)} x2={x(active)} y1={0} y2={H} stroke="var(--chart-oms)" strokeWidth={1.5} strokeDasharray="4 4" />
              {series.map((s) => (
                <path
                  key={s.key}
                  d={smooth(rows.map((row, i) => [x(i), yv(row[s.key])]))}
                  pathLength={1}
                  className="relio-line"
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              ))}
              {series.map((s) => (
                <circle
                  key={s.key}
                  className="relio-dot"
                  cx={x(active)}
                  cy={yv(r[s.key])}
                  r={4.5}
                  fill={s.color}
                  stroke="var(--bg-surface)"
                  strokeWidth={2}
                />
              ))}
            </svg>
            <div
              className="pointer-events-none absolute top-0 flex -translate-x-1/2 gap-1 whitespace-nowrap"
              style={{ left: `clamp(80px, ${left}, calc(100% - 80px))` }}
            >
              <span className="rounded-full bg-content px-2 py-0.5 text-[11px] font-medium text-canvas tabular-nums">
                {r.orders} คำสั่งซื้อ
              </span>
              <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-crm tabular-nums">
                {r.customers} ลูกค้าใหม่
              </span>
            </div>
            {rows.map((row, i) => (
              <button
                key={row.key}
                type="button"
                aria-label={`${row.label}: คำสั่งซื้อ ${row.orders} รายการ ลูกค้าใหม่ ${row.customers} ราย`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="absolute top-7 bottom-0 -translate-x-1/2 focus-visible:outline-offset-[-2px]"
                style={{ left: `${(i / (rows.length - 1)) * 100}%`, width: `${100 / (rows.length - 1)}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-content-quiet">
            {rows.map((row, i) => (
              <span key={row.key} className={cn("w-0 text-center whitespace-nowrap", i === active && "font-medium text-content")}>
                <span className="inline-block -translate-x-1/2">{row.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Hero number plus the running total as a step line. */
function SalesRun({ rows, total, previous }: { rows: { day: string; total: number }[]; total: number; previous: number }) {
  const [active, setActive] = React.useState<number | null>(null)
  const W = 300
  const H = 110
  const max = Math.max(1, total)
  const x = (i: number) => (i / (rows.length - 1)) * W
  const yv = (v: number) => H - 2 - (v / max) * (H - 10)
  let d = `M${x(0)},${yv(rows[0].total)}`
  rows.forEach((r, i) => {
    if (i > 0) d += ` H${x(i)} V${yv(r.total)}`
  })
  const area = `${d} V${H} H0 Z`
  const change = previous > 0 ? ((total - previous) / previous) * 100 : null
  const up = change !== null && change >= 0
  const weeks = [0, 7, 14, 21, 29]
  const hovered = active !== null ? rows[active] : null

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[30px] leading-none font-semibold text-content tabular-nums">
          ฿{compact(hovered?.total ?? total)}
        </span>
        {hovered ? (
          <span className="text-xs text-content-quiet">สะสมถึง {shortDate(hovered.day)}</span>
        ) : change !== null ? (
          <span
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium tabular-nums",
              up ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
            )}
          >
            {up ? <ArrowUpRight size={12} weight="bold" aria-hidden /> : <ArrowDownRight size={12} weight="bold" aria-hidden />}
            {up ? "+" : ""}
            {change.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%
            <span className="sr-only">เทียบกับ 30 วันก่อนหน้า</span>
          </span>
        ) : (
          <span className="text-xs text-content-quiet">ยังไม่มียอดช่วงก่อนหน้าให้เทียบ</span>
        )}
      </div>
      <p className="mt-1 text-xs text-content-quiet">ยอดสะสมรายวัน เทียบกับ 30 วันก่อนหน้า</p>
      <div className="relative mt-auto pt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
          {weeks.slice(1, -1).map((i) => (
            <line key={i} x1={x(i)} x2={x(i)} y1={0} y2={H} stroke="var(--chart-grid)" strokeWidth={1} />
          ))}
          <path d={area} className="relio-area" fill="var(--chart-oms)" fillOpacity={0.1} />
          <path d={d} pathLength={1} className="relio-line" fill="none" stroke="var(--chart-oms)" strokeWidth={2} strokeLinejoin="round" />
          <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke="var(--chart-grid)" />
          {active !== null && (
            <circle cx={x(active)} cy={yv(rows[active].total)} r={4.5} fill="var(--chart-oms)" stroke="var(--bg-surface)" strokeWidth={2} />
          )}
        </svg>
        <div className="absolute inset-0 top-4 flex" onMouseLeave={() => setActive(null)}>
          {rows.map((r, i) => (
            <span
              key={r.day}
              aria-hidden
              onMouseEnter={() => setActive(i)}
              className="flex-1"
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-content-quiet">
          {weeks.map((i) => (
            <span key={i}>{shortDate(rows[i].day)}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

const tierIcon: Record<Tier, Icon> = { silver: Medal, gold: Medal, platinum: Crown }

function TierProgress({
  rows,
  total,
}: {
  rows: { tier: Tier; label: string; minSpend: number; count: number }[]
  total: number
}) {
  return (
    <ul className="flex flex-1 flex-col divide-y divide-line px-5 sm:px-6">
      {rows.map((r) => {
        const IconCmp = tierIcon[r.tier]
        const share = total ? (r.count / total) * 100 : 0
        return (
          <li key={r.tier} className="flex items-center gap-3.5 py-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-crm-soft text-crm-on-soft">
              <IconCmp size={20} weight="duotone" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{r.label}</span>
                <span className="shrink-0 text-xs text-content-secondary tabular-nums">{formatNumber(r.count)} ราย</span>
              </div>
              <div
                className="mt-2 h-1.5 rounded-full bg-raised"
                role="meter"
                aria-label={`${r.label} ${Math.round(share)}% ของลูกค้า`}
                aria-valuenow={Math.round(share)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="relio-bar-x h-full rounded-full bg-chart-crm" style={{ width: `${share}%` }} />
              </div>
              <span className="mt-1 block text-[11px] text-content-quiet">
                {r.minSpend ? `ยอดซื้อ 12 เดือนตั้งแต่ ${formatBaht(r.minSpend)}` : "ระดับเริ่มต้น"}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Columns for monthly sales; months above the average are filled solid. */
function MonthlyColumns({ rows }: { rows: Month[] }) {
  const [active, setActive] = React.useState<number | null>(null)
  const max = Math.max(1, ...rows.map((r) => r.total))
  const avg = rows.reduce((s, r) => s + r.total, 0) / rows.length
  const scale = (v: number) => (v / max) * 88

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-4 text-xs text-content-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full border border-oms/40 bg-oms-soft" />
          ต่ำกว่าค่าเฉลี่ย
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-full bg-chart-oms" />
          สูงกว่าค่าเฉลี่ย
        </span>
      </div>
      <div className="flex gap-3">
        <div className="flex h-56 flex-col justify-between text-right text-[11px] text-content-quiet tabular-nums">
          <span>{compact(max)}</span>
          <span>{compact(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative flex h-56 items-end gap-3 border-b border-chart-grid sm:gap-5" role="list">
            {avg > 0 && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 z-10 border-t-[1.5px] border-dashed border-oms"
                style={{ bottom: `${scale(avg)}%` }}
              >
                <span className="absolute -top-[5px] -left-1 size-2 rounded-full bg-oms" />
                <span className="absolute right-0 bottom-1 rounded-full bg-surface px-1.5 text-[11px] font-medium text-oms tabular-nums">
                  เฉลี่ย ฿{compact(avg)}
                </span>
              </div>
            )}
            {rows.map((r, i) => {
              const high = r.total > avg
              return (
                <div
                  key={r.key}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${r.label}: ${formatBaht(r.total)} · ${r.orders} คำสั่งซื้อ`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="relative flex h-full flex-1 flex-col justify-end outline-offset-2"
                >
                  {active === i && (
                    <span className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md bg-content px-2.5 py-1.5 text-xs whitespace-nowrap text-canvas shadow-lg" style={{ bottom: `${scale(r.total)}%` }}>
                      <span className="block font-medium">{r.label}</span>
                      <span className="block tabular-nums">{formatBaht(r.total)}</span>
                      <span className="block text-canvas/70 tabular-nums">{r.orders} คำสั่งซื้อ</span>
                    </span>
                  )}
                  <div
                    className={cn(
                      "relio-bar mx-auto w-full max-w-16 rounded-t-[10px] rounded-b-[4px] transition-opacity",
                      high ? "bg-chart-oms" : "border border-oms/30 bg-oms-soft",
                      active !== null && active !== i && "opacity-60"
                    )}
                    style={{ height: `${scale(r.total)}%`, minHeight: r.total ? 4 : 0 }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex gap-3 text-center text-xs text-content-quiet sm:gap-5">
            {rows.map((r, i) => (
              <span key={r.key} className={cn("flex-1", active === i && "font-medium text-content")}>
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Lists */

function TopCustomer({
  name,
  phone,
  tier,
  tierKey,
  facts,
}: {
  name: string
  phone?: string
  tier: string
  tierKey: Tier
  facts: { label: string; value: React.ReactNode }[]
}) {
  const IconCmp = tierIcon[tierKey]
  return (
    <div className="flex flex-1 flex-col px-5 sm:px-6">
      <div className="flex items-center gap-3 border-b border-line py-4">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-crm-soft text-lg font-semibold text-crm-on-soft"
        >
          {name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-sm text-content-quiet">{phone ? maskPhone(phone) : "ไม่มีเบอร์โทร"}</p>
        </div>
        <Tag tone="brand">
          <IconCmp size={14} weight="bold" aria-hidden />
          {tier}
        </Tag>
      </div>
      <dl className="grid grid-cols-2 gap-x-4">
        {facts.map((f, i) => (
          <div key={f.label} className={cn("py-4", i < 2 && "border-b border-line")}>
            <dt className="text-xs text-content-quiet">{f.label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-content tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const channelIcon: Record<ChannelType, Icon> = {
  website: Globe,
  pos: Storefront,
  shopee: ShoppingBag,
  lazada: ShoppingBag,
  tiktok: ShoppingBag,
}

function ChannelList({ rows }: { rows: { id: string; type: ChannelType; label: string; total: number; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total))
  return (
    <ul className="flex flex-col divide-y divide-line px-5 sm:px-6">
      {rows.map((r) => {
        const IconCmp = channelIcon[r.type]
        return (
          <li key={r.id} className="flex items-center gap-3 py-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-oms-soft text-oms-on-soft">
              <IconCmp size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{r.label}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums">฿{compact(r.total)}</span>
              </div>
              <p className="truncate text-xs text-content-quiet">
                {channelTypeLabel[r.type]} · {r.count} คำสั่งซื้อ
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-raised">
                <div className="relio-bar-x h-full rounded-full bg-chart-oms" style={{ width: `${(r.total / max) * 100}%` }} />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
