"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  ArrowsClockwise,
  Bell,
  ChartLineUp,
  ChartPieSlice,
  Coins,
  Gear,
  List,
  Megaphone,
  Moon,
  Receipt,
  SquaresFour,
  Storefront,
  Sun,
  UsersThree,
  X,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang, type DictKey } from "@/lib/relio/i18n"
import { RelioLogo } from "@/components/relio/logo"
import { Avatar, IconButton, SearchInput } from "@/components/relio/ui"

type NavItem = {
  href: string
  label: DictKey
  icon: Icon
  context: "neutral" | "crm" | "oms"
  disabled?: boolean
}

const navGroups: { label?: DictKey; items: NavItem[] }[] = [
  {
    items: [
      { href: "/", label: "navOverview", icon: SquaresFour, context: "neutral" },
    ],
  },
  {
    label: "navGroupCrm",
    items: [
      { href: "/customers", label: "navCustomers", icon: UsersThree, context: "crm" },
      { href: "/insights", label: "navInsights", icon: ChartPieSlice, context: "crm" },
      { href: "/loyalty", label: "navLoyalty", icon: Coins, context: "crm" },
      { href: "/campaigns", label: "navCampaigns", icon: Megaphone, context: "crm" },
      { href: "/ingestion", label: "navIngestion", icon: ArrowsClockwise, context: "crm" },
    ],
  },
  {
    label: "navGroupOms",
    items: [
      { href: "/orders", label: "navOrders", icon: Receipt, context: "oms" },
      { href: "/operations", label: "navOperations", icon: Storefront, context: "oms" },
    ],
  },
  {
    items: [
      { href: "/reports", label: "navReports", icon: ChartLineUp, context: "neutral" },
      {
        href: "#",
        label: "navSettings",
        icon: Gear,
        context: "neutral",
        disabled: true,
      },
    ],
  },
]

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { t } = useLang()

  return (
    <nav aria-label="RELIO" className="flex h-full flex-col gap-6 p-4">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex min-h-11 items-center rounded-md px-2"
      >
        <RelioLogo />
      </Link>

      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1">
        {navGroups.map((group, i) => (
          <div key={i} className="flex flex-col gap-1">
            {group.label && (
              <span className="px-3 pb-1 text-xs leading-[1.5] font-medium text-content-quiet">
                {t(group.label)}
              </span>
            )}
            {group.items.map((item) => {
              const active = !item.disabled && isActive(pathname, item.href)
              const IconCmp = item.icon
              if (item.disabled) {
                return (
                  <span
                    key={item.label}
                    aria-disabled="true"
                    className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-content-disabled"
                  >
                    <IconCmp size={20} aria-hidden />
                    <span className="flex-1">{t(item.label)}</span>
                    <span className="text-xs">{t("comingSoon")}</span>
                  </span>
                )
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-[120ms]",
                    active
                      ? "bg-raised"
                      : "text-content-secondary hover:bg-hover hover:text-content",
                    active && item.context === "crm" && "text-crm",
                    active && item.context === "oms" && "text-oms",
                    active && item.context === "neutral" && "text-content"
                  )}
                >
                  <IconCmp
                    size={20}
                    weight={active ? "bold" : "regular"}
                    aria-hidden
                  />
                  {t(item.label)}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-md border border-line p-3">
        <Avatar name="Paweena K" size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm leading-[1.4] font-medium">
            ปวีณา ก.
          </p>
          <p className="truncate text-xs leading-[1.5] text-content-quiet">
            Sales · บ้านขนม Co.
          </p>
        </div>
      </div>
    </nav>
  )
}

function LangSwitch() {
  const { lang, setLang, t } = useLang()
  return (
    <div
      role="group"
      aria-label={t("switchLang")}
      className="inline-flex h-11 items-center rounded-full border border-line bg-surface p-1"
    >
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={cn(
            "h-9 min-w-11 rounded-full px-3 text-sm font-medium transition-colors duration-[120ms]",
            lang === l
              ? "bg-raised text-content"
              : "text-content-quiet hover:text-content"
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useLang()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === "dark"
  return (
    <IconButton
      icon={dark ? Sun : Moon}
      label={t("switchTheme")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    />
  )
}

function GlobalSearch() {
  const { t } = useLang()
  const router = useRouter()
  const [q, setQ] = React.useState("")
  return (
    <form
      role="search"
      className="relative w-full max-w-[420px]"
      onSubmit={(e) => {
        e.preventDefault()
        const query = q.trim()
        if (/^so-/i.test(query)) router.push(`/orders?q=${encodeURIComponent(query)}`)
        else router.push(`/customers?q=${encodeURIComponent(query)}`)
      }}
    >
      <SearchInput
        id="global-search"
        label={t("search")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        inputClassName="rounded-full pr-4"
      />
    </form>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useLang()
  const [open, setOpen] = React.useState(false)
  const menuButton = React.useRef<HTMLButtonElement>(null)
  const pathname = usePathname()

  React.useEffect(() => setOpen(false), [pathname])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        menuButton.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <div className="min-h-svh bg-canvas">
      <aside className="fixed inset-y-0 left-0 hidden w-[240px] border-r border-line bg-surface xl:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[#202124]/40 dark:bg-[#090a0c]/70"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("menu")}
            className="animate-in slide-in-from-left absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-surface shadow-xl duration-200"
          >
            <IconButton
              icon={X}
              label={t("closeMenu")}
              className="absolute top-4 right-3"
              onClick={() => {
                setOpen(false)
                menuButton.current?.focus()
              }}
              autoFocus
            />
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="xl:pl-[240px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur-sm md:px-6 xl:px-10">
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-hover xl:hidden"
          >
            <List size={20} aria-hidden />
            <span className="hidden sm:inline">{t("menu")}</span>
            <span className="sr-only sm:hidden">{t("menu")}</span>
          </button>
          <div className="hidden flex-1 md:block">
            <GlobalSearch />
          </div>
          <div className="ml-auto flex items-center gap-1 md:gap-2">
            <LangSwitch />
            <ThemeSwitch />
            <span className="relative">
              <IconButton icon={Bell} label={t("notifications")} />
              <span
                aria-hidden
                className="absolute top-2.5 right-2.5 size-2 rounded-full bg-warm ring-2 ring-canvas"
              />
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-6 xl:px-10 xl:py-10">
          <div className="mb-6 md:hidden">
            <GlobalSearch />
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
