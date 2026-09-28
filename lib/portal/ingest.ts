// Re-processing a failed order event, as the ingestion service would after
// the cause (usually a missing shop mapping) has been fixed.

import { nowIso, type IngestEvent, type Order } from "@/lib/portal/commerce"
import type { PortalData } from "@/lib/portal/data"

/** The channel an event belongs to: its own, or the one its shop is mapped to. */
export function resolveChannel(data: PortalData, event: IngestEvent) {
  if (event.channelId) return event.channelId
  return (
    data.mappings.find(
      (m) =>
        m.companyId === event.companyId &&
        m.platform === event.platform &&
        m.externalShopId === event.externalShopId
    )?.channelId ?? null
  )
}

export function retryEvent(data: PortalData, eventId: string): { data: PortalData; ok: boolean } {
  const event = data.ingestEvents.find((e) => e.id === eventId)
  if (!event || event.status !== "failed") return { data, ok: false }

  const channelId = resolveChannel(data, event)
  const bump = (patch: Partial<IngestEvent>) =>
    data.ingestEvents.map((e) =>
      e.id === eventId ? { ...e, attempts: e.attempts + 1, receivedAt: nowIso(), ...patch } : e
    )

  // Nothing changed for these causes, so the retry fails the same way.
  if (!event.payload || !channelId) return { data: { ...data, ingestEvents: bump({}) }, ok: false }

  const companyOrders = data.orders.filter((o) => o.companyId === event.companyId)
  const prefix = event.companyId === "company-b" ? "ORD-B-" : "ORD-A-"
  const last = Math.max(1000, ...companyOrders.map((o) => Number(o.id.replace(/\D/g, "")) || 0))
  const at = event.receivedAt.slice(0, 10)
  const order: Order = {
    id: `${prefix}${last + 1}`,
    companyId: event.companyId,
    customerId: event.payload.customerId,
    channelId,
    externalId: event.externalOrderId,
    status: event.payload.status,
    items: event.payload.items,
    discount: event.payload.discount,
    shipping: event.payload.shipping,
    createdAt: event.receivedAt,
    completedAt: event.payload.status === "completed" ? at : undefined,
  }

  return {
    ok: true,
    data: {
      ...data,
      orders: [...data.orders, order],
      ingestEvents: bump({
        status: "success",
        channelId,
        orderId: order.id,
        message: undefined,
        payload: undefined,
      }),
    },
  }
}
