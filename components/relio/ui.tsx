"use client"

import * as React from "react"
import Link from "next/link"
import { Select as BaseSelect } from "@base-ui/react/select"
import {
  CaretDown,
  Check,
  CheckCircle,
  Clock,
  Info,
  MagnifyingGlass,
  Package,
  Truck,
  WarningCircle,
  XCircle,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang, type DictKey } from "@/lib/relio/i18n"
import type {
  Channel,
  OrderStatus,
  PaymentStatus,
  Segment,
} from "@/lib/relio/data"

/* ---------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger"

const buttonBase =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm leading-[1.4] font-medium whitespace-nowrap transition-colors duration-[120ms] select-none disabled:pointer-events-none aria-disabled:pointer-events-none [&_svg]:shrink-0"

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-action text-on-action hover:bg-action-hover active:bg-action-active disabled:bg-disabled-bg disabled:text-content-disabled",
  secondary:
    "border border-control bg-surface text-content hover:bg-hover disabled:border-line disabled:text-content-disabled",
  tertiary:
    "text-content hover:bg-hover disabled:text-content-disabled",
  danger:
    "border border-line bg-surface text-danger hover:bg-danger-soft disabled:text-content-disabled",
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant
  icon?: Icon
  loading?: boolean
}

export function Button({
  variant = "secondary",
  icon: IconCmp,
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(buttonBase, buttonVariants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden
          className="size-[18px] animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        IconCmp && <IconCmp size={18} aria-hidden />
      )}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = "secondary",
  icon: IconCmp,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant
  icon?: Icon
}) {
  return (
    <Link
      className={cn(buttonBase, buttonVariants[variant], className)}
      {...props}
    >
      {IconCmp && <IconCmp size={18} aria-hidden />}
      {children}
    </Link>
  )
}

export function IconButton({
  icon: IconCmp,
  label,
  className,
  ...props
}: React.ComponentProps<"button"> & { icon: Icon; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-content-secondary transition-colors duration-[120ms] hover:bg-hover hover:text-content disabled:text-content-disabled",
        className
      )}
      {...props}
    >
      <IconCmp size={20} aria-hidden />
    </button>
  )
}

/* ------------------------------------------------------------------ Card */

export function Card({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-lg border border-line bg-surface p-6", className)}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  description,
  action,
  context,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  context?: "crm" | "oms"
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl leading-[1.4] font-semibold">{title}</h2>
          {context && <ProductBadge product={context} />}
        </div>
        {description && (
          <p className="mt-0.5 text-sm leading-[1.55] text-content-secondary">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

/* --------------------------------------------------------- Page header */

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  back?: React.ReactNode
}) {
  return (
    <header className="mb-8">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-[1.25] font-semibold md:text-4xl md:leading-[1.2]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-[66ch] text-base leading-[1.6] text-content-secondary">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  )
}

/* --------------------------------------------------------- Chips/badges */

export function ProductBadge({ product }: { product: "crm" | "oms" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium",
        product === "crm"
          ? "bg-crm-soft text-crm-on-soft"
          : "bg-oms-soft text-oms-on-soft"
      )}
    >
      {product.toUpperCase()}
    </span>
  )
}

type Tone = "success" | "warning" | "danger" | "info" | "neutral"

const toneClass: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-raised text-content-secondary",
}

export function StatusChip({
  tone,
  icon: IconCmp,
  children,
}: {
  tone: Tone
  icon?: Icon
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs leading-none font-medium whitespace-nowrap",
        toneClass[tone]
      )}
    >
      {IconCmp && <IconCmp size={14} weight="bold" aria-hidden />}
      {children}
    </span>
  )
}

export const orderStatusMeta: Record<
  OrderStatus,
  { tone: Tone; icon: Icon; label: DictKey }
> = {
  pending: { tone: "warning", icon: Clock, label: "stPending" },
  confirmed: { tone: "info", icon: CheckCircle, label: "stConfirmed" },
  packing: { tone: "info", icon: Package, label: "stPacking" },
  shipped: { tone: "info", icon: Truck, label: "stShipped" },
  delivered: { tone: "success", icon: CheckCircle, label: "stDelivered" },
  cancelled: { tone: "danger", icon: XCircle, label: "stCancelled" },
}

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  const { t } = useLang()
  const meta = orderStatusMeta[status]
  return (
    <StatusChip tone={meta.tone} icon={meta.icon}>
      {t(meta.label)}
    </StatusChip>
  )
}

