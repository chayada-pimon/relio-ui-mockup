"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ReceiptX } from "@phosphor-icons/react"

import {
  channelTypeLabel,
  formatBaht,
  orderNet,
  orderStatusLabel,
  orderSubtotal,
  orderTotal,
  type Order,
  type OrderStatus,
} from "@/lib/portal/commerce"
import { formatDate, formatDateTime, today } from "@/lib/portal/data"
import { loyaltyOf, orderPoints } from "@/lib/portal/loyalty"
import { usePortal } from "@/lib/portal/store"
import { CompanyScoped } from "@/components/portal/shell"
import { customerName, OrderStatusTag } from "@/components/portal/orders"
import {
  Alert,
  BackLink,
  Button,
  ConfirmModal,
  DescList,
  EmptyState,
  PageCard,
  SectionTitle,
  Stepper,
  Table,
  Td,
  Th,
} from "@/components/portal/ui"

export default function OrderPage() {
  return (
    <CompanyScoped permission="orders.read">
      {(companyId) => <OrderDetail companyId={companyId} />}
    </CompanyScoped>
  )
}

/** Status moves an admin can make by hand; the channel usually sends these. */
const nextSteps: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["completed", "cancelled"],
  completed: ["returned"],
  cancelled: [],
  returned: [],
}

