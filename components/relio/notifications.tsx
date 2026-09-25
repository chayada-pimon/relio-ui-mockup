"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowRight,
  Bell,
  WarningCircle,
  WarningOctagon,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang } from "@/lib/relio/i18n"
import { alerts, type Text } from "@/lib/relio/dashboard"

const alertIcon: Record<"danger" | "warning" | "info", Icon> = {
  danger: WarningOctagon,
  warning: WarningCircle,
  info: Bell,
}

const title: Text = { th: "แจ้งเตือนระบบ", en: "System alerts" }

export function NotificationBell() {
  const { lang, t } = useLang()
  const tx = (x: Text) => x[lang]
  const [open, setOpen] = React.useState(false)
  const root = React.useRef<HTMLDivElement>(null)
  const button = React.useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const panelId = React.useId()

  React.useEffect(() => setOpen(false), [pathname])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        button.current?.focus()
      }
    }
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointer)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={`${t("notifications")} (${alerts.length})`}
        title={t("notifications")}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-content-secondary transition-colors duration-[120ms] hover:bg-hover hover:text-content",
          open && "bg-hover text-content"
        )}
      >
        <Bell size={20} aria-hidden />
      </button>
      {alerts.length > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-warm px-1 text-[10px] leading-4 font-semibold text-white ring-2 ring-canvas"
        >
          {alerts.length}
        </span>
      )}

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={tx(title)}
          className="animate-in fade-in zoom-in-95 slide-in-from-top-2 origin-top-right duration-150 absolute top-full right-0 z-50 mt-2 w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-surface shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-base leading-[1.4] font-semibold">{tx(title)}</h2>
            <span className="text-sm text-content-quiet">{alerts.length}</span>
          </div>
          <ul className="flex max-h-[min(480px,calc(100svh-120px))] flex-col gap-2 overflow-y-auto p-3">
            {alerts.map((a) => {
              const IconCmp = alertIcon[a.tone]
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex gap-3 rounded-lg px-3 py-3",
                    a.tone === "danger" ? "bg-danger-soft" : a.tone === "warning" ? "bg-warning-soft" : "bg-info-soft"
                  )}
                >
                  <IconCmp
                    size={20}
                    weight="bold"
                    aria-hidden
                    className={cn(
                      "mt-0.5 shrink-0",
                      a.tone === "danger" ? "text-danger" : a.tone === "warning" ? "text-warning" : "text-info"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm leading-[1.4] font-semibold">
                      {tx(a.title)}
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] leading-none font-medium text-content-secondary">
                        {a.source.toUpperCase()}
                      </span>
                    </p>
                    <p className="text-sm leading-[1.55] text-content-secondary">{tx(a.body)}</p>
                    {a.action && (
                      <Link
                        href={a.action.href}
                        onClick={() => setOpen(false)}
                        className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md bg-surface px-4 text-sm font-medium text-content hover:bg-hover"
                      >
                        {tx(a.action.label)}
                        <ArrowRight size={16} aria-hidden />
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
