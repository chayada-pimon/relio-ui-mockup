"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Printer,
  Truck,
  XCircle,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang, type DictKey } from "@/lib/relio/i18n"
import {
  getCustomer,
  getOrder,
  orderFlow,
  orderSubtotal,
  orderTotal,
  type OrderStatus,
  maskPhone,
} from "@/lib/relio/data"
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  OrderStatusChip,
  PaymentChip,
  SegmentChip,
  Toast,
  channelLabel,
  orderStatusMeta,
} from "@/components/relio/ui"
import { NotFound } from "@/components/relio/not-found"
import {
  ShippingLabelDialog,
  carrierName,
  type ShipmentLabel,
} from "@/components/relio/shipping-label"

const advanceLabel: Partial<Record<OrderStatus, DictKey>> = {
  pending: "advancePending",
  confirmed: "advanceConfirmed",
  packing: "advancePacking",
  shipped: "advanceShipped",
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, money, date } = useLang()
  const order = getOrder(id)
  const [status, setStatus] = React.useState<OrderStatus>(
    order?.status ?? "pending"
  )
  const [saving, setSaving] = React.useState(false)
  const [toast, setToast] = React.useState(false)
  const [labelOpen, setLabelOpen] = React.useState(false)
  const [shipment, setShipment] = React.useState<ShipmentLabel | null>(null)
  const [labelToast, setLabelToast] = React.useState(false)
  const closeToast = React.useCallback(() => setToast(false), [])
  const closeLabelToast = React.useCallback(() => setLabelToast(false), [])

  if (!order)
    return <NotFound backHref="/orders" backLabel={t("backToOrders")} />

  const customer = getCustomer(order.customerId)
  const stepIndex = orderFlow.indexOf(status)
  const next = advanceLabel[status]

  function advance() {
    setSaving(true)
    window.setTimeout(() => {
      setStatus(orderFlow[stepIndex + 1])
      setSaving(false)
      setToast(true)
    }, 700)
  }

  return (
    <>
      <Link
        href="/orders"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-content-secondary hover:text-content"
      >
        <ArrowLeft size={18} aria-hidden />
        {t("backToOrders")}
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="tabular text-[28px] leading-[1.25] font-semibold md:text-4xl md:leading-[1.2]">
              {order.id}
            </h1>
            <OrderStatusChip status={status} />
            <PaymentChip status={order.payment} />
          </div>
          <p className="mt-1 text-base text-content-secondary">
            {date(order.date, true)} · {t(channelLabel[order.channel])}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {status !== "cancelled" && status !== "delivered" && (
            <Button
              variant="danger"
              icon={XCircle}
              onClick={() => setStatus("cancelled")}
            >
              {t("cancelOrder")}
            </Button>
          )}
          {order.channel !== "pos" && status !== "cancelled" && (
            <Button icon={Printer} onClick={() => setLabelOpen(true)}>
              {t(shipment ? "labelReprint" : "printLabel")}
            </Button>
          )}
          {next && (
            <Button
              variant="primary"
              icon={ArrowRight}
              loading={saving}
              onClick={advance}
            >
              {t(next)}
            </Button>
          )}
        </div>
      </header>

      <Card className="mb-5">
        <h2 className="sr-only">{t("progress")}</h2>
        {status === "cancelled" ? (
          <p className="flex items-center gap-2 text-sm font-medium text-danger">
            <XCircle size={20} aria-hidden />
            {t("orderCancelled")}
          </p>
        ) : (
          <ol className="grid grid-cols-5 gap-2">
            {orderFlow.map((s, i) => {
              const done = i < stepIndex || status === "delivered"
              const current = i === stepIndex && status !== "delivered"
              const IconCmp = orderStatusMeta[s].icon
              return (
                <li
                  key={s}
                  aria-current={current ? "step" : undefined}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div className="flex w-full items-center">
                    <span
                      aria-hidden
                      className={cn(
                        "h-0.5 flex-1",
                        i === 0
                          ? "invisible"
                          : done || current
                            ? "bg-oms"
                            : "bg-line"
                      )}
                    />
                    <span
                      className={cn(
                        "inline-flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
                        done && "border-oms bg-action text-on-action",
                        current && "border-oms bg-oms-soft text-oms-on-soft",
                        !done &&
                          !current &&
                          "border-line bg-surface text-content-disabled"
                      )}
                    >
                      {done ? (
                        <Check size={18} weight="bold" aria-hidden />
                      ) : (
                        <IconCmp size={18} aria-hidden />
                      )}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "h-0.5 flex-1",
                        i === orderFlow.length - 1
                          ? "invisible"
                          : done
                            ? "bg-oms"
                            : "bg-line"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs leading-[1.4] sm:text-sm",
                      current
                        ? "font-semibold text-oms"
                        : done
                          ? "text-content"
                          : "text-content-quiet"
                    )}
                  >
                    {t(orderStatusMeta[s].label)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}
        {status === "delivered" && (
          <p className="mt-4 text-center text-sm text-success">
            {t("orderClosed")}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title={t("orderItems")} />
          <div className="-mx-6 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-y border-line bg-raised text-xs text-content-secondary">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">
                    {t("colItem")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    {t("colQty")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    {t("colPrice")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right font-medium">
                    {t("colAmount")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.sku} className="border-b border-line">
                    <td className="px-6 py-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="tabular text-xs text-content-quiet">
                        {item.sku}
                      </p>
                    </td>
                    <td className="tabular px-4 py-3 text-right">{item.qty}</td>
                    <td className="tabular px-4 py-3 text-right">
                      {money(item.price)}
                    </td>
                    <td className="tabular px-6 py-3 text-right font-medium">
                      {money(item.qty * item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-4 ml-auto flex max-w-[280px] flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-content-secondary">{t("subtotal")}</dt>
              <dd className="tabular">{money(orderSubtotal(order))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-content-secondary">{t("shipping")}</dt>
              <dd className="tabular">
                {order.shipping ? money(order.shipping) : t("free")}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>{t("grandTotal")}</dt>
              <dd className="tabular">{money(orderTotal(order))}</dd>
            </div>
          </dl>
        </Card>

        <div className="flex flex-col gap-5">
          {customer && (
            <Card>
              <CardHeader title={t("orderedBy")} />
              <div className="flex items-center gap-3">
                <Avatar name={customer.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{customer.name}</p>
                  <p className="tabular truncate text-sm text-content-secondary">
                    {maskPhone(customer.phone)}
                  </p>
                </div>
                <SegmentChip segment={customer.segment} />
              </div>
              {customer.note && (
                <p className="mt-4 rounded-md bg-raised p-3 text-sm leading-[1.55] text-content-secondary">
                  {customer.note}
                </p>
              )}
              <Link
                href={`/customers/${customer.id}`}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-crm hover:underline"
              >
                {t("viewCustomer")}
                <ArrowRight size={18} aria-hidden />
              </Link>
            </Card>
          )}
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm leading-[1.4] font-medium">
              <MapPin size={18} aria-hidden />
              {t("shippingAddress")}
            </h2>
            <p className="text-sm leading-[1.6] text-content-secondary">
              {order.address}
            </p>
            {shipment && (
              <div className="mt-4 flex items-start gap-3 rounded-md bg-raised p-3 text-sm">
                <Truck
                  size={20}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-content-secondary"
                />
                <div className="min-w-0">
                  <p className="font-medium">{carrierName(shipment.carrier)}</p>
                  <p className="tabular text-content-secondary select-all">
                    {t("labelTracking")} {shipment.tracking}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ShippingLabelDialog
        open={labelOpen}
        onOpenChange={setLabelOpen}
        order={order}
        customer={customer}
        current={shipment}
        onCreated={(s) => {
          setShipment(s)
          setLabelToast(true)
        }}
      />

      {labelToast && shipment && (
        <Toast
          title={t("labelCreated")}
          body={`${carrierName(shipment.carrier)} · ${shipment.tracking}`}
          onClose={closeLabelToast}
        />
      )}

      {toast && (
        <Toast
          title={`${t("statusUpdated")}: ${t(orderStatusMeta[status].label)}`}
          body={t("statusUpdatedBody")}
          onClose={closeToast}
        />
      )}
    </>
  )
}