const paymentMeta: Record<
  PaymentStatus,
  { tone: Tone; icon: Icon; label: DictKey }
> = {
  paid: { tone: "success", icon: CheckCircle, label: "payPaid" },
  unpaid: { tone: "warning", icon: WarningCircle, label: "payUnpaid" },
  refunded: { tone: "neutral", icon: Info, label: "payRefunded" },
}

export function PaymentChip({ status }: { status: PaymentStatus }) {
  const { t } = useLang()
  const meta = paymentMeta[status]
  return (
    <StatusChip tone={meta.tone} icon={meta.icon}>
      {t(meta.label)}
    </StatusChip>
  )
}

const segmentLabel: Record<Segment, DictKey> = {
  vip: "segVip",
  regular: "segRegular",
  new: "segNew",
}

export function SegmentChip({ segment }: { segment: Segment }) {
  const { t } = useLang()
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs leading-none font-medium whitespace-nowrap",
        segment === "vip"
          ? "bg-crm-soft text-crm-on-soft"
          : segment === "new"
            ? "border border-line text-content-secondary"
            : "bg-raised text-content-secondary"
      )}
    >
      {segment === "vip" && (
        <span aria-hidden className="size-1.5 rounded-full bg-warm" />
      )}
      {t(segmentLabel[segment])}
    </span>
  )
}

export const channelLabel: Record<Channel, DictKey> = {
  line: "chLine",
  website: "chWebsite",
  shopee: "chShopee",
  phone: "chPhone",
}

/* ---------------------------------------------------------------- Avatar */

export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-crm-soft font-semibold text-crm-on-soft",
        className
      )}
    >
      {initials}
    </span>
  )
}

/* ---------------------------------------------------------------- Field */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm leading-[1.4] font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-msg`}
          className="flex items-center gap-1.5 text-sm leading-[1.55] text-danger"
        >
          <WarningCircle size={16} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${htmlFor}-msg`}
          className="text-sm leading-[1.55] text-content-quiet"
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const inputClass =
  "min-h-11 w-full rounded-sm border border-line bg-surface px-3 text-base leading-loose text-content placeholder:text-content-quiet transition-colors duration-[120ms] hover:border-control focus-visible:border-action focus-visible:outline-2 focus-visible:outline-offset-2 aria-invalid:border-danger md:text-sm"

export const selectClass = cn(
  inputClass,
  "appearance-none bg-[image:var(--select-chevron)] bg-[length:16px] bg-[position:right_12px_center] bg-no-repeat pr-10"
)

/* ---------------------------------------------------------------- Select */

export type SelectOption = {
  value: string
  label: string
  /** Secondary line under the label, e.g. SKU or company. */
  description?: string
  /** Right-aligned value, e.g. price. */
  meta?: string
}

/**
 * Styled replacement for a native `<select>`. The `id` goes on the trigger
 * button so `<Field htmlFor>` still labels it.
 */
