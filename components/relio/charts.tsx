"use client"

import * as React from "react"
import { ChartLine, Table } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

/* Chart primitives following the dataviz mark specs: bars <= 24px with a 4px
   rounded data-end, 2px lines, 2px surface gaps, hairline grid, a legend for
   two or more series, a hover/focus tooltip and a table view for every plot. */

function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [width, setWidth] = React.useState(0)
  React.useLayoutEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    )
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0]
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
}

export function compact(n: number, lang: "th" | "en") {
  return new Intl.NumberFormat(lang === "th" ? "th-TH" : "en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n)
}

/* ----------------------------------------------------------- Tooltip */

type TipRow = { color: string; label: string; value: string }

function Tooltip({
  x,
  containerWidth,
  title,
  rows,
}: {
  x: number
  containerWidth: number
  title: string
  rows: TipRow[]
}) {
  const left = Math.min(Math.max(x - 90, 0), Math.max(containerWidth - 180, 0))
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute top-0 z-10 w-[180px] rounded-md border border-line bg-surface p-3 shadow-[0_4px_16px_rgb(0_0_0/0.12)]"
      style={{ left }}
    >
      <p className="mb-2 text-xs leading-[1.4] text-content-quiet">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ background: r.color }}
            />
            <span className="tabular text-sm font-semibold">{r.value}</span>
            <span className="truncate text-xs text-content-secondary">
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------- Chart frame */

