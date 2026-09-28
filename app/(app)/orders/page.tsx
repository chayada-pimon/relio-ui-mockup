"use client"

import * as React from "react"

import { orderStatusLabel, type OrderStatus } from "@/lib/portal/commerce"
import { usePortal } from "@/lib/portal/store"
import { CompanyScoped } from "@/components/portal/shell"
import { customerName, OrderList } from "@/components/portal/orders"
import {
  Button,
  EmptyState,
  PageCard,
  PageHeader,
  SearchBox,
  Select,
} from "@/components/portal/ui"

export default function OrdersPage() {
  return (
    <CompanyScoped permission="orders.read">
      {(companyId) => <OrderSearch companyId={companyId} />}
    </CompanyScoped>
  )
}

function OrderSearch({ companyId }: { companyId: string }) {
  const { data } = usePortal()
  const [query, setQuery] = React.useState("")
  const [channel, setChannel] = React.useState("all")
  const [status, setStatus] = React.useState("all")

  const all = data.orders.filter((o) => o.companyId === companyId)
  const q = query.trim().toLowerCase()
  const rows = all
    .filter(
      (o) =>
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.externalId.toLowerCase().includes(q) ||
        customerName(data, o.customerId).toLowerCase().includes(q)
    )
    .filter((o) => channel === "all" || o.channelId === channel)
    .filter((o) => status === "all" || o.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const filtered = q !== "" || channel !== "all" || status !== "all"

  return (
    <PageCard>
      <PageHeader
        title="คำสั่งซื้อ"
        description="คำสั่งซื้อจากทุกช่องทางในที่เดียว กดที่รายการเพื่อดูสินค้า ยอดเงิน และแต้มที่ลูกค้าได้"
      >
        <div className="-mt-2 flex flex-col gap-3 md:flex-row md:flex-wrap">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาเลขที่คำสั่งซื้อ / เลขที่จากช่องทาง / ชื่อลูกค้า"
            className="md:w-[340px]"
          />
          <Select
            value={channel}
            onChange={setChannel}
            prefix="ช่องทาง"
            options={[
              { value: "all", label: "ทั้งหมด" },
              ...data.channels
                .filter((c) => c.companyId === companyId)
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
            className="md:w-[220px]"
          />
          <Select
            value={status}
            onChange={setStatus}
            prefix="สถานะ"
            options={[
              { value: "all", label: "ทั้งหมด" },
              ...(Object.keys(orderStatusLabel) as OrderStatus[]).map((s) => ({
                value: s,
                label: orderStatusLabel[s],
              })),
            ]}
            className="md:w-[180px]"
          />
          {filtered && (
            <Button
              onClick={() => {
                setQuery("")
                setChannel("all")
                setStatus("all")
              }}
            >
              ล้างตัวกรอง
            </Button>
          )}
        </div>
        <p className="-mt-1 text-sm text-content-quiet">
          {filtered ? `พบ ${rows.length} จาก ${all.length} รายการ` : `ทั้งหมด ${all.length} รายการ`}
        </p>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState>
          {all.length === 0
            ? "ยังไม่มีคำสั่งซื้อ — คำสั่งซื้อจะเข้ามาเมื่อช่องทางขายส่งข้อมูลผ่าน API key"
            : "ไม่พบคำสั่งซื้อที่ตรงกับเงื่อนไข"}
        </EmptyState>
      ) : (
        <OrderList orders={rows} />
      )}
    </PageCard>
  )
}
