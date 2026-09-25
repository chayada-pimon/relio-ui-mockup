"use client"

import * as React from "react"

import { campaigns as seed, type Campaign } from "@/lib/relio/dashboard"

/**
 * Client-side campaign list. Starts from the mock data and keeps changes in
 * localStorage so a newly created campaign shows up across pages and reloads.
 */

const STORAGE_KEY = "relio-campaigns"

let current: Campaign[] = seed
let loaded = false
const listeners = new Set<() => void>()

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

function set(next: Campaign[]) {
  current = [...next].sort((a, b) => a.priority - b.priority)
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
    current = seed
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

const getServerSnapshot = () => seed

export function useCampaigns() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export type NewCampaign = Omit<Campaign, "id" | "orders" | "points" | "customers" | "sales">

/**
 * Adds a campaign. If its priority is already used by a running campaign,
 * that one and every later one move down one place.
 */
export function addCampaign(input: NewCampaign): Campaign {
  const list = getSnapshot()
  const maxId = Math.max(0, ...list.map((c) => Number(c.id.replace(/\D/g, "")) || 0))
  const created: Campaign = {
    ...input,
    id: `CP-${String(maxId + 1).padStart(2, "0")}`,
    orders: 0,
    points: 0,
    customers: 0,
    sales: 0,
  }
  const taken = list.some((c) => c.priority === input.priority)
  const shifted = taken
    ? list.map((c) => (c.priority >= input.priority ? { ...c, priority: c.priority + 1 } : c))
    : list
  set([...shifted, created])
  return created
}
