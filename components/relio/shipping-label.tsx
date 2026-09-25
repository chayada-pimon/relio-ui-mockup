"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Dialog } from "@base-ui/react/dialog"
import { Printer, X } from "@phosphor-icons/react"

import { useLang } from "@/lib/relio/i18n"
import { orderTotal, type Customer, type Order } from "@/lib/relio/data"
import {
  Button,
  Field,
  IconButton,
  Select,
  channelLabel,
} from "@/components/relio/ui"

/* -------------------------------------------------------------- Carriers */

export const carriers = [
  { id: "kerry", name: "Kerry Express" },
  { id: "flash", name: "Flash Express" },
  { id: "jt", name: "J&T Express" },
  { id: "thaipost", name: "Thailand Post EMS" },
] as const

export type CarrierId = (typeof carriers)[number]["id"]

export type ShipmentLabel = { carrier: CarrierId; tracking: string }

export const carrierName = (id: CarrierId) =>
  carriers.find((c) => c.id === id)!.name

/** Stable pseudo-random digits so the same order + carrier keeps its number. */
function digits(seed: string, length: number) {
  let h = 2166136261
  let out = ""
  while (out.length < length) {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    out += String((h >>> 0) % 1e6).padStart(6, "0")
    seed += out
  }
  return out.slice(0, length)
}

/** UPU S10 check digit, used by Thailand Post (e.g. EX123456785TH). */
function s10Check(serial: string) {
  const w = [8, 6, 4, 2, 3, 5, 9, 7]
  const sum = [...serial].reduce((s, d, i) => s + Number(d) * w[i], 0)
  const c = 11 - (sum % 11)
  return c === 10 ? 0 : c === 11 ? 5 : c
}

export function makeTracking(orderId: string, carrier: CarrierId) {
  const seed = `${orderId}:${carrier}`
  switch (carrier) {
    case "kerry":
      return `KEX${digits(seed, 10)}`
    case "flash":
      return `TH01${digits(seed, 10)}`
    case "jt":
      return `JT${digits(seed, 12)}`
    case "thaipost": {
      const serial = digits(seed, 8)
      return `EX${serial}${s10Check(serial)}TH`
    }
  }
}

/* ------------------------------------------------------ Code 128 barcode */

// Bar/space widths for symbol values 0–106 (106 = stop).
const CODE128 =
  "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112".split(
    " "
  )

/** Encodes printable ASCII with code set B. */
function code128B(text: string) {
  const values = [104, ...[...text].map((ch) => ch.charCodeAt(0) - 32)]
  const check =
    values.reduce((s, v, i) => s + v * (i === 0 ? 1 : i), 0) % 103
  return [...values, check, 106].map((v) => CODE128[v]).join("")
}

function Barcode({ value }: { value: string }) {
  const quiet = 10
  const bars: React.ReactNode[] = []
  let x = quiet
  ;[...code128B(value)].forEach((w, i) => {
    const width = Number(w)
    if (i % 2 === 0)
      bars.push(<rect key={i} x={x} y={0} width={width} height={1} />)
    x += width
  })
  return (
    <svg
      className="ship-barcode"
      viewBox={`0 0 ${x + quiet} 1`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      role="img"
      aria-label={value}
    >
      {bars}
    </svg>
  )
}

/* ------------------------------------------------------------- Label */

/** A 100 × 150 mm shipping label, styled by `.ship-label` in globals.css. */
function Label({
  order,
  customer,
  shipment,
}: {
  order: Order
  customer?: Customer
  shipment: ShipmentLabel
}) {
  const { t, date, money } = useLang()
  const qty = order.items.reduce((s, i) => s + i.qty, 0)
  const cod = order.payment === "unpaid"

  return (
    <div className="ship-label">
      <div className="ship-row ship-head">
        <span className="ship-carrier">{carrierName(shipment.carrier)}</span>
        <span className="ship-strong">{order.id}</span>
      </div>

      <div className="ship-track">
        <Barcode value={shipment.tracking} />
        <p className="ship-track-no">{shipment.tracking}</p>
      </div>

      <div className={cod ? "ship-cod" : "ship-paid"}>
        {cod ? (
          <>
            <span>{t("labelCod")}</span>
            <span className="ship-cod-amount">{money(orderTotal(order))}</span>
          </>
        ) : (
          <span>{t("labelPaid")}</span>
        )}
      </div>

      <div className="ship-block ship-to">
        <p className="ship-cap">{t("labelTo")}</p>
        <p className="ship-name">{customer?.name ?? "-"}</p>
        {customer && <p className="ship-strong">{customer.phone}</p>}
        <p>{order.address}</p>
      </div>

      <div className="ship-block">
        <p className="ship-cap">{t("labelFrom")}</p>
        <p className="ship-strong">
          RELIO · {order.store ?? t(channelLabel[order.channel])}
        </p>
      </div>

      <div className="ship-block ship-items">
        <p className="ship-cap">
          {t("labelItems")} · {qty}
        </p>
        <ul>
          {order.items.map((i) => (
            <li key={i.sku}>
              {i.sku} · {i.name} × {i.qty}
            </li>
          ))}
        </ul>
      </div>

      <div className="ship-row ship-foot">
        <span>{date(order.date)}</span>
        <span>{t("labelPrinted")}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Dialog */

/**
 * Pick a carrier, preview the label at actual size and print it. The same
 * label is portaled into `.print-root`, the only thing visible when printing.
 */
export function ShippingLabelDialog({
  open,
  onOpenChange,
  order,
  customer,
  current,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order
  customer?: Customer
  /** The label already created for this order, if any. */
  current?: ShipmentLabel | null
  onCreated: (label: ShipmentLabel) => void
}) {
  const { t } = useLang()
  const [carrier, setCarrier] = React.useState<CarrierId>(
    current?.carrier ?? "kerry"
  )
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const shipment: ShipmentLabel = {
    carrier,
    tracking: makeTracking(order.id, carrier),
  }

  function print() {
    onCreated(shipment)
    // Let the print-root render the chosen carrier before the print dialog.
    window.requestAnimationFrame(() => {
      window.print()
      onOpenChange(false)
    })
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-line bg-surface text-content shadow-xl transition-[opacity,transform] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
            <div className="flex items-center justify-between border-b border-line py-2 pr-2 pl-6">
              <Dialog.Title className="text-lg leading-[1.4] font-semibold">
                {t("labelCreate")}
              </Dialog.Title>
              <Dialog.Close render={<IconButton icon={X} label={t("cancel")} />} />
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t("labelCarrier")} htmlFor="label-carrier">
                  <Select
                    id="label-carrier"
                    value={carrier}
                    onValueChange={(v) => setCarrier(v as CarrierId)}
                    options={carriers.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm leading-[1.4] font-medium">
                    {t("labelTracking")}
                  </span>
                  <span className="tabular flex min-h-11 items-center rounded-sm bg-raised px-3 text-sm font-medium select-all">
                    {shipment.tracking}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-md bg-raised p-4">
                <div className="overflow-hidden rounded-sm shadow-[0_2px_8px_rgb(0_0_0/0.15)]">
                  <Label order={order} customer={customer} shipment={shipment} />
                </div>
                <p className="text-center text-xs text-content-quiet">
                  {t("labelPreview")}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
              <Dialog.Close render={<Button>{t("cancel")}</Button>} />
              <Button variant="primary" icon={Printer} onClick={print}>
                {t("printLabel")}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {mounted &&
        createPortal(
          <div className="print-root" aria-hidden>
            <Label order={order} customer={customer} shipment={shipment} />
          </div>,
          document.body
        )}
    </>
  )
}
