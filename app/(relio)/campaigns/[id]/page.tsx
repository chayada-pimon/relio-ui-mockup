"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Coins,
  Copy,
  Money,
  Pause,
  Play,
  Receipt,
  UsersThree,
} from "@phosphor-icons/react"

import { useLang } from "@/lib/relio/i18n"
import { TODAY, daysSince } from "@/lib/relio/data"
import { TIER_RULES } from "@/lib/relio/loyalty"
import {
  campaignDaily,
  campaignStatus,
  salesChannelLabel,
  type Text,
} from "@/lib/relio/dashboard"
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  StatTile,
  Toast,
} from "@/components/relio/ui"
import { ChartFrame, LineChart, compact } from "@/components/relio/charts"
import {
  CampaignStatusChip,
  audienceLabel,
  campaignPoints,
  ruleKindLabel,
  ruleText,
} from "@/components/relio/campaign"
import { NotFound } from "@/components/relio/not-found"
import { useCampaigns } from "@/lib/relio/campaign-store"

const c = {
  back: { th: "กลับไปหน้าแคมเปญ", en: "Back to campaigns" },
  duplicate: { th: "ทำสำเนา", en: "Duplicate" },
  pause: { th: "หยุดชั่วคราว", en: "Pause" },
  resume: { th: "เปิดใช้ต่อ", en: "Resume" },
  paused: { th: "หยุดแคมเปญชั่วคราวแล้ว", en: "Campaign paused" },
  pausedBody: {
    th: "ออเดอร์ใหม่จะไม่ได้คะแนนจากแคมเปญนี้ คะแนนที่แจกไปแล้วยังอยู่",
    en: "New orders won't earn from it. Points already issued stay.",
  },
  resumed: { th: "เปิดแคมเปญต่อแล้ว", en: "Campaign resumed" },
  orders: { th: "ออเดอร์ที่เข้าแคมเปญ", en: "Orders in campaign" },
  customers: { th: "ลูกค้าที่ได้สิทธิ์", en: "Customers reached" },
  points: { th: "คะแนนที่แจก", en: "Points issued" },
  sales: { th: "ยอดขายจากแคมเปญ", en: "Campaign sales" },
  perOrder: { th: "เฉลี่ย {v} ต่อออเดอร์", en: "{v} per order" },
  perCustomer: { th: "{v}% ซื้อซ้ำในช่วงแคมเปญ", en: "{v}% bought again during it" },
  cost: { th: "คิดเป็นมูลค่าราว {v}", en: "Worth about {v}" },
  share: { th: "{v} ต่อลูกค้า", en: "{v} per customer" },
  daily: { th: "ออเดอร์รายวัน", en: "Daily orders" },
  dailySub: { th: "ออเดอร์ที่ได้คะแนนจากแคมเปญนี้", en: "Orders that earned points from this campaign" },
  date: { th: "วันที่", en: "Date" },
  ordersUnit: { th: "ออเดอร์", en: "Orders" },
  showTable: { th: "ดูเป็นตาราง", en: "Show table" },
  showChart: { th: "ดูเป็นกราฟ", en: "Show chart" },
  details: { th: "รายละเอียด", en: "Details" },
  type: { th: "ประเภท", en: "Type" },
  rule: { th: "เงื่อนไข", en: "Rule" },
  period: { th: "ช่วงเวลา", en: "Period" },
  daysLeft: { th: "เหลือ {n} วัน", en: "{n} days left" },
  endsToday: { th: "จบวันนี้", en: "Ends today" },
  audience: { th: "กลุ่มเป้าหมาย", en: "Audience" },
  channels: { th: "ช่องทาง", en: "Channels" },
  priority: { th: "Priority", en: "Priority" },
  priorityNote: {
    th: "ถ้าออเดอร์เข้าหลายแคมเปญ ใช้แคมเปญที่เลข Priority น้อยที่สุด",
    en: "If an order matches several campaigns, the lowest priority number wins.",
  },
  example: { th: "ตัวอย่าง: ซื้อ ฿1,000", en: "Example: a ฿1,000 order" },
  exampleSub: { th: "คะแนนปกติเทียบกับช่วงแคมเปญ", en: "Usual points compared with the campaign" },
  usual: { th: "ปกติ", en: "Usual" },
  during: { th: "ช่วงแคมเปญ", en: "Campaign" },
  tier: { th: "ระดับ", en: "Tier" },
  others: { th: "แคมเปญอื่นที่ทำงานพร้อมกัน", en: "Running at the same time" },
  noData: { th: "ยังไม่มีออเดอร์ที่เข้าแคมเปญนี้", en: "No orders in this campaign yet." },
  noDataScheduled: {
    th: "แคมเปญเริ่ม {date} กราฟจะแสดงเมื่อมีออเดอร์",
    en: "Starts on {date}. The chart appears once orders come in.",
  },
} satisfies Record<string, Text>