export function ChartFrame({
  title,
  description,
  legend,
  table,
  labels,
  children,
}: {
  title: string
  description?: string
  legend?: { color: string; label: string; shape?: "rect" | "line" }[]
  table: { columns: string[]; rows: (string | number)[][] }
  labels: { showTable: string; showChart: string }
  children: React.ReactNode
}) {
  const [asTable, setAsTable] = React.useState(false)
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base leading-[1.4] font-semibold">{title}</h3>
          {description && (
            <p className="text-sm leading-[1.55] text-content-secondary">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-content-secondary hover:bg-hover hover:text-content"
        >
          {asTable ? (
            <ChartLine size={18} aria-hidden />
          ) : (
            <Table size={18} aria-hidden />
          )}
          {asTable ? labels.showChart : labels.showTable}
        </button>
      </div>
      {legend && legend.length > 1 && !asTable && (
        <ul className="flex flex-wrap gap-4">
          {legend.map((l) => (
            <li
              key={l.label}
              className="flex items-center gap-2 text-sm text-content-secondary"
            >
              <span
                aria-hidden
                className={cn(
                  "shrink-0",
                  l.shape === "line" ? "h-0.5 w-4 rounded-full" : "size-3 rounded-xs"
                )}
                style={{ background: l.color }}
              />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {asTable ? (
        <div className="max-h-[280px] overflow-auto rounded-md border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-raised text-xs text-content-secondary">
              <tr>
                {table.columns.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={cn("px-3 py-2 font-medium", i > 0 && "text-right")}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {r.map((cell, j) => (
                    <td
                      key={j}
                      className={cn("px-3 py-2", j > 0 && "tabular text-right")}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

/* ------------------------------------------------------- Line chart */

const PAD = { top: 16, right: 16, bottom: 28, left: 52 }

export function LineChart({
  points,
  color,
  seriesLabel,
  formatValue,
  formatTick,
  formatX,
  ariaLabel,
  height = 220,
}: {
  points: { x: string; v: number }[]
  color: string
  seriesLabel: string
  formatValue: (v: number) => string
  formatTick: (v: number) => string
  formatX: (x: string) => string
  ariaLabel: string
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = React.useState<number | null>(null)

  const ticks = niceTicks(Math.max(...points.map((p) => p.v)))
  const yMax = ticks[ticks.length - 1]
  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const innerH = height - PAD.top - PAD.bottom
  const xAt = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const yAt = (v: number) => PAD.top + innerH - (v / yMax) * innerH

  const line = points.map((p, i) => `${i ? "L" : "M"}${xAt(i)},${yAt(p.v)}`).join("")
  const area = `${line}L${xAt(points.length - 1)},${yAt(0)}L${xAt(0)},${yAt(0)}Z`
  const every = Math.ceil(points.length / Math.max(Math.floor(innerW / 72), 1))
  const last = points.length - 1

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - box.left) / box.width
    setActive(Math.round(rel * last))
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          className="block overflow-visible rounded-sm"
          onFocus={() => setActive(last)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive((a) => Math.max((a ?? last) - 1, 0))
            if (e.key === "ArrowRight") setActive((a) => Math.min((a ?? last) + 1, last))
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yAt(t)}
                y2={yAt(t)}
                stroke="var(--chart-grid)"
              />
              <text
                x={PAD.left - 8}
                y={yAt(t)}
                dy="0.32em"
                textAnchor="end"
                className="tabular fill-content-quiet text-[11px]"
              >
                {formatTick(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % every === 0 || i === last ? (
              <text
                key={p.x}
                x={xAt(i)}
                y={height - 8}
                textAnchor={i === last ? "end" : i === 0 ? "start" : "middle"}
                className="fill-content-quiet text-[11px]"
              >
                {formatX(p.x)}
              </text>
            ) : null
          )}
          <path d={area} fill={color} opacity={0.1} className="relio-area" />
          <path
            d={line}
            pathLength={1}
            className="relio-line"
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {active !== null && (
            <line
              x1={xAt(active)}
              x2={xAt(active)}
              y1={PAD.top}
              y2={yAt(0)}
              stroke="var(--border-control)"
            />
          )}
          <circle
            className="relio-dot"
            cx={xAt(active ?? last)}
            cy={yAt(points[active ?? last].v)}
            r={4.5}
            fill={color}
            stroke="var(--bg-surface)"
            strokeWidth={2}
          />
          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}
      {active !== null && width > 0 && (
        <Tooltip
          x={xAt(active)}
          containerWidth={width}
          title={formatX(points[active].x)}
          rows={[{ color, label: seriesLabel, value: formatValue(points[active].v) }]}
        />
      )}
    </div>
  )
}

/* --------------------------------------------- Stacked column chart */

type Series = { key: string; label: string; color: string }

function topRounded(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return ""
  const rr = Math.min(r, h, w / 2)
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`
}

export function StackedColumns({
  points,
  series,
  formatValue,
  formatX,
  ariaLabel,
  height = 220,
}: {
  points: ({ x: string } & Record<string, number | string>)[]
  /** bottom → top */
  series: [Series, Series]
  formatValue: (v: number) => string
  formatX: (x: string) => string
  ariaLabel: string
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = React.useState<number | null>(null)

  const val = (p: (typeof points)[number], k: string) => Number(p[k])
  const totals = points.map((p) => val(p, series[0].key) + val(p, series[1].key))
  const ticks = niceTicks(Math.max(...totals))
  const yMax = ticks[ticks.length - 1]
  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const innerH = height - PAD.top - PAD.bottom
  const band = innerW / points.length
  const barW = Math.min(24, band * 0.62)
  const hOf = (v: number) => (v / yMax) * innerH
  const every = Math.ceil(points.length / Math.max(Math.floor(innerW / 72), 1))
  const last = points.length - 1

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          className="block overflow-visible rounded-sm"
          onFocus={() => setActive(last)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive((a) => Math.max((a ?? last) - 1, 0))
            if (e.key === "ArrowRight") setActive((a) => Math.min((a ?? last) + 1, last))
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={PAD.top + innerH - hOf(t)}
                y2={PAD.top + innerH - hOf(t)}
                stroke="var(--chart-grid)"
              />
              <text
                x={PAD.left - 8}
                y={PAD.top + innerH - hOf(t)}
                dy="0.32em"
                textAnchor="end"
                className="tabular fill-content-quiet text-[11px]"
              >
                {formatValue(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = PAD.left + band * i + band / 2
            const x = cx - barW / 2
            const base = PAD.top + innerH
            const h0 = hOf(val(p, series[0].key))
            const h1 = Math.max(hOf(val(p, series[1].key)) - 2, 0)
            const dim = active !== null && active !== i
            return (
              <g key={p.x} opacity={dim ? 0.55 : 1} className="transition-opacity duration-150">
                <g className="relio-bar" style={{ animationDelay: `${i * 35}ms` }}>
                  <rect x={x} y={base - h0} width={barW} height={h0} fill={series[0].color} />
                  <path
                    d={topRounded(x, base - h0 - 2 - h1, barW, h1, 4)}
                    fill={series[1].color}
                  />
                </g>
                {(i % every === 0 || i === last) && (
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-content-quiet text-[11px]"
                  >
                    {formatX(p.x)}
                  </text>
                )}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                />
              </g>
            )
          })}
        </svg>
      )}
      {active !== null && width > 0 && (
        <Tooltip
          x={PAD.left + band * active + band / 2}
          containerWidth={width}
          title={formatX(points[active].x)}
          rows={[...series].reverse().map((s) => ({
            color: s.color,
            label: s.label,
            value: formatValue(val(points[active], s.key)),
          }))}
        />
      )}
    </div>
  )
}

/* ------------------------------------------ Horizontal bars (1 series) */

export function BarList({
  rows,
  color,
  ariaLabel,
}: {
  rows: { label: string; value: number; display: string; sub?: string }[]
  color: string
  ariaLabel: string
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul aria-label={ariaLabel} className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3">
          <span className="truncate text-sm text-content-secondary">{r.label}</span>
          <span className="h-4">
            <span
              className="relio-bar-x block h-full rounded-r-xs transition-[width] duration-500"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: color,
                minWidth: 2,
                animationDelay: `${i * 60}ms`,
              }}
            />
          </span>
          <span className="tabular min-w-[88px] text-right text-sm">
            <span className="font-semibold">{r.display}</span>
            {r.sub && <span className="ml-1.5 text-xs text-content-quiet">{r.sub}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------- Two-part split bar */

export function SplitBar({
  parts,
}: {
  parts: [
    { label: string; value: number; color: string },
    { label: string; value: number; color: string },
  ]
}) {
  const total = parts[0].value + parts[1].value
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 gap-0.5" aria-hidden>
        {parts.map((p, i) => (
          <span
            key={p.label}
            className={cn(
              "relio-bar-x block h-full transition-[width] duration-500",
              i === 0 ? "rounded-l-xs" : "rounded-r-xs"
            )}
            style={{
              width: `${(p.value / total) * 100}%`,
              background: p.color,
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap justify-between gap-3">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="size-3 rounded-xs" style={{ background: p.color }} />
            <span className="text-content-secondary">{p.label}</span>
            <span className="tabular font-semibold">{p.value.toLocaleString()}</span>
            <span className="tabular text-xs text-content-quiet">
              {Math.round((p.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------ Meter */

export function Meter({
  label,
  used,
  limit,
  display,
  warnLabel,
}: {
  label: string
  used: number
  limit: number
  display: string
  warnLabel?: string
}) {
  const pct = used / limit
  const tone = pct >= 0.95 ? "danger" : pct >= 0.8 ? "warning" : "ok"
  const fill =
    tone === "danger"
      ? "var(--meter-danger)"
      : tone === "warning"
        ? "var(--meter-warning)"
        : "var(--action-primary-bg)"
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-content-secondary">{label}</span>
        <span className="tabular">
          <span className="font-semibold">{display}</span>
          {tone !== "ok" && warnLabel && (
            <span className={cn("ml-2 text-xs font-medium", tone === "danger" ? "text-danger" : "text-warning")}>
              {warnLabel}
            </span>
          )}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
        className="h-2 overflow-hidden rounded-full"
        style={{ background: "var(--chart-grid)" }}
      >
        <div className="relio-bar-x h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(pct, 1) * 100}%`, background: fill }} />
      </div>
    </div>
  )
}
