"use client"

import { useRouter } from "next/navigation"

import {
  orderStatusLabel,
  orderTotal,
  formatBaht,
  type Order,
  type OrderStatus,
} from "@/lib/portal/commerce"
import { formatDateTime, type PortalData } from "@/lib/portal/data"
import { usePortal } from "@/lib/portal/store"
import { MobileCard, Table, Tag, Td, Th, type TagTone } from "@/components/portal/ui"

const statusTone: Record<OrderStatus, TagTone> = {
  pending: "warning",
  paid: "info",
  completed: "success",
  cancelled: "default",
  returned: "error",
}

export function OrderStatusTag({ status }: { status: OrderStatus }) {
  return <Tag tone={statusTone[status]}>{orderStatusLabel[status]}</Tag>
}

export function channelName(data: PortalData, channelId: string | null) {
  if (!channelId) return "-"
  return data.channels.find((c) => c.id === channelId)?.name ?? channelId
}

export function customerName(data: PortalData, customerId: string) {
  return data.customers.find((c) => c.id === customerId)?.name ?? customerId
}

/** Order table (desktop) and cards (mobile); rows open the order page. */
export function OrderList({ orders, hideCustomer }: { orders: Order[]; hideCustomer?: boolean }) {
  const router = useRouter()
  const { data } = usePortal()
  const open = (o: Order) => router.push(`/orders/${o.id}`)

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>เลขที่คำสั่งซื้อ</Th>
              {!hideCustomer && <Th>ลูกค้า</Th>}
              <Th>ช่องทาง</Th>
              <Th>วันที่สั่งซื้อ</Th>
              <Th className="text-right">ยอดรวม</Th>
              <Th>สถานะ</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} onClick={() => open(o)} className="cursor-pointer hover:bg-hover">
                <Td>
                  <span className="font-medium text-action">{o.id}</span>
                  <span className="block text-xs text-content-quiet">{o.externalId}</span>
                </Td>
                {!hideCustomer && <Td>{customerName(data, o.customerId)}</Td>}
                <Td>{channelName(data, o.channelId)}</Td>
                <Td>{formatDateTime(o.createdAt)}</Td>
                <Td className="text-right tabular-nums">{formatBaht(orderTotal(o))}</Td>
                <Td>
                  <OrderStatusTag status={o.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {orders.map((o) => (
          <MobileCard key={o.id} onClick={() => open(o)}>
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{o.id}</span>
              <OrderStatusTag status={o.status} />
            </div>
            <p className="mt-1 text-content-secondary">
              {!hideCustomer && `${customerName(data, o.customerId)} · `}
              {channelName(data, o.channelId)}
            </p>
            <p className="mt-1 flex justify-between text-content-quiet">
              <span>{formatDateTime(o.createdAt)}</span>
              <span className="text-content tabular-nums">{formatBaht(orderTotal(o))}</span>
            </p>
          </MobileCard>
        ))}
      </div>
    </>
  )
}