type Key = keyof typeof c

/** Rough baht value of one point, for the cost hint. */
const POINT_VALUE = 0.25

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { lang, money, date } = useLang()
  const l = (k: Key) => c[k][lang]
  const num = (n: number) => n.toLocaleString(lang === "th" ? "th-TH" : "en-GB")
  const [paused, setPaused] = React.useState(false)
  const [toast, setToast] = React.useState<"paused" | "resumed" | null>(null)
  const closeToast = React.useCallback(() => setToast(null), [])

  const campaigns = useCampaigns()
  const cp = campaigns.find((o) => o.id === id)
  if (!cp) return <NotFound backHref="/campaigns" backLabel={c.back[lang]} />

  const status = campaignStatus(cp)
  const state = paused && status === "active" ? "paused" : status
  const daily = campaignDaily(cp)
  const left = -daysSince(cp.end)
  const locale = lang === "th" ? "th-TH" : "en-GB"
  const fmtX = (x: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
      new Date(`${x}T00:00:00Z`)
    )
  const overlapping = campaigns.filter(
    (o) => o.id !== cp.id && o.start <= cp.end && o.end >= cp.start && o.end >= TODAY
  )

  function togglePause() {
    setPaused((p) => !p)
    setToast(paused ? "resumed" : "paused")
  }

  const details: { label: Key; value: React.ReactNode }[] = [
    { label: "type", value: ruleKindLabel[cp.rule.kind][lang] },
    { label: "rule", value: ruleText(cp.rule, lang) },
    {
      label: "period",
      value: (
        <>
          {date(cp.start)} – {date(cp.end)}
          {status === "active" && (
            <span className="block text-xs text-content-quiet">
              {left === 0 ? l("endsToday") : l("daysLeft").replace("{n}", String(left))}
            </span>
          )}
        </>
      ),
    },
    { label: "audience", value: audienceLabel[cp.audience][lang] },
    {
      label: "channels",
      value: (
        <span className="flex flex-wrap gap-1.5">
          {cp.channels.map((ch) => (
            <span key={ch} className="inline-flex h-7 items-center rounded-full bg-raised px-2.5 text-xs font-medium">
              {salesChannelLabel[ch][lang]}
            </span>
          ))}
        </span>
      ),
    },
  ]

  return (
    <>
      <Link
        href="/campaigns"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-content-secondary hover:text-content"
      >
        <ArrowLeft size={18} aria-hidden />
        {l("back")}
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] leading-[1.25] font-semibold md:text-4xl md:leading-[1.2]">
              {cp.name[lang]}
            </h1>
            <CampaignStatusChip state={state} />
          </div>
          <p className="mt-1 text-base text-content-secondary">
            {ruleText(cp.rule, lang)} ·{" "}
            <span className="tabular text-content-quiet">
              {cp.id} · P{cp.priority}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/campaigns/new?from=${cp.id}`} icon={Copy}>
            {l("duplicate")}
          </ButtonLink>
          {status === "active" && (
            <Button variant={paused ? "primary" : "secondary"} icon={paused ? Play : Pause} onClick={togglePause}>
              {paused ? l("resume") : l("pause")}
            </Button>
          )}
        </div>
      </header>

      <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={l("orders")}
          value={num(cp.orders)}
          hint={cp.orders ? l("perOrder").replace("{v}", money(cp.sales / cp.orders)) : "—"}
          icon={Receipt}
          context="oms"
        />
        <StatTile
          label={l("customers")}
          value={num(cp.customers)}
          hint={
            cp.customers
              ? l("perCustomer").replace(
                  "{v}",
                  (((cp.orders - cp.customers) / cp.customers) * 100).toFixed(0)
                )
              : "—"
          }
          icon={UsersThree}
          context="crm"
        />
        <StatTile
          label={l("points")}
          value={num(cp.points)}
          hint={l("cost").replace("{v}", money(cp.points * POINT_VALUE))}
          icon={Coins}
          context="crm"
        />
        <StatTile
          label={l("sales")}
          value={money(cp.sales)}
          hint={cp.customers ? l("share").replace("{v}", money(cp.sales / cp.customers)) : "—"}
          icon={Money}
          context="neutral"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            {cp.orders === 0 ? (
              <>
                <CardHeader title={l("daily")} description={l("dailySub")} />
                <p className="rounded-md bg-raised p-6 text-center text-sm text-content-secondary">
                  {status === "scheduled"
                    ? l("noDataScheduled").replace("{date}", date(cp.start))
                    : l("noData")}
                </p>
              </>
            ) : (
            <ChartFrame
              title={l("daily")}
              description={l("dailySub")}
              labels={{ showTable: l("showTable"), showChart: l("showChart") }}
              table={{
                columns: [l("date"), l("ordersUnit")],
                rows: daily.map((d) => [fmtX(d.date), num(d.orders)]),
              }}
            >
              <LineChart
                points={daily.map((d) => ({ x: d.date, v: d.orders }))}
                color="var(--chart-crm)"
                seriesLabel={l("ordersUnit")}
                formatValue={num}
                formatTick={(v) => compact(v, lang)}
                formatX={fmtX}
                ariaLabel={`${l("daily")}: ${num(cp.orders)}`}
              />
            </ChartFrame>
            )}
          </Card>

          <Card className="p-0">
            <div className="px-6 pt-5 pb-3">
              <h2 className="text-xl leading-[1.4] font-semibold">{l("example")}</h2>
              <p className="text-sm text-content-secondary">{l("exampleSub")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead className="border-y border-line bg-raised text-xs text-content-secondary">
                  <tr>
                    <th scope="col" className="py-2.5 pl-6 font-medium">{l("tier")}</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">{l("usual")}</th>
                    <th scope="col" className="py-2.5 pr-6 pl-3 text-right font-medium">{l("during")}</th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_RULES.map((r) => {
                    const p = campaignPoints(cp.rule, 1000, r.tier)
                    return (
                      <tr key={r.tier} className="border-b border-line last:border-0">
                        <td className="py-3 pl-6 font-medium">{r.label}</td>
                        <td className="tabular px-3 py-3 text-right text-content-secondary">{num(p.base)}</td>
                        <td className="tabular py-3 pr-6 pl-3 text-right font-semibold text-crm">
                          {num(p.total)}
                          {p.total > p.base && (
                            <span className="ml-1.5 text-xs font-medium">+{num(p.total - p.base)}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title={l("details")} />
            <dl className="flex flex-col gap-4 text-sm">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="text-xs text-content-quiet">{l(d.label)}</dt>
                  <dd className="mt-0.5">{d.value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-content-quiet">{l("priority")}</dt>
                <dd className="mt-0.5">
                  <span className="tabular inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-oms-soft px-2 text-xs font-semibold text-oms-on-soft">
                    P{cp.priority}
                  </span>
                  <p className="mt-1.5 text-xs text-content-secondary">{l("priorityNote")}</p>
                </dd>
              </div>
            </dl>
          </Card>

          {overlapping.length > 0 && (
            <Card>
              <h2 className="mb-3 text-base leading-[1.4] font-semibold">{l("others")}</h2>
              <ul className="-mx-3 flex flex-col">
                {overlapping.map((o) => (
                  <li key={o.id}>
                    <Link href={`/campaigns/${o.id}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-raised">
                      <span className="tabular inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-oms-soft px-2 text-xs font-semibold text-oms-on-soft">
                        P{o.priority}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{o.name[lang]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          title={l(toast)}
          body={toast === "paused" ? l("pausedBody") : undefined}
          onClose={closeToast}
        />
      )}
    </>
  )
}