export function Select({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  invalid,
  describedBy,
  className,
}: {
  id: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  invalid?: boolean
  describedBy?: string
  className?: string
}) {
  const items = React.useMemo(
    () => options.map((o) => ({ value: o.value, label: o.label })),
    [options]
  )
  const current = options.find((o) => o.value === value)

  return (
    <BaseSelect.Root
      items={items}
      value={value || null}
      onValueChange={(v) => v != null && onValueChange(v as string)}
    >
      <BaseSelect.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          inputClass,
          "flex cursor-pointer items-center justify-between gap-3 text-left data-[popup-open]:border-action",
          className
        )}
      >
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2",
            !current && "text-content-quiet"
          )}
        >
          <span className="truncate">{current?.label ?? placeholder}</span>
          {current?.meta && (
            <span className="tabular ml-auto shrink-0 text-content-secondary">
              {current.meta}
            </span>
          )}
        </span>
        <BaseSelect.Icon className="flex shrink-0 text-content-quiet transition-transform duration-[120ms] [[data-popup-open]_&]:rotate-180">
          <CaretDown size={16} aria-hidden />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <BaseSelect.Popup className="max-h-[min(360px,var(--available-height))] w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto rounded-md border border-line bg-surface p-1.5 text-content shadow-[0_12px_32px_-8px_rgb(16_24_40/0.18),0_2px_6px_-2px_rgb(16_24_40/0.08)] transition-[opacity,transform] duration-[120ms] outline-none data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
            <BaseSelect.List>
              {options.map((o) => (
                <BaseSelect.Item
                  key={o.value}
                  value={o.value}
                  className="group flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 py-2 outline-none select-none data-[highlighted]:bg-hover data-[selected]:bg-selection"
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <BaseSelect.ItemIndicator>
                      <Check size={16} weight="bold" className="text-action" aria-hidden />
                    </BaseSelect.ItemIndicator>
                  </span>
                  <span className="min-w-0 flex-1">
                    <BaseSelect.ItemText className="block truncate text-sm leading-[1.5] group-data-[selected]:font-semibold">
                      {o.label}
                    </BaseSelect.ItemText>
                    {o.description && (
                      <span className="tabular block truncate text-xs leading-[1.5] text-content-quiet">
                        {o.description}
                      </span>
                    )}
                  </span>
                  {o.meta && (
                    <span className="tabular shrink-0 text-sm font-medium text-content-secondary">
                      {o.meta}
                    </span>
                  )}
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}

/* ---------------------------------------------------------- Search input */

/**
 * Chrome forces `line-height: initial !important` on `::placeholder`, which
 * clips Thai below-vowels (ุ ู) in Bai Jamjuree. The native placeholder stays
 * for assistive tech but is transparent; a sibling span with a controllable
 * line-height renders the visible text while the field is empty.
 */
export function SearchInput({
  id,
  label,
  placeholder,
  className,
  inputClassName,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "id" | "placeholder"> & {
  id: string
  label: string
  placeholder: string
  inputClassName?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <MagnifyingGlass
        size={20}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-quiet"
      />
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        className={cn(inputClass, "peer pl-10 placeholder:text-transparent", inputClassName)}
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 left-10 hidden -translate-y-1/2 truncate text-base leading-loose text-content-quiet peer-placeholder-shown:block md:text-sm"
      >
        {placeholder}
      </span>
    </div>
  )
}

/* ----------------------------------------------------------- Empty state */

export function EmptyState({
  icon: IconCmp,
  title,
  body,
  action,
}: {
  icon: Icon
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="mb-1 inline-flex size-16 items-center justify-center rounded-lg bg-raised text-content-secondary">
        <IconCmp size={32} aria-hidden />
      </span>
      <h3 className="text-xl leading-[1.4] font-semibold">{title}</h3>
      <p className="max-w-[44ch] text-sm leading-[1.55] text-content-secondary">
        {body}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/* ----------------------------------------------------------- Stat tile */

export function StatTile({
  label,
  value,
  hint,
  icon: IconCmp,
  context,
}: {
  label: string
  value: string
  hint: string
  icon: Icon
  context: "crm" | "oms" | "neutral"
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm leading-[1.4] font-medium text-content-secondary">
          {label}
        </span>
        <span
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-md",
            context === "crm" && "bg-crm-soft text-crm-on-soft",
            context === "oms" && "bg-oms-soft text-oms-on-soft",
            context === "neutral" && "bg-raised text-content-secondary"
          )}
        >
          <IconCmp size={20} aria-hidden />
        </span>
      </div>
      <span className="tabular text-[28px] leading-[1.2] font-semibold">
        {value}
      </span>
      <span className="text-xs leading-[1.5] text-content-quiet">{hint}</span>
    </Card>
  )
}

/* ------------------------------------------------------------- Toast */

export function Toast({
  title,
  body,
  onClose,
  action,
}: {
  title: string
  body?: string
  onClose: () => void
  action?: React.ReactNode
}) {
  React.useEffect(() => {
    const id = window.setTimeout(onClose, 5000)
    return () => window.clearTimeout(id)
  }, [onClose])

  return (
    <div
      role="status"
      className="fixed right-4 bottom-4 left-4 z-50 flex items-start gap-3 rounded-lg border border-line bg-surface p-4 shadow-[0_8px_24px_rgb(0_0_0/0.12)] sm:left-auto sm:w-[380px]"
    >
      <CheckCircle
        size={20}
        weight="fill"
        className="mt-0.5 shrink-0 text-success"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-[1.4] font-semibold">{title}</p>
        {body && (
          <p className="mt-0.5 text-sm leading-[1.55] text-content-secondary">
            {body}
          </p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
      <IconButton
        icon={XCircle}
        label="Close"
        onClick={onClose}
        className="-mt-2 -mr-2"
      />
    </div>
  )
}
