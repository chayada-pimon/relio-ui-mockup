"use client"

import * as React from "react"

import { TODAY, type Activity } from "@/lib/relio/data"

/**
 * Contacts logged from the customer page. Kept in localStorage on top of the
 * mock activities so a new entry survives reloads.
 */

const STORAGE_KEY = "relio-activities"

let current: Activity[] = []
let loaded = false
const listeners = new Set<() => void>()
const empty: Activity[] = []

function load() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) current = parsed
    }
  } catch {}
}

function set(next: Activity[]) {
  current = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {}
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return
    loaded = false
    current = []
    load()
    fn()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(fn)
    window.removeEventListener("storage", onStorage)
  }
}

function getSnapshot() {
  load()
  return current
}

const getServerSnapshot = () => empty

export function useLoggedActivities() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export type LoggableKind = Exclude<Activity["kind"], "order">

/** Logs a contact on the prototype's fixed "today" at the current time. */
export function logActivity(
  customerId: string,
  kind: LoggableKind,
  text: string
): Activity {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
  const created: Activity = {
    id: `A-L${Date.now()}`,
    customerId,
    date: `${TODAY}T${time}`,
    kind,
    text,
  }
  set([...getSnapshot(), created])
  return created
}
