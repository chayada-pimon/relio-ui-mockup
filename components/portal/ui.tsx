"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CaretDown,
  Check,
  CheckCircle,
  Eye,
  EyeSlash,
  Info,
  MagnifyingGlass,
  Tray,
  WarningCircle,
  X,
  XCircle,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

// Look and feel follows the RELIO design system (RELIO-DESIGN.md): neutral
// canvas, 16px cards, pill status chips with icons, 44px touch targets,
// Phosphor icons and the shared light/dark tokens from globals.css.

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "default" | "danger" | "ghost"
  size?: "sm" | "md"
  icon?: React.ReactNode
}

export function Button({
  variant = "default",
  size = "md",
  icon,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] duration-[120ms] select-none active:scale-[0.97] [&_svg]:shrink-0",
        "disabled:pointer-events-none disabled:border-transparent disabled:bg-disabled-bg disabled:text-content-disabled",
        size === "md" ? "min-h-11 px-4 text-sm" : "min-h-9 px-3 text-[13px]",
        variant === "primary" &&
          "bg-action text-on-action hover:bg-action-hover active:bg-action-active",
        variant === "default" && "border border-control bg-surface text-content hover:bg-hover",
        variant === "danger" && "border border-line bg-surface text-danger hover:bg-danger-soft",
        variant === "ghost" && "text-content-secondary hover:bg-hover hover:text-content",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

const inputBase =
  "min-h-11 w-full rounded-sm border border-line bg-surface px-3 text-base text-content outline-none transition-colors duration-[120ms] placeholder:text-content-quiet hover:border-control focus-visible:border-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-content-disabled md:text-sm"

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />
}

