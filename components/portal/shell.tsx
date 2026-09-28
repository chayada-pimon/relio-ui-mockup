"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  ArrowsClockwise,
  Bank,
  Bell,
  Buildings,
  CaretDown,
  CaretRight,
  ClockCounterClockwise,
  Coins,
  FlowArrow,
  GearSix,
  Gift,
  List,
  LockKey,
  Moon,
  Plugs,
  Receipt,
  ShieldCheck,
  SignOut,
  SlidersHorizontal,
  SquaresFour,
  Sun,
  UserGear,
  UsersThree,
  X,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import type { PermissionCode } from "@/lib/portal/data"
import { usePortal } from "@/lib/portal/store"
import { EmptyState, Select } from "@/components/portal/ui"


type NavItem = {
  href: string
  label: string
  icon: Icon
  context?: "crm" | "oms"
  permission?: PermissionCode
  superAdminOnly?: boolean
  /** Small count shown when something needs attention. */
  badge?: "ingestFailed" | "unmapped"
}

type NavGroup = {
  label: string
  icon: Icon
  items: NavItem[]
}

type NavEntry = NavItem | NavGroup

const isGroup = (e: NavEntry): e is NavGroup => "items" in e

/** Sidebar block with a category heading above its entries. */
type NavSectionDef = {
  label: string
  entries: NavEntry[]
}

const usersItem: NavItem = {
  href: `/settings/users`,
  label: "ผู้ใช้งาน",
  icon: UserGear,
  permission: "users.read",
}
const rolesItem: NavItem = {
  href: `/settings/roles`,
  label: "สิทธิ์การใช้งาน",
  icon: ShieldCheck,
  superAdminOnly: true,
}
const companiesItem: NavItem = {
  href: `/companies`,
  label: "บริษัท",
  icon: Bank,
  superAdminOnly: true,
}

/** Settings pages shown in the avatar menu. */
const settingsItems = [usersItem, rolesItem, companiesItem]

