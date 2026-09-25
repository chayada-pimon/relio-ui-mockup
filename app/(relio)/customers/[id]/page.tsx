"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  ChatCircleDots,
  Coins,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Hourglass,
  ShieldCheck,
  MapPin,
  Note,
  Phone,
  PencilSimple,
  Plus,
  Receipt,
  User,
  type Icon,
} from "@phosphor-icons/react"

import { useLang, type DictKey } from "@/lib/relio/i18n"
import {
  activitiesOf,
  customerStats,
  getCustomer,
  maskEmail,
  maskPhone,
  orderTotal,
  ordersOf,
  type Activity,
} from "@/lib/relio/data"
import { customerLoyalty, orderPoints } from "@/lib/relio/loyalty"
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  OrderStatusChip,
  PaymentChip,
  SegmentChip,
  StatusChip,
  Toast,
  channelLabel,
} from "@/components/relio/ui"
import { NotFound } from "@/components/relio/not-found"
import { LogActivityDialog } from "@/components/relio/log-activity"
import { useLoggedActivities } from "@/lib/relio/activity-store"

const activityMeta: Record<Activity["kind"], { icon: Icon; label: DictKey }> = {
  call: { icon: Phone, label: "actCall" },
  chat: { icon: ChatCircleDots, label: "actChat" },
  note: { icon: Note, label: "actNote" },
  order: { icon: Receipt, label: "actOrder" },
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, money, date } = useLang()
  const [revealed, setRevealed] = React.useState(false)
  const [logOpen, setLogOpen] = React.useState(false)
  const [logged, setLogged] = React.useState(false)
  const closeToast = React.useCallback(() => setLogged(false), [])
  const extra = useLoggedActivities()
  const customer = getCustomer(id)

  if (!customer)
    return <NotFound backHref="/customers" backLabel={t("backToCustomers")} />

  const stats = customerStats(customer.id)
  const loyalty = customerLoyalty(customer.id)
  const progress = loyalty.next
    ? Math.min(loyalty.spend12m / loyalty.next.minSpend, 1)
    : 1
  const list = ordersOf(customer.id).sort((a, b) =>
    b.date.localeCompare(a.date)
  )
  const timeline = [
    ...activitiesOf(customer.id),
    ...extra.filter((a) => a.customerId === customer.id),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const contact: { icon: Icon; label: DictKey; value: string }[] = [
    {
      icon: Phone,
      label: "phone",
      value: revealed ? customer.phone : maskPhone(customer.phone),
    },
    {
      icon: EnvelopeSimple,
      label: "email",
      value: revealed ? customer.email : maskEmail(customer.email),
    },
    { icon: MapPin, label: "city", value: customer.city },
    { icon: User, label: "owner", value: customer.owner },
  ]

  return (
    <>
      <Link
        href="/customers"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-content-secondary hover:text-content"
      >
        <ArrowLeft size={18} aria-hidden />
        {t("backToCustomers")}
      </Link>

      <header className="mb-8 flex flex-wrap items-center gap-5">
        <Avatar name={customer.name} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] leading-[1.25] font-semibold md:text-4xl md:leading-[1.2]">
              {customer.name}
            </h1>
            <SegmentChip segment={customer.segment} />
          </div>
          <p className="mt-1 text-base text-content-secondary">
            {customer.company} ·{" "}
            <span className="tabular text-content-quiet">{customer.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button icon={ChatCircleDots} onClick={() => setLogOpen(true)}>
            {t("logActivity")}
          </Button>
          <ButtonLink
            href={`/orders/new?customer=${customer.id}`}
            variant="primary"
            icon={Plus}
          >
            {t("createOrderFor")}
          </ButtonLink>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              title={t("contactInfo")}
              action={
                <ButtonLink
                  href={`/customers/${customer.id}/edit`}
                  variant="tertiary"
                  icon={PencilSimple}
                  className="-mt-2 -mr-3"
                >
                  {t("editCustomer")}
                </ButtonLink>
              }
            />
            <dl className="flex flex-col gap-4">
              {contact.map((row) => {
                const IconCmp = row.icon
                return (
                  <div key={row.label} className="flex gap-3">
                    <IconCmp
                      size={20}
                      aria-hidden
                      className="mt-0.5 shrink-0 text-content-quiet"
                    />
                    <div className="min-w-0">
                      <dt className="text-xs leading-[1.5] text-content-quiet">
                        {t(row.label)}
                      </dt>
                      <dd className="tabular text-sm break-words">
                        {row.value}
                      </dd>
                    </div>
                  </div>
                )
              })}
            </dl>
            <div className="mt-4 border-t border-line pt-3">
              <Button
                variant="tertiary"
                icon={revealed ? EyeSlash : Eye}
                aria-pressed={revealed}
                onClick={() => setRevealed((v) => !v)}
                className="-ml-3"
              >
                {revealed ? t("hideFull") : t("showFull")}
              </Button>
              <p className="text-xs leading-[1.5] text-content-quiet">
                {t("viewLogged")}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("loyaltyCard")} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-crm-soft px-2.5 text-xs font-semibold text-crm-on-soft">
                {loyalty.tier.label}
              </span>
              <span className="text-sm text-content-secondary">
                {t("tierRate").replace("{rate}", String(loyalty.tier.rate))}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs leading-[1.5] text-content-quiet">
                  <Coins size={16} aria-hidden />
                  {t("pointsAvailable")}
                </p>
                <p className="tabular text-2xl leading-[1.25] font-semibold">
                  {loyalty.available.toLocaleString("th-TH")}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs leading-[1.5] text-content-quiet">
                  <Hourglass size={16} aria-hidden />
                  {t("pointsPending")}
                </p>
                <p className="tabular text-2xl leading-[1.25] font-semibold">
                  {loyalty.pending.toLocaleString("th-TH")}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between gap-3 text-xs text-content-secondary">
                <span>{t("spend12m")}</span>
                <span className="tabular font-medium text-content">
                  {money(loyalty.spend12m)}
                  {loyalty.next && (
                    <span className="text-content-quiet">
                      {" "}
                      / {money(loyalty.next.minSpend)}
                    </span>
                  )}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                aria-label={t("spend12m")}
                className="h-2 overflow-hidden rounded-full bg-raised"
              >
                <div
                  className="h-full rounded-full bg-crm-graphic"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs leading-[1.5] text-content-secondary">
                {loyalty.next
                  ? t("toNextTier")
                      .replace(
                        "{amount}",
                        money(loyalty.next.minSpend - loyalty.spend12m)
                      )
                      .replace("{tier}", loyalty.next.label)
                  : t("topTier")}
              </p>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-xs leading-[1.5] text-content-quiet">
              {t("pointsShareNote")}
            </p>
          </Card>

          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-sm leading-[1.4] font-medium">
              <ShieldCheck size={18} aria-hidden />
              {t("pdpa")}
            </h2>
            <p className="text-sm leading-[1.6] text-content-secondary">
              {customer.consentAt
                ? t("consentGiven").replace("{date}", date(customer.consentAt))
                : t("consentNone")}
            </p>
            <Button variant="tertiary" className="mt-2 -ml-3">
              {t("requestDelete")}
            </Button>
          </Card>

          <Card className="bg-raised">
            <h2 className="mb-2 flex items-center gap-2 text-sm leading-[1.4] font-medium">
              <Note size={18} aria-hidden />
              {t("note")}
            </h2>
            <p className="text-sm leading-[1.6] text-content-secondary">
              {customer.note || t("noNote")}
            </p>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              { label: t("totalSpent"), value: money(stats.spent) },
              { label: t("totalOrders"), value: String(stats.orders) },
              {
                label: t("avgOrder"),
                value: money(stats.orders ? stats.spent / stats.orders : 0),
              },
            ].map((s) => (
              <Card key={s.label} className="p-5">
                <p className="text-sm leading-[1.4] font-medium text-content-secondary">
                  {s.label}
                </p>
                <p className="tabular mt-2 text-2xl leading-[1.25] font-semibold">
                  {s.value}
                </p>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader title={t("customerOrders")} />
            {list.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={t("noOrdersTitle")}
                body={t("noOrdersBody")}
                action={
                  <ButtonLink
                    href={`/orders/new?customer=${customer.id}`}
                    variant="primary"
                    icon={Plus}
                  >
                    {t("createOrderFor")}
                  </ButtonLink>
                }
              />
            ) : (
              <ul className="-mx-3 flex flex-col">
                {list.map((o) => {
                  const pts = orderPoints(o, loyalty.tier.tier)
                  return (
                    <li key={o.id}>
                      <Link
                        href={`/orders/${o.id}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md px-3 py-3 hover:bg-raised"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="tabular text-sm leading-[1.4] font-semibold">
                            {o.id}
                          </p>
                          <p className="text-xs leading-[1.5] text-content-quiet">
                            {date(o.date)} ·{" "}
                            {o.store ?? t(channelLabel[o.channel])} ·{" "}
                            {o.items.length} {t("items")}
                          </p>
                        </div>
                        <PaymentChip status={o.payment} />
                        <OrderStatusChip status={o.status} />
                        <div className="w-28 text-right">
                          <p className="tabular text-sm font-semibold">
                            {money(orderTotal(o))}
                          </p>
                          {pts.state === "available" && (
                            <p className="tabular text-xs font-medium text-crm">
                              +{pts.points} {t("pointsUnit")}
                            </p>
                          )}
                          {pts.state === "pending" && (
                            <StatusChip tone="warning" icon={Hourglass}>
                              {pts.points} · {t("ptsPending")}
                            </StatusChip>
                          )}
                          {pts.state === "none" && o.status !== "cancelled" && (
                            <p className="text-xs text-content-quiet">
                              {t("ptsNone")}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={t("timeline")} />
            {timeline.length === 0 ? (
              <p className="text-sm text-content-secondary">
                {t("noActivity")}
              </p>
            ) : (
              <ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-[17px] before:w-px before:bg-line">
                {timeline.map((a) => {
                  const meta = activityMeta[a.kind]
                  const IconCmp = meta.icon
                  const isOrder = a.kind === "order"
                  return (
                    <li key={a.id} className="relative flex gap-4">
                      <span
                        className={
                          isOrder
                            ? "z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-oms-soft text-oms-on-soft"
                            : "z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-crm-soft text-crm-on-soft"
                        }
                      >
                        <IconCmp size={18} aria-hidden />
                      </span>
                      <div className="min-w-0 pt-1">
                        <p className="text-sm leading-[1.55]">
                          <span className="font-medium">{t(meta.label)}</span> ·{" "}
                          {a.text}
                          {a.orderId && (
                            <>
                              {" "}
                              <Link
                                href={`/orders/${a.orderId}`}
                                className="tabular font-medium text-oms hover:underline"
                              >
                                {a.orderId}
                              </Link>
                            </>
                          )}
                        </p>
                        <p className="text-xs leading-[1.5] text-content-quiet">
                          {date(a.date, true)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <LogActivityDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        customerId={customer.id}
        onLogged={() => setLogged(true)}
      />
      {logged && (
        <Toast
          title={t("activityLogged")}
          body={t("activityLoggedBody")}
          onClose={closeToast}
        />
      )}
    </>
  )
}