export function PasswordInput({
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(inputBase, "pr-11", className)}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-sm text-content-quiet hover:text-content"
      >
        {visible ? <Eye size={18} /> : <EyeSlash size={18} />}
      </button>
    </div>
  )
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <MagnifyingGlass
        size={18}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-content-quiet"
      />
      <input
        type="search"
        aria-label={placeholder ?? "ค้นหา"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputBase, "pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          aria-label="ล้างคำค้นหา"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-sm text-content-quiet hover:text-content"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export type SelectOption = { value: string; label: string }

export function Select({
  value,
  onChange,
  options,
  prefix,
  placeholder,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  prefix?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  "aria-label"?: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  React.useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey, true)
    }
  }, [open])

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(inputBase, "flex items-center gap-2 text-left", open && "border-action")}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-content-quiet")}>
          {prefix && selected && (
            <span className="text-content-quiet">{prefix}: </span>
          )}
          {selected?.label ?? placeholder}
        </span>
        <CaretDown
          size={16}
          className={cn(
            "shrink-0 text-content-quiet transition-transform duration-[120ms]",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute top-full left-0 z-40 mt-1.5 max-h-72 w-full min-w-max overflow-auto rounded-md border border-line bg-surface p-1.5 shadow-[0_12px_32px_-8px_rgb(16_24_40/0.18),0_2px_6px_-2px_rgb(16_24_40/0.08)]"
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={cn(
                  "flex min-h-10 w-full items-center gap-2.5 rounded-sm px-3 text-left text-sm text-content hover:bg-hover",
                  o.value === value && "bg-selection font-semibold hover:bg-selection"
                )}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {o.value === value && <Check size={16} weight="bold" className="text-action" />}
                </span>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  disabled,
  indeterminate,
  "aria-label": ariaLabel,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  indeterminate?: boolean
  "aria-label"?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-xs border-[1.5px] transition-colors",
        checked || indeterminate
          ? "border-action bg-action text-on-action"
          : "border-control bg-surface hover:border-action",
        disabled && "cursor-not-allowed border-line bg-disabled-bg text-content-disabled"
      )}
    >
      {indeterminate ? (
        <span className="h-0.5 w-2.5 rounded bg-current" />
      ) : checked ? (
        <Check size={14} weight="bold" />
      ) : null}
    </button>
  )
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm leading-[1.4] font-medium text-content">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-label="จำเป็น">
            *
          </span>
        )}
      </span>
      {children}
      {error ? (
        <span className="flex items-center gap-1.5 text-sm text-danger">
          <WarningCircle size={16} aria-hidden />
          {error}
        </span>
      ) : hint ? (
        <span className="text-sm text-content-quiet">{hint}</span>
      ) : null}
    </div>
  )
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  width = 520,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      // Only the top-most dialog closes on Escape.
      if (e.key !== "Escape") return
      const dialogs = document.querySelectorAll('[role="dialog"]')
      if (dialogs[dialogs.length - 1] === ref.current) onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#202124]/40 px-4 py-[8vh] dark:bg-[#090a0c]/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
        className="animate-in fade-in zoom-in-95 mx-auto w-full rounded-xl border border-line bg-surface p-6 text-content shadow-[0_24px_48px_-12px_rgb(16_24_40/0.25)] duration-150"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl leading-[1.4] font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-content-secondary">{description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="ปิด"
            onClick={onClose}
            className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-content-secondary hover:bg-hover hover:text-content"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-5">{children}</div>
        {footer && (
          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

const alertStyle = {
  info: { icon: Info, box: "bg-info-soft", text: "text-info" },
  warning: { icon: WarningCircle, box: "bg-warning-soft", text: "text-warning" },
  error: { icon: XCircle, box: "bg-danger-soft", text: "text-danger" },
  success: { icon: CheckCircle, box: "bg-success-soft", text: "text-success" },
} satisfies Record<string, { icon: Icon; box: string; text: string }>

export function Alert({
  type,
  children,
  action,
  className,
}: {
  type: keyof typeof alertStyle
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  const s = alertStyle[type]
  const IconCmp = s.icon
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-2 rounded-md px-4 py-3 text-sm leading-[1.55] text-content",
        s.box,
        className
      )}
    >
      <IconCmp size={20} weight="fill" className={cn("mt-px shrink-0", s.text)} aria-hidden />
      <div className="min-w-0 flex-1 basis-48">{children}</div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

export type TagTone = "success" | "default" | "warning" | "error" | "info" | "brand"

const tagStyle: Record<TagTone, { cls: string; icon?: Icon }> = {
  success: { cls: "bg-success-soft text-success", icon: CheckCircle },
  warning: { cls: "bg-warning-soft text-warning", icon: WarningCircle },
  error: { cls: "bg-danger-soft text-danger", icon: XCircle },
  info: { cls: "bg-info-soft text-info", icon: Info },
  default: { cls: "bg-raised text-content-secondary" },
  brand: { cls: "bg-crm-soft text-crm-on-soft" },
}

/** Status chip: pill, soft background, and an icon so state is never colour alone. */
export function Tag({ tone, children }: { tone: TagTone; children: React.ReactNode }) {
  const s = tagStyle[tone]
  const IconCmp = s.icon
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs leading-none font-medium whitespace-nowrap",
        s.cls
      )}
    >
      {IconCmp && <IconCmp size={14} weight="bold" aria-hidden />}
      {children}
    </span>
  )
}

/** Label/value rows grouped in one card. */
export function DescList({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface text-sm">
      {rows.map((r) => (
        <div key={r.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
          <dt className="text-content-quiet">{r.label}</dt>
          <dd className="min-w-0 break-words text-content">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function StatTile({
  label,
  value,
  note,
  icon: IconCmp,
  context = "neutral",
}: {
  label: string
  value: React.ReactNode
  note?: React.ReactNode
  icon?: Icon
  context?: "crm" | "oms" | "neutral" | "warning" | "danger"
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm leading-[1.4] font-medium text-content-secondary">{label}</span>
        {IconCmp && (
          <span
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-md",
              context === "crm" && "bg-crm-soft text-crm-on-soft",
              context === "oms" && "bg-oms-soft text-oms-on-soft",
              context === "neutral" && "bg-raised text-content-secondary",
              context === "warning" && "bg-warning-soft text-warning",
              context === "danger" && "bg-danger-soft text-danger"
            )}
          >
            <IconCmp size={20} aria-hidden />
          </span>
        )}
      </div>
      <span className="text-[26px] leading-[1.2] font-semibold text-content tabular-nums">
        {value}
      </span>
      {note && <span className="text-xs leading-[1.5] text-content-quiet">{note}</span>}
    </div>
  )
}

export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly { key: K; label: string; count?: number }[]
  value: K
  onChange: (key: K) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 text-sm",
        className
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 font-medium whitespace-nowrap transition-colors duration-[120ms]",
            value === t.key
              ? "bg-raised text-content"
              : "text-content-quiet hover:text-content"
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="rounded-full bg-canvas px-1.5 text-xs text-content-secondary tabular-nums">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function PageCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface p-4 sm:p-6", className)}>
      {children}
    </section>
  )
}

export function PageHeader({
  title,
  description,
  extra,
  children,
}: {
  title: React.ReactNode
  /** One sentence on what this page is for. */
  description?: React.ReactNode
  extra?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-[1.25] font-semibold text-content md:text-[30px]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-[66ch] text-[15px] leading-[1.6] text-content-secondary">
              {description}
            </p>
          )}
        </div>
        {extra && <div className="flex flex-wrap gap-3">{extra}</div>}
      </div>
      {children}
    </div>
  )
}