const navSections: NavSectionDef[] = [
  {
    label: "ภาพรวม",
    entries: [{ href: "/", label: "Dashboard", icon: SquaresFour }],
  },
  {
    label: "ลูกค้าและการขาย",
    entries: [
      {
        href: `/customers`,
        label: "ลูกค้า",
        icon: UsersThree,
        context: "crm",
        permission: "customers.read",
      },
      {
        href: `/orders`,
        label: "คำสั่งซื้อ",
        icon: Receipt,
        context: "oms",
        permission: "orders.read",
      },
      {
        label: "สิทธิประโยชน์",
        icon: Gift,
        items: [
          {
            href: `/loyalty/points`,
            label: "แต้มสะสม",
            icon: Coins,
            context: "crm",
            permission: "loyalty.read",
          },
          {
            href: `/loyalty/settings`,
            label: "กติกาแต้ม",
            icon: SlidersHorizontal,
            context: "crm",
            permission: "loyalty.read",
          },
          {
            href: `/loyalty/rewards`,
            label: "ของรางวัล",
            icon: Gift,
            context: "crm",
            permission: "loyalty.read",
          },
          {
            href: `/loyalty/redemptions`,
            label: "ประวัติการแลก",
            icon: ClockCounterClockwise,
            context: "crm",
            permission: "loyalty.read",
          },
        ],
      },
    ],
  },
  {
    label: "ผู้ดูแลระบบ",
    entries: [
      {
        label: "การเชื่อมต่อระบบ",
        icon: Plugs,
        items: [
          {
            href: `/integration/connections`,
            label: "ช่องทางและ API key",
            icon: Plugs,
            context: "oms",
            permission: "integration.read",
          },
          {
            href: `/integration/mapping`,
            label: "Mapping ร้านค้า",
            icon: FlowArrow,
            context: "oms",
            permission: "integration.read",
            badge: "unmapped",
          },
          {
            href: `/integration/ingestion`,
            label: "ติดตามการรับข้อมูล",
            icon: ArrowsClockwise,
            context: "oms",
            permission: "integration.read",
            badge: "ingestFailed",
          },
        ],
      },
      {
        label: "ตั้งค่า",
        icon: GearSix,
        items: [usersItem, rolesItem],
      },
      companiesItem,
    ],
  },
]

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`)
}

function useBadges() {
  const { data, session } = usePortal()
  const companyId = session?.currentCompanyId
  return {
    ingestFailed: data.ingestEvents.filter(
      (e) => e.companyId === companyId && e.status === "failed"
    ).length,
    unmapped: data.mappings.filter(
      (m) => m.companyId === companyId && !m.channelId
    ).length,
  }
}

function useAllowed() {
  const { can, isSuperAdmin } = usePortal()
  return (item: NavItem) =>
    (!item.superAdminOnly || isSuperAdmin) &&
    (!item.permission || can(item.permission))
}

function useNavSections() {
  const allowed = useAllowed()
  return navSections
    .map((s) => ({
      ...s,
      entries: s.entries.flatMap((e): NavEntry[] => {
        if (!isGroup(e)) return allowed(e) ? [e] : []
        const items = e.items.filter(allowed)
        return items.length > 0 ? [{ ...e, items }] : []
      }),
    }))
    .filter((s) => s.entries.length > 0)
}

/** Closes a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, close])
  return ref
}

const popover =
  "animate-in fade-in-0 zoom-in-95 absolute top-full z-40 mt-2 rounded-lg border border-line bg-surface p-2 shadow-[0_16px_40px_-12px_rgb(16_24_40/0.22),0_2px_6px_-2px_rgb(16_24_40/0.08)] duration-150"

/** Same mark as the login page; `onBlue` for the sidebar panel. */
function Logo({ onClick, onBlue }: { onClick?: () => void; onBlue?: boolean }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-2 rounded-md text-[17px] font-semibold",
        onBlue ? "text-white" : "text-content"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 place-items-center rounded-lg text-[11px] font-semibold",
          onBlue ? "bg-white text-[#1450cc]" : "bg-[#1450cc] text-white"
        )}
      >
        CC
      </span>
      CRM Center
    </Link>
  )
}

function CountBadge({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        "rounded-full bg-danger-soft px-2 text-xs leading-5 font-semibold text-danger tabular-nums",
        className
      )}
      aria-label={`${count} รายการต้องดูแล`}
    >
      {count}
    </span>
  )
}

const row =
  "group relative flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-[background-color,color,transform] duration-[160ms] ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
// The menu sits on the blue .portal-sidebar panel, so rows are white-on-blue.
const rowIdle =
  "text-white/90 hover:bg-linear-to-r hover:from-white/15 hover:to-white/0 hover:text-white"
/** Current page: white pill that fades slightly to the right. */
const rowActive =
  "bg-linear-to-r from-white to-white/80 text-[#1450cc] shadow-[0_8px_20px_-8px_rgb(10_40_120/0.5)] dark:from-white/95 dark:to-white/75"
/** Leading icon nudges right on hover. */
const rowIcon =
  "shrink-0 transition-transform duration-[160ms] ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"

function MenuLink({
  item,
  count,
  active,
  nested,
  onNavigate,
}: {
  item: NavItem
  count: number
  active: boolean
  nested?: boolean
  onNavigate?: () => void
}) {
  const IconCmp = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        row,
        nested && "pl-10",
        active ? rowActive : rowIdle,
        active && item.context === "crm" && "text-[#087f8c]"
      )}
    >
      {!nested && (
        <IconCmp
          size={18}
          weight={active ? "bold" : "regular"}
          aria-hidden
          className={rowIcon}
        />
      )}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      <CountBadge count={count} />
    </Link>
  )
}

/** Collapsible sidebar group; opens by itself when it holds the current page. */
function NavSection({
  group,
  onNavigate,
}: {
  group: NavGroup
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const badges = useBadges()
  const active = group.items.some((i) => isActive(pathname, i.href))
  const [open, setOpen] = React.useState(active)
  const id = React.useId()
  const count = group.items.reduce(
    (s, i) => s + (i.badge ? badges[i.badge] : 0),
    0
  )
  const IconCmp = group.icon

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active) setOpen(true)
  }, [active])

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(row, active ? "bg-white/10 text-white" : rowIdle)}
      >
        <IconCmp
          size={18}
          weight={active ? "bold" : "regular"}
          aria-hidden
          className={rowIcon}
        />
        <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
        {!open && count > 0 && (
          <span aria-hidden className="size-2 rounded-full bg-[#ff8a8a] ring-2 ring-white/30" />
        )}
        <CaretDown
          size={14}
          aria-hidden
          className={cn(
            "transition-transform duration-[120ms]",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-0.5">
          {group.items.map((item) => (
            <MenuLink
              key={item.href}
              item={item}
              count={item.badge ? badges[item.badge] : 0}
              active={isActive(pathname, item.href)}
              nested
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Company whose data every page shows; lives in the top bar beside the profile. */
export function CompanySwitcher({ className }: { className?: string }) {
  const { data, session, switchCompany } = usePortal()
  if (!session || session.companyIds.length === 0) return null
  const options = session.companyIds.map((id) => ({
    value: id,
    label: data.companies.find((c) => c.id === id)?.name ?? id,
  }))
  return (
    <div className={cn("relative", className)}>
      <Buildings
        size={16}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-content-quiet"
      />
      <Select
        aria-label="เลือกบริษัทที่กำลังดูข้อมูล"
        value={session.currentCompanyId ?? ""}
        onChange={switchCompany}
        options={options}
        className="[&>button]:pl-9"
      />
    </div>
  )
}

/** Sidebar menu: docked from lg, inside the drawer below. */
function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const badges = useBadges()
  const sections = useNavSections()
  const id = React.useId()
  return (
    <>
      <nav aria-label="เมนูหลัก" className="flex flex-col gap-5 p-3">
        {sections.map((section) => (
          <div
            key={section.label}
            role="group"
            aria-labelledby={`${id}-${section.label}`}
            className="flex flex-col gap-0.5"
          >
            <span
              id={`${id}-${section.label}`}
              className="px-3 pb-1 text-xs leading-[1.5] font-semibold tracking-wide text-white/75"
            >
              {section.label}
            </span>
            {section.entries.map((e) =>
              isGroup(e) ? (
                <NavSection key={e.label} group={e} onNavigate={onNavigate} />
              ) : (
                <MenuLink
                  key={e.href}
                  item={e}
                  count={e.badge ? badges[e.badge] : 0}
                  active={isActive(pathname, e.href)}
                  onNavigate={onNavigate}
                />
              )
            )}
          </div>
        ))}
      </nav>
    </>
  )
}

const iconButton =
  "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-content-secondary transition-colors duration-[120ms] hover:bg-hover hover:text-content"

function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === "dark"
  const label = dark ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={iconButton}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

/** Bell with the things that need attention for the current company. */
function Notifications() {
  const { can } = usePortal()
  const badges = useBadges()
  const [open, setOpen] = React.useState(false)
  const close = React.useCallback(() => setOpen(false), [])
  const ref = useDismiss(open, close)

  const items = can("integration.read")
    ? [
        {
          count: badges.ingestFailed,
          text: "คำสั่งซื้อรับเข้าไม่สำเร็จ",
          href: `/integration/ingestion`,
        },
        {
          count: badges.unmapped,
          text: "ร้านค้าที่ยังไม่ได้ Mapping",
          href: `/integration/mapping`,
        },
      ].filter((i) => i.count > 0)
    : []
  const total = items.reduce((s, i) => s + i.count, 0)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={total ? `การแจ้งเตือน ${total} รายการ` : "การแจ้งเตือน"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={iconButton}
      >
        <Bell size={20} />
        {total > 0 && (
          <span
            aria-hidden
            className="absolute top-2.5 right-3 size-2 rounded-full bg-danger ring-2 ring-surface"
          />
        )}
      </button>
      {open && (
        <div role="menu" className={cn(popover, "right-0 w-72")}>
          <p className="px-3 pt-1 pb-2 text-sm font-semibold">การแจ้งเตือน</p>
          {items.length === 0 ? (
            <p className="px-3 pb-2 text-sm text-content-secondary">
              ไม่มีเรื่องที่ต้องดูแลตอนนี้
            </p>
          ) : (
            items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                onClick={close}
                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm hover:bg-hover"
              >
                <CountBadge count={i.count} />
                <span className="min-w-0 flex-1">{i.text}</span>
                <CaretRight
                  size={16}
                  aria-hidden
                  className="text-content-quiet"
                />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/** Avatar menu: who is signed in, settings, sign out. */
function ProfileMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const { session, user, role, logout } = usePortal()
  const allowed = useAllowed()
  const settings = settingsItems.filter(allowed)
  const [open, setOpen] = React.useState(false)
  const close = React.useCallback(() => setOpen(false), [])
  const ref = useDismiss(open, close)
  if (!session || !user) return null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="บัญชีผู้ใช้"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center rounded-full border border-line bg-surface p-1 transition-colors duration-[120ms] hover:bg-hover"
      >
        <span
          aria-hidden
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-crm-soft text-sm font-semibold text-crm-on-soft uppercase"
        >
          {user.email.slice(0, 2)}
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="บัญชีผู้ใช้"
          className={cn(popover, "right-0 flex w-80 flex-col gap-3 p-3")}
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-crm-soft font-semibold text-crm-on-soft uppercase"
            >
              {user.email.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm leading-[1.4] font-medium">
                {user.email}
              </p>
              <p className="truncate text-xs leading-[1.5] text-content-quiet">
                {role?.name ?? user.roleCode}
              </p>
            </div>
          </div>
          {settings.length > 0 && (
            <nav
              aria-label="ตั้งค่า"
              className="flex flex-col gap-0.5 border-t border-line pt-2"
            >
              <span className="px-3 pb-1 text-xs font-medium text-content-quiet">
                ตั้งค่า
              </span>
              {settings.map((item) => {
                const active = isActive(pathname, item.href)
                const IconCmp = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      row,
                      "min-h-11 rounded-md px-3",
                      active
                        ? "bg-raised font-medium text-content"
                        : "font-medium text-content-secondary hover:bg-hover hover:text-content"
                    )}
                  >
                    <IconCmp
                      size={20}
                      weight={active ? "bold" : "regular"}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>
                    <CaretRight
                      size={16}
                      aria-hidden
                      className="text-content-quiet"
                    />
                  </Link>
                )
              })}
            </nav>
          )}
          <button
            type="button"
            onClick={() => {
              logout()
              router.replace(`/login`)
            }}
            className="flex min-h-11 items-center gap-3 rounded-md border-t border-line px-3 pt-1 text-sm font-medium text-content-secondary hover:bg-hover hover:text-content"
          >
            <SignOut size={20} aria-hidden />
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  )
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { session, user, logout } = usePortal()
  const [drawer, setDrawer] = React.useState(false)

  React.useEffect(() => {
    if (!session || !user) {
      if (session && !user) logout()
      router.replace(`/login`)
    }
  }, [session, user, logout, router])

  React.useEffect(() => {
    // Close the drawer whenever the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawer(false)
  }, [pathname])

  React.useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [drawer])

  if (!session || !user) return null

  return (
    <div className="h-svh bg-canvas text-content">
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[#202124]/40 dark:bg-[#090a0c]/70"
            onClick={() => setDrawer(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="เมนู"
            className="portal-sidebar absolute inset-y-2 left-2 flex w-[260px] max-w-[85vw] animate-in flex-col overflow-hidden rounded-[24px] duration-200 slide-in-from-left"
          >
            <div className="flex h-16 shrink-0 items-center justify-between pr-2 pl-6">
              <Logo onBlue onClick={() => setDrawer(false)} />
              <button
                type="button"
                aria-label="ปิดเมนู"
                onClick={() => setDrawer(false)}
                className="inline-flex size-11 items-center justify-center rounded-md text-white/80 hover:bg-white/15 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="shrink-0 px-3 pb-2 sm:hidden">
              <CompanySwitcher />
            </div>
            <div className="portal-scroll min-h-0 flex-1 overflow-y-auto">
              <SidebarNav onNavigate={() => setDrawer(false)} />
            </div>
            <div className="shrink-0 border-t border-white/15 p-3">
              <button
                type="button"
                onClick={() => {
                  logout()
                  router.replace(`/login`)
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-white/90 hover:bg-white/15 hover:text-white"
              >
                <SignOut size={20} aria-hidden />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu sits on the login-page blue; content is a white panel on top. */}
      <div className="portal-backdrop relative flex h-full pt-2 lg:gap-4 lg:pt-0">
        <aside className="relative hidden w-60 shrink-0 flex-col lg:flex">
          <div className="flex h-16 shrink-0 items-center px-6">
            <Logo onBlue />
          </div>
          <div className="portal-scroll min-h-0 flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas shadow-[-20px_0_60px_-20px_rgb(10_40_120/0.45)]">
          <header className="flex h-16 shrink-0 items-center gap-3 px-3 md:px-6 xl:px-8">
            <button
              type="button"
              aria-label="เปิดเมนู"
              onClick={() => setDrawer(true)}
              className={cn(iconButton, "lg:hidden")}
            >
              <List size={20} aria-hidden />
            </button>
            <div className="lg:hidden">
              <Logo />
            </div>
            <CompanySwitcher className="hidden w-[240px] sm:block" />
            <div className="ml-auto flex items-center gap-2">
              <ThemeSwitch />
              <Notifications />
              <ProfileMenu />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 md:px-6 xl:px-8">
            <div
              key={pathname}
              className="relio-page mx-auto w-full max-w-[1320px]"
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

/** Shown when the role lacks a permission (the API answers 403). */
export function Forbidden() {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <EmptyState icon={LockKey} title="ไม่มีสิทธิ์เข้าถึงหน้านี้">
        บทบาทของบัญชีนี้ยังไม่ได้รับสิทธิ์ดูข้อมูลส่วนนี้
        ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เพิ่ม
      </EmptyState>
    </section>
  )
}

/** Pages that need a company selected in the top bar. */
export function NoCompany() {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <EmptyState icon={Buildings} title="บัญชีนี้ยังไม่ได้ผูกกับบริษัท">
        ให้ผู้ดูแลระบบผูกบริษัทกับบัญชีนี้ แล้วออกจากระบบและเข้าใหม่อีกครั้ง
      </EmptyState>
    </section>
  )
}

/**
 * Checks the permission and that a company is selected, then renders the page
 * for that company. Keyed by company so local state resets on switch.
 */
export function CompanyScoped({
  permission,
  children,
}: {
  permission: PermissionCode
  children: (companyId: string) => React.ReactNode
}) {
  const { session, can } = usePortal()
  if (!can(permission)) return <Forbidden />
  const companyId = session?.currentCompanyId
  if (!companyId) return <NoCompany />
  return <React.Fragment key={companyId}>{children(companyId)}</React.Fragment>
}
