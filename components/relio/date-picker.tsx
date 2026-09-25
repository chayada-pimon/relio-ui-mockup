"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang } from "@/lib/relio/i18n"
import { TODAY } from "@/lib/relio/data"
import { inputClass } from "@/components/relio/ui"

/* ------------------------------------------------------ ISO day helpers */

// All maths runs on "YYYY-MM-DD" strings in UTC so time zones never shift a day.
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`)
const toIso = (d: Date) => d.toISOString().slice(0, 10)

function shiftDays(iso: string, n: number) {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toIso(d)
}

function shiftMonths(iso: string, n: number) {
  const d = toDate(iso)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return toIso(d)
}

const monthKey = (iso: string) => iso.slice(0, 7)

/** 6 weeks × 7 days covering the month of `iso`, weeks starting on Sunday. */
function monthGrid(iso: string) {
  const first = toDate(`${monthKey(iso)}-01`)
  const start = shiftDays(toIso(first), -first.getUTCDay())
  return Array.from({ length: 42 }, (_, i) => shiftDays(start, i))
}

const c = {
  prev: { th: "เดือนก่อนหน้า", en: "Previous month" },
  next: { th: "เดือนถัดไป", en: "Next month" },
  today: { th: "วันนี้", en: "Today" },
  pick: { th: "เลือกวันที่", en: "Pick a date" },
  days: { th: "วัน", en: "days" },
}

/* ---------------------------------------------------------- DatePicker */

/**
 * Styled replacement for `<input type="date">`. The `id` goes on the trigger
 * button so `<Field htmlFor>` still labels it. Pass `rangeFrom`/`rangeTo` to
 * tint the span between two related pickers (e.g. campaign start → end).
 */
export function DatePicker({
  id,
  value,
  onValueChange,
  min,
  max,
  rangeFrom,
  rangeTo,
  invalid,
  describedBy,
  className,
}: {
  id: string
  value: string
  onValueChange: (value: string) => void
  min?: string
  max?: string
  rangeFrom?: string
  rangeTo?: string
  invalid?: boolean
  describedBy?: string
  className?: string
}) {
  const { lang } = useLang()
  const l = (k: keyof typeof c) => c[k][lang]
  const locale = lang === "th" ? "th-TH" : "en-GB"

  const [open, setOpen] = React.useState(false)
  const [focus, setFocus] = React.useState(value || TODAY)
  const gridRef = React.useRef<HTMLDivElement>(null)

  const fmt = React.useMemo(() => {
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...o })
    return {
      field: f({ weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      month: f({ month: "long", year: "numeric" }),
      weekday: f({ weekday: "narrow" }),
      full: f({ weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    }
  }, [locale])

  const disabled = (iso: string) => (min != null && iso < min) || (max != null && iso > max)
  const clamp = (iso: string) => (min && iso < min ? min : max && iso > max ? max : iso)

  const grid = monthGrid(focus)
  const weekdays = grid.slice(0, 7).map((d) => fmt.weekday.format(toDate(d)))
  const canPrev = !min || monthKey(shiftMonths(focus, -1)) >= monthKey(min)
  const canNext = !max || monthKey(shiftMonths(focus, 1)) <= monthKey(max)

  const span =
    rangeFrom && rangeTo && rangeTo >= rangeFrom
      ? Math.round((toDate(rangeTo).getTime() - toDate(rangeFrom).getTime()) / 86_400_000) + 1
      : null

  // Keep the roving focus on the highlighted day as it moves by keyboard.
  React.useEffect(() => {
    if (!open) return
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus()
  }, [focus, open])

  const pick = (iso: string) => {
    if (disabled(iso)) return
    onValueChange(iso)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => shiftDays(focus, -1),
      ArrowRight: () => shiftDays(focus, 1),
      ArrowUp: () => shiftDays(focus, -7),
      ArrowDown: () => shiftDays(focus, 7),
      PageUp: () => shiftMonths(focus, e.shiftKey ? -12 : -1),
      PageDown: () => shiftMonths(focus, e.shiftKey ? 12 : 1),
      Home: () => shiftDays(focus, -toDate(focus).getUTCDay()),
      End: () => shiftDays(focus, 6 - toDate(focus).getUTCDay()),
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    setFocus(clamp(move()))
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setFocus(clamp(value || TODAY))
        setOpen(next)
      }}
    >
      <Popover.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          inputClass,
          "group flex cursor-pointer items-center gap-2.5 text-left data-[popup-open]:border-action",
          className
        )}
      >
        <CalendarBlank
          size={18}
          aria-hidden
          className="shrink-0 text-content-quiet transition-colors group-data-[popup-open]:text-action"
        />
        <span className={cn("tabular min-w-0 flex-1 truncate", !value && "text-content-quiet")}>
          {value ? fmt.field.format(toDate(value)) : l("pick")}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50 outline-none">
          <Popover.Popup
            initialFocus={() => gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]') ?? true}
            className="w-[304px] origin-[var(--transform-origin)] rounded-md border border-line bg-surface p-3 text-content shadow-[0_12px_32px_-8px_rgb(16_24_40/0.18),0_2px_6px_-2px_rgb(16_24_40/0.08)] transition-[opacity,transform] duration-[120ms] outline-none data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <NavButton label={l("prev")} disabled={!canPrev} onClick={() => setFocus(clamp(shiftMonths(focus, -1)))}>
                <CaretLeft size={16} weight="bold" aria-hidden />
              </NavButton>
              <p aria-live="polite" className="text-sm leading-[1.4] font-semibold">
                {fmt.month.format(toDate(focus))}
              </p>
              <NavButton label={l("next")} disabled={!canNext} onClick={() => setFocus(clamp(shiftMonths(focus, 1)))}>
                <CaretRight size={16} weight="bold" aria-hidden />
              </NavButton>
            </div>

            <div role="grid" aria-label={fmt.month.format(toDate(focus))} ref={gridRef} onKeyDown={onKeyDown}>
              <div role="row" className="grid grid-cols-7">
                {weekdays.map((w, i) => (
                  <span
                    key={i}
                    role="columnheader"
                    className={cn(
                      "flex h-8 items-center justify-center text-xs font-medium text-content-quiet",
                      (i === 0 || i === 6) && "text-content-disabled"
                    )}
                  >
                    {w}
                  </span>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, row) => (
                <div role="row" key={row} className="grid grid-cols-7">
                  {grid.slice(row * 7, row * 7 + 7).map((iso) => {
                    const outside = monthKey(iso) !== monthKey(focus)
                    const off = disabled(iso)
                    const selected = iso === value
                    const inSpan = !!span && iso >= rangeFrom! && iso <= rangeTo!
                    const spanStart = inSpan && iso === rangeFrom
                    const spanEnd = inSpan && iso === rangeTo
                    const dow = toDate(iso).getUTCDay()
                    return (
                      <div
                        role="gridcell"
                        key={iso}
                        aria-selected={selected}
                        className={cn(
                          "flex h-10 items-center justify-center",
                          inSpan && "bg-selection",
                          (spanStart || dow === 0) && inSpan && "rounded-l-full",
                          (spanEnd || dow === 6) && inSpan && "rounded-r-full"
                        )}
                      >
                        <button
                          type="button"
                          data-day={iso}
                          tabIndex={iso === focus ? 0 : -1}
                          disabled={off}
                          aria-label={fmt.full.format(toDate(iso))}
                          aria-current={iso === TODAY ? "date" : undefined}
                          onClick={() => pick(iso)}
                          className={cn(
                            "tabular relative flex size-9 cursor-pointer items-center justify-center rounded-full text-sm transition-[color,background-color,transform] duration-[120ms] outline-none select-none active:scale-[0.92]",
                            "hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-action",
                            outside && "text-content-quiet",
                            iso === TODAY && !selected && "font-semibold text-action",
                            selected && "bg-action font-semibold text-on-action shadow-sm hover:bg-action-hover",
                            off && "cursor-not-allowed text-content-disabled line-through decoration-content-disabled/60 hover:bg-transparent active:scale-100"
                          )}
                        >
                          {toDate(iso).getUTCDate()}
                          {iso === TODAY && (
                            <span
                              aria-hidden
                              className={cn(
                                "absolute bottom-1 size-1 rounded-full",
                                selected ? "bg-on-action" : "bg-action"
                              )}
                            />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
              <span className="tabular text-xs text-content-quiet">
                {span ? `${span.toLocaleString(locale)} ${l("days")}` : ""}
              </span>
              <button
                type="button"
                disabled={disabled(TODAY)}
                onClick={() => pick(TODAY)}
                className="min-h-9 cursor-pointer rounded-sm px-3 text-sm font-medium text-action transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:bg-transparent"
              >
                {l("today")}
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-hover hover:text-content disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