/** Section heading inside a page card. */
export function SectionTitle({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-lg leading-[1.4] font-semibold text-content">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-content-secondary">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  icon: IconCmp = Tray,
  title,
  action,
  children,
}: {
  icon?: Icon
  title?: string
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="mb-2 inline-flex size-16 items-center justify-center rounded-lg bg-raised text-content-secondary">
        <IconCmp size={32} aria-hidden />
      </span>
      {title && <h3 className="text-lg leading-[1.4] font-semibold text-content">{title}</h3>}
      {children && (
        <p className="max-w-[48ch] text-sm leading-[1.55] text-content-secondary">{children}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[640px] border-collapse text-sm text-content">{children}</table>
    </div>
  )
}

export function Th({
  children,
  className,
  sort,
  onSort,
}: {
  children?: React.ReactNode
  className?: string
  sort?: "asc" | "desc" | null
  onSort?: () => void
}) {
  const sortable = sort !== undefined
  return (
    <th
      className={cn(
        "border-b border-line bg-raised px-4 py-3 text-left text-[13px] font-medium whitespace-nowrap text-content-secondary",
        className
      )}
      aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "-mx-1 inline-flex items-center gap-1.5 rounded-xs px-1 hover:text-content",
            sort && "text-content"
          )}
        >
          {children}
          <CaretDown
            size={14}
            weight="bold"
            aria-hidden
            className={cn(
              "transition-transform",
              !sort && "opacity-40",
              sort === "asc" && "rotate-180"
            )}
          />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export function Td({
  children,
  className,
  highlight,
}: {
  children?: React.ReactNode
  className?: string
  highlight?: boolean
}) {
  return (
    <td
      className={cn(
        "border-b border-line px-4 py-3.5 align-middle [tr:last-child_&]:border-b-0",
        highlight && "font-medium",
        className
      )}
    >
      {children}
    </td>
  )
}

/** Card list item used where tables collapse on narrow screens. */
export function MobileCard({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "rounded-lg border border-line bg-surface p-4 text-sm",
        onClick && "cursor-pointer transition-colors hover:border-control"
      )}
    >
      {children}
    </div>
  )
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "ลบ",
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  const destructive = /ลบ|ยกเลิก|ปิด|ออก key/.test(confirmLabel)
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      width={440}
      footer={
        <>
          <Button onClick={onClose}>ไม่ใช่ตอนนี้</Button>
          <Button
            variant="primary"
            className={cn(destructive && "bg-[#b42318] text-white hover:bg-[#9a1d14] active:bg-[#861910]")}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-[1.6] text-content-secondary">{message}</p>
    </Modal>
  )
}

/** Text link back to the parent list, above a detail page title. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-9 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-content-secondary hover:bg-hover hover:text-content"
    >
      <ArrowLeft size={16} aria-hidden />
      {children}
    </Link>
  )
}

/** Where a record is in its flow: done steps, the current one, and what comes next. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 text-sm">
      {steps.map((label, i) => {
        const done = i < current
        const now = i === current
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                done && "bg-success-soft text-success",
                now && "bg-action text-on-action",
                !done && !now && "border border-line text-content-quiet"
              )}
              aria-hidden
            >
              {done ? <Check size={14} weight="bold" /> : i + 1}
            </span>
            <span
              className={cn(now ? "font-semibold text-content" : "text-content-secondary")}
              aria-current={now ? "step" : undefined}
            >
              {label}
            </span>
            {i < steps.length - 1 && <span aria-hidden className="mx-1 h-px w-6 bg-line sm:w-10" />}
          </li>
        )
      })}
    </ol>
  )
}
