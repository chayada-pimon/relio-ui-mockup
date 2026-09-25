"use client"

import * as React from "react"

import { useLang } from "@/lib/relio/i18n"
import { rangeBounds, rangeLabel, type Range } from "@/lib/relio/dashboard"

/* ------------------------------------------------------ Shared state */

type RangeContextValue = { range: Range; setRange: (r: Range) => void }

const RangeContext = React.createContext<RangeContextValue | null>(null)

/** Holds one date range for every main page, so it carries over as you navigate. */
export function RangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = React.useState<Range>("30d")
  const value = React.useMemo(() => ({ range, setRange }), [range])
  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>
}

export function useRange() {
  const ctx = React.useContext(RangeContext)
  if (!ctx) throw new Error("useRange must be used inside RangeProvider")
  return ctx
}

/** Whether an ISO date or datetime falls inside the range (inclusive, by day). */
export function inRange(iso: string, range: Range) {
  const { from, to } = rangeBounds(range)
  const day = iso.slice(0, 10)
  return day >= from && day <= to
}

/** Short label for a range: the preset name, or "1 Sep – 15 Sep". */
export function useRangeText() {
  const { lang } = useLang()
  const locale = lang === "th" ? "th-TH" : "en-GB"
  const fmt = (x: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${x}T00:00:00Z`))
  return (range: Range) => {
    if (typeof range === "string") return rangeLabel[range][lang]
    const { from, to } = rangeBounds(range)
    return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`
  }
}