function OrderDetail({ companyId }: { companyId: string }) {
  const { id } = useParams<{ id: string }>()
  const { data, setData, can } = usePortal()
  const [confirm, setConfirm] = React.useState<OrderStatus | null>(null)

  const order = data.orders.find(
    (o) => o.id === decodeURIComponent(id) && o.companyId === companyId
  )

  if (!order) {
    return (
      <PageCard>
        <EmptyState
          icon={ReceiptX}
          title="ไม่พบคำสั่งซื้อนี้"
          action={
            <Link href={`/orders`} className="text-sm font-medium text-action hover:underline">
              กลับไปหน้าคำสั่งซื้อ
            </Link>
          }
        >
          คำสั่งซื้ออาจอยู่ในบริษัทอื่น ลองเปลี่ยนบริษัทที่แถบด้านบน
        </EmptyState>
      </PageCard>
    )
  }

  const channel = data.channels.find((c) => c.id === order.channelId)
  const earned = orderPoints(data, order)
  const settings = loyaltyOf(data, companyId)
  const pointsLine = earned
    ? `${earned.points} แต้ม (${earned.tier.label}) · ${
        earned.availableAt > today()
          ? `รอยืนยัน ใช้ได้ ${formatDate(earned.availableAt)}`
          : "ใช้ได้แล้ว"
      }`
    : order.status === "returned" || order.status === "cancelled"
      ? "ไม่ได้รับแต้ม"
      : `ได้แต้มเมื่อคำสั่งซื้อสำเร็จ และรอยืนยัน ${settings.confirmDays} วัน`

  function setStatus(status: OrderStatus) {
    const orderId = order!.id
    setData((d) => ({
      ...d,
      orders: d.orders.map(
        (o): Order =>
          o.id === orderId
            ? { ...o, status, completedAt: status === "completed" ? today() : o.completedAt }
            : o
      ),
    }))
    setConfirm(null)
  }

  return (
    <PageCard>
      <BackLink href={`/orders`}>คำสั่งซื้อทั้งหมด</BackLink>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] leading-[1.25] font-semibold tabular-nums">{order.id}</h1>
            <OrderStatusTag status={order.status} />
          </div>
          <p className="mt-0.5 text-sm text-content-secondary">
            สั่งเมื่อ {formatDateTime(order.createdAt)} ผ่าน {channel?.name ?? order.channelId} ·{" "}
            {customerName(data, order.customerId)}
          </p>
        </div>
        {can("orders.write") && nextSteps[order.status].length > 0 && (
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {nextSteps[order.status].map((s) => (
              <Button
                key={s}
                variant={s === "cancelled" || s === "returned" ? "danger" : "primary"}
                onClick={() => setConfirm(s)}
              >
                เปลี่ยนเป็น “{orderStatusLabel[s]}”
              </Button>
            ))}
          </div>
        )}
      </div>

      {order.status === "returned" || order.status === "cancelled" ? (
        <Alert type="warning" className="mt-5">
          {order.status === "returned"
            ? "คำสั่งซื้อนี้คืนสินค้าแล้ว แต้มที่เคยได้จากคำสั่งซื้อนี้ถูกยกเลิก"
            : "คำสั่งซื้อนี้ถูกยกเลิก ไม่นับเป็นยอดซื้อและไม่ได้รับแต้ม"}
        </Alert>
      ) : (
        <div className="mt-5 rounded-lg border border-line p-4">
          <Stepper
            steps={["รอชำระเงิน", "ชำระแล้ว", "สำเร็จ", "ได้แต้ม"]}
            current={
              order.status === "pending"
                ? 0
                : order.status === "paid"
                  ? 1
                  : earned && earned.availableAt > today()
                    ? 3
                    : 4
            }
          />
          <p className="mt-3 text-sm text-content-secondary">{pointsLine}</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <DescList
          rows={[
            {
              label: "ลูกค้า",
              value: (
                <Link
                  href={`/customers/${order.customerId}`}
                  className="text-action hover:underline"
                >
                  {customerName(data, order.customerId)} ({order.customerId})
                </Link>
              ),
            },
            {
              label: "ช่องทาง",
              value: channel
                ? `${channel.name} · ${channelTypeLabel[channel.type]}`
                : order.channelId,
            },
            {
              label: "เลขที่จากช่องทาง",
              value: <span className="font-mono">{order.externalId}</span>,
            },
            { label: "วันที่สั่งซื้อ", value: formatDateTime(order.createdAt) },
            {
              label: "วันที่สำเร็จ",
              value: order.completedAt ? formatDate(order.completedAt) : "-",
            },
            { label: "คะแนนที่ได้", value: pointsLine },
          ]}
        />
        <DescList
          rows={[
            { label: "ยอดสินค้า", value: formatBaht(orderSubtotal(order)) },
            { label: "ส่วนลด", value: order.discount ? `-${formatBaht(order.discount)}` : "-" },
            { label: "ยอดคิดแต้ม", value: formatBaht(orderNet(order)) },
            { label: "ค่าส่ง", value: order.shipping ? formatBaht(order.shipping) : "-" },
            {
              label: "ยอดสุทธิ",
              value: <span className="font-semibold">{formatBaht(orderTotal(order))}</span>,
            },
          ]}
        />
      </div>

      <SectionTitle
        className="mt-8"
        title="รายการสินค้า"
        description="แต้มคิดจากยอดหลังหักส่วนลด ไม่รวมค่าส่ง ปัดเศษทิ้ง"
      />
      <Table>
        <thead>
          <tr>
            <Th>สินค้า</Th>
            <Th className="text-right">ราคาต่อชิ้น</Th>
            <Th className="text-right">จำนวน</Th>
            <Th className="text-right">รวม</Th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.name}>
              <Td>{i.name}</Td>
              <Td className="text-right tabular-nums">{formatBaht(i.price)}</Td>
              <Td className="text-right tabular-nums">{i.qty}</Td>
              <Td className="text-right tabular-nums">{formatBaht(i.price * i.qty)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <ConfirmModal
        open={!!confirm}
        title="เปลี่ยนสถานะคำสั่งซื้อ"
        confirmLabel="ยืนยัน"
        message={
          confirm && (
            <>
              เปลี่ยนสถานะ <b>{order.id}</b> เป็น “{orderStatusLabel[confirm]}”
              {confirm === "completed" &&
                ` — ลูกค้าจะได้แต้มหลังรอยืนยัน ${settings.confirmDays} วัน`}
              {confirm === "returned" && " — แต้มจากคำสั่งซื้อนี้จะถูกยกเลิก"}
            </>
          )
        }
        onClose={() => setConfirm(null)}
        onConfirm={() => setStatus(confirm!)}
      />
    </PageCard>
  )
}
