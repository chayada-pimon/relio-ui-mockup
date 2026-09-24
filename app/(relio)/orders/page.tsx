"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Plus, Receipt } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang } from "@/lib/relio/i18n"
import {
  getCustomer,
  orderTotal,
  orders,
  type OrderStatus,
} from "@/lib/relio/data"
import {
  ButtonLink,
  Card,
  EmptyState,
  OrderStatusChip,
  PageHeader,
  PaymentChip,
  channelLabel,
  SearchInput,
  orderStatusMeta,
} from "@/components/relio/ui"

const tabs: (OrderStatus | "all")[] = [
  "all",
  "pending",
  "confirmed",
  "packing",
  "shipped",
  "delivered",
  "cancelled",
]

function isStatus(v: string | null): v is OrderStatus {
  return !!v && v in orderStatusMeta
}

function OrdersView() {
  const { t, money, date } = useLang()
  const params = useSearchParams()
  const initial = params.get("status")
  const [status, setStatus] = React.useState<OrderStatus | "all">(
    isStatus(initial) ? initial : "all"
  )
  const [query, setQuery] = React.useState(params.get("q") ?? "")

  React.useEffect(() => {
    const s = params.get("status")
    setStatus(isStatus(s) ? s : "all")
    setQuery(params.get("q") ?? "")
  }, [params])

  const q = query.trim().toLowerCase()
  const rows = [...orders]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((o) => status === "all" || o.status === status)
    .filter((o) => {
      if (!q) return true
      const c = getCustomer(o.customerId)
      return [o.id, c?.name ?? "", c?.phone ?? ""].some((f) =>
        f.toLowerCase().includes(q)
      )
    })

  return (
    <>
      <PageHeader
        title={t("ordersTitle")}
        description={t("ordersSub")}
        actions={
          <ButtonLink href="/orders/new" variant="primary" icon={Plus}>
            {t("newOrder")}
          </ButtonLink>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label={t("colStatus")}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
        >
          {tabs.map((s) => {
            const count =
              s === "all"
                ? orders.length
                : orders.filter((o) => o.status === s).length
            return (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-[120ms]",
                  status === s
                    ? "border-oms bg-oms-soft text-oms-on-soft"
                    : "border-line bg-surface text-content-secondary hover:bg-hover hover:text-content"
                )}
              >
                {s === "all" ? t("filterAll") : t(orderStatusMeta[s].label)}
                <span className="tabular text-xs">{count}</span>
              </button>
            )
          })}
        </div>
        <SearchInput
          id="order-search"
          label={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="lg:w-[280px]"
        />
      </div>

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t("emptyOrdersTitle")}
            body={t("emptyOrdersBody")}
            action={
              <ButtonLink href="/orders/new" variant="primary" icon={Plus}>
                {t("newOrder")}
              </ButtonLink>
            }
          />
        ) : (
          <>
            <table className="hidden w-full text-left text-sm lg:table">
              <thead className="border-b border-line bg-raised text-xs text-content-secondary">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">
                    {t("colOrder")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("colCustomer")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("colChannel")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("colPayment")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    {t("colStatus")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right font-medium">
                    {t("colTotal")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const c = getCustomer(o.customerId)
                  return (
                    <tr
                      key={o.id}
                      className="group relative border-b border-line last:border-0 hover:bg-raised"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/orders/${o.id}`}
                          className="tabular font-semibold after:absolute after:inset-0 group-hover:text-oms"
                        >
                          {o.id}
                        </Link>
                        <p className="text-xs leading-[1.5] text-content-quiet">
                          {date(o.date, true)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{c?.name}</p>
                        <p className="text-xs leading-[1.5] text-content-quiet">
                          {c?.company}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-content-secondary">
                        {t(channelLabel[o.channel])}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentChip status={o.payment} />
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusChip status={o.status} />
                      </td>
                      <td className="tabular px-6 py-3 text-right font-semibold">
                        {money(orderTotal(o))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <ul className="lg:hidden">
              {rows.map((o) => {
                const c = getCustomer(o.customerId)
                return (
                  <li key={o.id} className="border-b border-line last:border-0">
                    <Link
                      href={`/orders/${o.id}`}
                      className="flex flex-col gap-2 px-5 py-4 hover:bg-raised"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="tabular text-sm font-semibold">
                          {o.id}
                        </span>
                        <span className="tabular text-sm font-semibold">
                          {money(orderTotal(o))}
                        </span>
                      </div>
                      <p className="text-xs leading-[1.5] text-content-quiet">
                        {c?.name} · {date(o.date, true)} ·{" "}
                        {t(channelLabel[o.channel])}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <OrderStatusChip status={o.status} />
                        <PaymentChip status={o.payment} />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>
    </>
  )
}

export default function OrdersPage() {
  return (
    <React.Suspense>
      <OrdersView />
    </React.Suspense>
  )
}
