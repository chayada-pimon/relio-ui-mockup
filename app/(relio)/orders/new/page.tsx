"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle,
  FloppyDisk,
  Minus,
  Plus,
  Trash,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang } from "@/lib/relio/i18n"
import {
  customers,
  getCustomer,
  ordersOf,
  products,
  type Channel,
  type OrderItem,
  maskEmail,
  maskPhone,
} from "@/lib/relio/data"
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  PageHeader,
  SegmentChip,
  channelLabel,
  Select,
  inputClass,
} from "@/components/relio/ui"

const channels: Channel[] = ["line", "website", "shopee", "phone"]
const SHIPPING = 50

type Errors = Partial<Record<"customer" | "items" | "address", boolean>>

function lastAddress(customerId: string) {
  return (
    ordersOf(customerId).sort((a, b) => b.date.localeCompare(a.date))[0]
      ?.address ?? ""
  )
}

function NewOrderForm() {
  const { t, money } = useLang()
  const params = useSearchParams()
  const preset = params.get("customer") ?? ""

  const [customerId, setCustomerId] = React.useState(
    getCustomer(preset) ? preset : ""
  )
  const [items, setItems] = React.useState<OrderItem[]>([])
  const [pick, setPick] = React.useState(products[0].sku)
  const [channel, setChannel] = React.useState<Channel>("line")
  const [address, setAddress] = React.useState(
    getCustomer(preset) ? lastAddress(preset) : ""
  )
  const [errors, setErrors] = React.useState<Errors>({})
  const [saving, setSaving] = React.useState(false)
  const [savedId, setSavedId] = React.useState<string | null>(null)

  const customer = getCustomer(customerId)
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  const shipping = items.length ? SHIPPING : 0

  function chooseCustomer(id: string) {
    setCustomerId(id)
    setAddress(lastAddress(id))
    setErrors((e) => ({ ...e, customer: false, address: false }))
  }

  function addItem() {
    const product = products.find((p) => p.sku === pick)
    if (!product) return
    setItems((list) =>
      list.some((i) => i.sku === pick)
        ? list.map((i) => (i.sku === pick ? { ...i, qty: i.qty + 1 } : i))
        : [...list, { ...product, qty: 1 }]
    )
    setErrors((e) => ({ ...e, items: false }))
  }

  function changeQty(sku: string, delta: number) {
    setItems((list) =>
      list.map((i) =>
        i.sku === sku ? { ...i, qty: Math.max(1, i.qty + delta) } : i
      )
    )
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const next: Errors = {
      customer: !customer,
      items: items.length === 0,
      address: !address.trim(),
    }
    setErrors(next)
    if (next.customer || next.items || next.address) {
      const first = next.customer
        ? "customer"
        : next.items
          ? "product"
          : "address"
      document.getElementById(first)?.focus()
      return
    }
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      setSavedId("SO-2609-0149")
    }, 900)
  }

  if (savedId) {
    return (
      <Card className="mx-auto max-w-[560px]">
        <div
          role="status"
          className="flex flex-col items-center gap-3 py-8 text-center"
        >
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle size={32} weight="fill" aria-hidden />
          </span>
          <h1 className="text-[28px] leading-[1.3] font-semibold">
            {t("orderSaved")}
          </h1>
          <p className="tabular text-base text-content-secondary">
            {savedId} · {customer?.name} · {money(subtotal + shipping)}
          </p>
          <p className="text-sm text-content-secondary">
            {t("orderSavedBody")}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                setSavedId(null)
                setItems([])
              }}
            >
              {t("createAnother")}
            </Button>
            <ButtonLink href="/orders" variant="primary">
              {t("viewOrder")}
            </ButtonLink>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title={t("newOrderTitle")}
        description={t("newOrderSub")}
        back={
          <Link
            href="/orders"
            className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-content-secondary hover:text-content"
          >
            <ArrowLeft size={18} aria-hidden />
            {t("backToOrders")}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 1. Customer */}
          <Card>
            <CardHeader title={`1. ${t("stepCustomer")}`} />
            <Field
              label={t("selectCustomer")}
              htmlFor="customer"
              error={errors.customer ? t("customerRequired") : undefined}
            >
              <Select
                id="customer"
                value={customerId}
                onValueChange={chooseCustomer}
                placeholder={t("selectCustomerPlaceholder")}
                invalid={errors.customer}
                describedBy={errors.customer ? "customer-msg" : undefined}
                options={customers.map((c) => ({
                  value: c.id,
                  label: c.name,
                  description: c.company,
                }))}
              />
            </Field>
            {customer && (
              <div className="mt-4 flex items-center gap-3 rounded-md bg-raised p-3">
                <Avatar name={customer.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {customer.name}
                  </p>
                  <p className="tabular truncate text-xs text-content-quiet">
                    {maskPhone(customer.phone)} · {maskEmail(customer.email)}
                  </p>
                </div>
                <SegmentChip segment={customer.segment} />
              </div>
            )}
          </Card>

          {/* 2. Items */}
          <Card>
            <CardHeader title={`2. ${t("stepItems")}`} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field
                  label={t("colItem")}
                  htmlFor="product"
                  error={errors.items ? t("itemsRequired") : undefined}
                >
                  <Select
                    id="product"
                    value={pick}
                    onValueChange={setPick}
                    invalid={errors.items}
                    describedBy={errors.items ? "product-msg" : undefined}
                    options={products.map((p) => ({
                      value: p.sku,
                      label: p.name,
                      description: p.sku,
                      meta: money(p.price),
                    }))}
                  />
                </Field>
              </div>
              <Button
                icon={Plus}
                onClick={addItem}
                className={cn(errors.items && "sm:mb-[30px]")}
              >
                {t("addItem")}
              </Button>
            </div>

            {items.length > 0 && (
              <ul className="mt-5 flex flex-col divide-y divide-line border-t border-line">
                {items.map((item) => (
                  <li
                    key={item.sku}
                    className="flex flex-wrap items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="tabular text-xs text-content-quiet">
                        {item.sku} · {money(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center rounded-md border border-line">
                      <button
                        type="button"
                        aria-label={`${t("decrease")} ${item.name}`}
                        onClick={() => changeQty(item.sku, -1)}
                        disabled={item.qty <= 1}
                        className="inline-flex size-11 items-center justify-center text-content-secondary hover:bg-hover disabled:text-content-disabled"
                      >
                        <Minus size={16} aria-hidden />
                      </button>
                      <span
                        aria-live="polite"
                        className="tabular w-10 text-center text-sm font-semibold"
                      >
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        aria-label={`${t("increase")} ${item.name}`}
                        onClick={() => changeQty(item.sku, 1)}
                        className="inline-flex size-11 items-center justify-center text-content-secondary hover:bg-hover"
                      >
                        <Plus size={16} aria-hidden />
                      </button>
                    </div>
                    <span className="tabular w-24 text-right text-sm font-semibold">
                      {money(item.qty * item.price)}
                    </span>
                    <button
                      type="button"
                      aria-label={`${t("removeItem")} ${item.name}`}
                      onClick={() =>
                        setItems((l) => l.filter((i) => i.sku !== item.sku))
                      }
                      className="inline-flex size-11 items-center justify-center rounded-md text-content-quiet hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash size={18} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 3. Delivery */}
          <Card>
            <CardHeader title={`3. ${t("stepDelivery")}`} />
            <fieldset className="mb-5">
              <legend className="mb-1.5 text-sm leading-[1.4] font-medium">
                {t("channel")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {channels.map((c) => (
                  <label
                    key={c}
                    className={cn(
                      "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors duration-[120ms] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]",
                      channel === c
                        ? "border-oms bg-oms-soft text-oms-on-soft"
                        : "border-line bg-surface text-content-secondary hover:bg-hover"
                    )}
                  >
                    <input
                      type="radio"
                      name="channel"
                      value={c}
                      checked={channel === c}
                      onChange={() => setChannel(c)}
                      className="sr-only"
                    />
                    {t(channelLabel[c])}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field
              label={t("address")}
              htmlFor="address"
              hint={t("addressHint")}
              error={errors.address ? t("addressRequired") : undefined}
            >
              <textarea
                id="address"
                rows={3}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setErrors((er) => ({ ...er, address: false }))
                }}
                aria-invalid={errors.address || undefined}
                aria-describedby="address-msg"
                className={cn(inputClass, "py-2.5 leading-[1.6]")}
              />
            </Field>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card className="lg:sticky lg:top-[96px]">
            <CardHeader title={t("summary")} />
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-content-secondary">{t("stepCustomer")}</dt>
                <dd className="truncate text-right">{customer?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-content-secondary">
                  {t("subtotal")} ({items.reduce((s, i) => s + i.qty, 0)})
                </dt>
                <dd className="tabular">{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-content-secondary">{t("shipping")}</dt>
                <dd className="tabular">{money(shipping)}</dd>
              </div>
              <div className="mt-1 flex justify-between border-t border-line pt-3 text-base font-semibold">
                <dt>{t("grandTotal")}</dt>
                <dd className="tabular text-xl">
                  {money(subtotal + shipping)}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="submit"
                variant="primary"
                icon={FloppyDisk}
                loading={saving}
                className="w-full"
              >
                {t("saveOrder")}
              </Button>
              <ButtonLink href="/orders" variant="tertiary" className="w-full">
                {t("cancel")}
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </form>
  )
}

export default function NewOrderPage() {
  return (
    <React.Suspense>
      <NewOrderForm />
    </React.Suspense>
  )
}
