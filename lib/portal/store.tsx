"use client"

import * as React from "react"

import {
  seedData,
  type PermissionCode,
  type PortalData,
  type Role,
  type User,
} from "@/lib/portal/data"

// Stands in for the gateway + services. State lives in localStorage so a
// refresh (F5) keeps the session, like the real portal after CRM-136.

const DATA_KEY = "crm-center-portal:data:v2"
const SESSION_KEY = "crm-center-portal:session:v1"
const LOCK_KEY = "crm-center-portal:lock:v1"

const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000

export type Session = {
  userId: string
  /** Companies copied into the token at login; changes need a re-login. */
  companyIds: string[]
  currentCompanyId: string | null
}

type LockState = Record<string, { failures: number; lockedUntil?: number }>

type PortalContextValue = {
  data: PortalData
  setData: (update: (data: PortalData) => PortalData) => void
  session: Session | null
  user: User | null
  role: Role | null
  isSuperAdmin: boolean
  can: (permission: PermissionCode) => boolean
  login: (email: string, password: string) => boolean
  logout: () => void
  switchCompany: (companyId: string) => void
  resetDemo: () => void
}

const PortalContext = React.createContext<PortalContextValue | null>(null)

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage blocked (private mode); the demo still works for this tab.
  }
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false)
  const [data, setDataState] = React.useState<PortalData>(seedData)
  const [session, setSession] = React.useState<Session | null>(null)
  const [locks, setLocks] = React.useState<LockState>({})

  React.useEffect(() => {
    // Hydrate from storage after mount so server and client markup agree.
    /* eslint-disable react-hooks/set-state-in-effect */
    setDataState(read(DATA_KEY, seedData))
    setSession(read<Session | null>(SESSION_KEY, null))
    setLocks(read<LockState>(LOCK_KEY, {}))
    setReady(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  React.useEffect(() => {
    if (ready) write(DATA_KEY, data)
  }, [ready, data])
  React.useEffect(() => {
    if (ready) write(SESSION_KEY, session)
  }, [ready, session])
  React.useEffect(() => {
    if (ready) write(LOCK_KEY, locks)
  }, [ready, locks])

  const setData = React.useCallback(
    (update: (data: PortalData) => PortalData) => setDataState(update),
    []
  )

  const user = session ? (data.users.find((u) => u.id === session.userId) ?? null) : null
  const role = user ? (data.roles.find((r) => r.code === user.roleCode) ?? null) : null
  const isSuperAdmin = role?.code === "super_admin"

  const can = React.useCallback(
    (permission: PermissionCode) => !!role?.permissions.includes(permission),
    [role]
  )

  const login = React.useCallback(
    (email: string, password: string) => {
      // Demo shortcut: an empty email signs in as the seeded super_admin, and
      // an empty password skips the check. A wrong password still fails, so
      // the error message and lockout can be demoed.
      const key = (email.trim() || seedData.users[0].email).toLowerCase()
      const skipPassword = password === ""
      const lock = locks[key]
      const now = Date.now()
      const locked = !skipPassword && !!lock?.lockedUntil && lock.lockedUntil > now
      const found = data.users.find((u) => u.email.toLowerCase() === key)

      // Same answer for unknown email, wrong password, and locked account.
      if (locked || !found || (!skipPassword && found.password !== password)) {
        if (!locked) {
          const failures = (lock?.lockedUntil ? 0 : (lock?.failures ?? 0)) + 1
          setLocks((prev) => ({
            ...prev,
            [key]:
              failures >= MAX_ATTEMPTS
                ? { failures, lockedUntil: now + LOCK_MS }
                : { failures },
          }))
        }
        return false
      }

      setLocks((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setSession({
        userId: found.id,
        companyIds: [...found.companyIds],
        currentCompanyId: found.companyIds[0] ?? null,
      })
      return true
    },
    [data.users, locks]
  )

  const logout = React.useCallback(() => setSession(null), [])

  const switchCompany = React.useCallback((companyId: string) => {
    setSession((prev) => (prev ? { ...prev, currentCompanyId: companyId } : prev))
  }, [])

  const resetDemo = React.useCallback(() => {
    setDataState(seedData)
    setLocks({})
    setSession(null)
  }, [])

  const value = React.useMemo(
    () => ({
      data,
      setData,
      session,
      user,
      role,
      isSuperAdmin,
      can,
      login,
      logout,
      switchCompany,
      resetDemo,
    }),
    [data, setData, session, user, role, isSuperAdmin, can, login, logout, switchCompany, resetDemo]
  )

  if (!ready) return null

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal() {
  const value = React.useContext(PortalContext)
  if (!value) throw new Error("usePortal must be used inside <PortalProvider>")
  return value
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}
