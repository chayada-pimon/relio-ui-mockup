"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Coins, Receipt, Storefront, UserCircleDashed, X } from "@phosphor-icons/react"

import { formatBaht, orderTotal, type Order } from "@/lib/portal/commerce"
import {
  duplicatesOf,
  formatDate,
  today,
  maskEmail,
  maskPhone,
  pairKey,
  type Customer,
} from "@/lib/portal/data"
import { pointSummary } from "@/lib/portal/loyalty"
import { usePortal } from "@/lib/portal/store"
import { Forbidden } from "@/components/portal/shell"
import { CompareModal } from "@/components/portal/merge"
import { OrderList } from "@/components/portal/orders"
import { PointLedger, PointTiles, TierTag } from "@/components/portal/points"
import {
  Alert,
  BackLink,
  Button,
  DescList,
  EmptyState,
  Modal,
  PageCard,
  StatTile,
  Table,
  Tabs,
  Td,
  Th,
} from "@/components/portal/ui"

const tabs = [
  { key: "general", label: "ข้อมูลทั่วไป" },
  { key: "channels", label: "ช่องทางการซื้อ" },
  { key: "orders", label: "คำสั่งซื้อ" },
  { key: "points", label: "คะแนน" },
  { key: "pdpa", label: "ความยินยอม PDPA" },
] as const

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data, session, can } = usePortal()
  const [tab, setTab] = React.useState<(typeof tabs)[number]["key"]>("general")
  const [bannerHidden, setBannerHidden] = React.useState(false)
  const [comparing, setComparing] = React.useState<[Customer, Customer] | null>(null)
  const [noPair, setNoPair] = React.useState(false)

  if (!can("customers.read")) return <Forbidden />

  // Tenant scoping: a customer from another company is simply not found.
  const customer = data.customers.find(
    (c) => c.id === decodeURIComponent(id) && c.companyId === session?.currentCompanyId
  )

  if (!customer) {
    return (
      <PageCard>
        <EmptyState
          icon={UserCircleDashed}
          title="ไม่พบลูกค้ารายนี้"
          action={
            <Link href={`/customers`} className="text-sm font-medium text-action hover:underline">
              กลับไปหน้ารายชื่อลูกค้า
            </Link>
          }
        >
          ลูกค้าอาจอยู่ในบริษัทอื่น ลองเปลี่ยนบริษัทที่แถบด้านบน
        </EmptyState>
      </PageCard>
    )
  }

  const duplicates = duplicatesOf(data, customer)
  const compareWith = (other: Customer) => setComparing([customer, other])

  const rows = [
    { label: "ชื่อ-นามสกุล", value: customer.name },
    { label: "เบอร์โทร", value: maskPhone(customer.phone) },
    { label: "อีเมล", value: maskEmail(customer.email) },
    { label: "สร้างเมื่อ", value: formatDate(customer.createdAt) },
  ]

  const orders = customerOrders(data.orders, customer)
  const sales = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned")
  const channelCount = new Set(orders.map((o) => o.channelId)).size
  const points = can("loyalty.read") ? pointSummary(data, customer.companyId, customer.id) : null

  return (
    <PageCard>
      <BackLink href={`/customers`}>รายชื่อลูกค้า</BackLink>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <span
          aria-hidden
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-crm-soft text-lg font-semibold text-crm-on-soft"
        >
          {customer.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] leading-[1.25] font-semibold">{customer.name}</h1>
            {points && <TierTag tier={points.tier.tier} label={points.tier.label} />}
          </div>
          <p className="mt-0.5 text-sm text-content-secondary">
            รหัส {customer.id} · ลูกค้าตั้งแต่ {formatDate(customer.createdAt)}
          </p>
        </div>
        {can("customers.merge") && (
          <Button
            className="sm:ml-auto"
            onClick={() => (duplicates[0] ? compareWith(duplicates[0]) : setNoPair(true))}
          >
            รวมบัญชี
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="ยอดซื้อรวม"
          value={formatBaht(sales.reduce((sum, o) => sum + orderTotal(o), 0))}
          note="ไม่รวมที่ยกเลิก/คืนสินค้า"
          icon={Receipt}
          context="oms"
        />
        <StatTile label="คำสั่งซื้อ" value={orders.length} note="ทุกสถานะ" icon={Receipt} context="oms" />
        <StatTile label="ช่องทางที่ซื้อ" value={channelCount} note="ช่องทาง" icon={Storefront} />
        {points && (
          <StatTile
            label="แต้มใช้ได้"
            value={points.available.toLocaleString("th-TH")}
            note={points.pending ? `รอยืนยันอีก ${points.pending} แต้ม` : "แต้ม"}
            icon={Coins}
            context="crm"
          />
        )}
      </div>

      {duplicates.length > 0 && !bannerHidden && (
        <Alert
          type="warning"
          className="mt-4 items-center"
          action={
            <>
              <Button size="sm" onClick={() => compareWith(duplicates[0])}>
                ดูและเปรียบเทียบ
              </Button>
              <NotSameButton customer={customer} other={duplicates[0]} />
              <button
                type="button"
                aria-label="ปิดการแจ้งเตือน"
                onClick={() => setBannerHidden(true)}
                className="inline-flex size-9 items-center justify-center rounded-sm text-content-quiet hover:bg-hover hover:text-content"
              >
                <X size={16} />
              </button>
            </>
          }
        >
          พบข้อมูลที่อาจเป็นลูกค้าคนเดียวกัน {duplicates.length} รายการ
        </Alert>
      )}

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mt-6" />

      <div className="mt-4">
        {tab === "general" && <DescList rows={rows} />}
        {tab === "channels" && <ChannelsTab customer={customer} />}
        {tab === "orders" && <OrdersTab customer={customer} />}
        {tab === "points" && <PointsTab customer={customer} />}
        {tab === "pdpa" && <ConsentTab customer={customer} />}
      </div>

      <CompareModal pair={comparing} onClose={() => setComparing(null)} />
      <Modal
        open={noPair}
        title="รวมบัญชี"
        width={420}
        onClose={() => setNoPair(false)}
        footer={<Button onClick={() => setNoPair(false)}>ปิด</Button>}
      >
        <p className="text-sm text-content-secondary">
          ยังไม่พบบัญชีที่อาจเป็นลูกค้าคนเดียวกัน — เลือกลูกค้า 2 รายการจากหน้ารายชื่อลูกค้าเพื่อรวมบัญชี
          หน้ารวมบัญชีแบบเต็มยังอยู่ระหว่างพัฒนา (CRM-22)
        </p>
      </Modal>
    </PageCard>
  )
}

function NotSameButton({ customer, other }: { customer: Customer; other: Customer }) {
  const { setData } = usePortal()
  return (
    <Button
      size="sm"
      onClick={() =>
        setData((d) => ({
          ...d,
          notDuplicate: [...d.notDuplicate, pairKey(customer.id, other.id)],
        }))
      }
    >
      ไม่ใช่คนเดียวกัน
    </Button>
  )
}

function customerOrders(orders: Order[], customer: Customer) {
  return orders
    .filter((o) => o.customerId === customer.id && o.companyId === customer.companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function ChannelsTab({ customer }: { customer: Customer }) {
  const { data } = usePortal()
  const orders = customerOrders(data.orders, customer)
  const channels = data.channels
    .filter((ch) => orders.some((o) => o.channelId === ch.id))
    .map((ch) => {
      const own = orders.filter((o) => o.channelId === ch.id)
      const counted = own.filter((o) => o.status !== "cancelled" && o.status !== "returned")
      return {
        ch,
        count: own.length,
        spend: counted.reduce((s, o) => s + orderTotal(o), 0),
        last: own[0].createdAt,
      }
    })
    .sort((a, b) => b.last.localeCompare(a.last))

  if (channels.length === 0) return <EmptyState>ลูกค้ารายนี้ยังไม่มีคำสั่งซื้อจากช่องทางใด</EmptyState>
  return (
    <>
      <p className="mb-3 text-sm text-content-secondary">
        ลูกค้า 1 คน · {orders.length} คำสั่งซื้อ · {channels.length} ช่องทาง
      </p>
      <Table>
        <thead>
          <tr>
            <Th>ช่องทาง</Th>
            <Th className="text-right">คำสั่งซื้อ</Th>
            <Th className="text-right">ยอดซื้อ</Th>
            <Th>ซื้อล่าสุด</Th>
          </tr>
        </thead>
        <tbody>
          {channels.map(({ ch, count, spend, last }) => (
            <tr key={ch.id}>
              <Td>{ch.name}</Td>
              <Td className="text-right tabular-nums">{count}</Td>
              <Td className="text-right tabular-nums">{formatBaht(spend)}</Td>
              <Td>{formatDate(last)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-3 text-xs text-content-quiet">ยอดซื้อไม่รวมคำสั่งซื้อที่ยกเลิกหรือคืนสินค้า</p>
    </>
  )
}

function OrdersTab({ customer }: { customer: Customer }) {
  const { data, can } = usePortal()
  if (!can("orders.read")) return <EmptyState>บัญชีของคุณไม่มีสิทธิ์ดูคำสั่งซื้อ</EmptyState>
  const orders = customerOrders(data.orders, customer)
  if (orders.length === 0) return <EmptyState>ยังไม่มีคำสั่งซื้อ</EmptyState>
  return <OrderList orders={orders} hideCustomer />
}

function PointsTab({ customer }: { customer: Customer }) {
  const { data, can } = usePortal()
  if (!can("loyalty.read")) return <EmptyState>บัญชีของคุณไม่มีสิทธิ์ดูแต้มสะสม</EmptyState>
  const summary = pointSummary(data, customer.companyId, customer.id)
  return (
    <div className="flex flex-col gap-4">
      <PointTiles summary={summary} />
      <PointLedger entries={summary.entries} />
    </div>
  )
}

function ConsentTab({ customer }: { customer: Customer }) {
  const { setData, can } = usePortal()
  const consent = customer.consent
  const toggle = () =>
    setData((d) => ({
      ...d,
      customers: d.customers.map((c) =>
        c.id === customer.id
          ? {
              ...c,
              consent: { marketing: !consent?.marketing, updatedAt: today(), source: "Admin Portal" },
            }
          : c
      ),
    }))

  return (
    <div className="flex flex-col gap-4">
      <DescList
        rows={[
          {
            label: "รับข่าวสารและโปรโมชัน",
            value: consent ? (consent.marketing ? "ยินยอม" : "ไม่ยินยอม") : "ยังไม่ได้ให้ความยินยอม",
          },
          { label: "บันทึกจาก", value: consent?.source ?? "-" },
          { label: "อัปเดตล่าสุด", value: consent ? formatDate(consent.updatedAt) : "-" },
        ]}
      />
      {can("customers.write") && (
        <div>
          <Button onClick={toggle}>
            {consent?.marketing ? "บันทึกการถอนความยินยอม" : "บันทึกความยินยอม"}
          </Button>
        </div>
      )}
      <p className="text-xs text-content-quiet">
        ทุกการเปลี่ยนแปลงความยินยอมถูกบันทึกไว้ เพื่อตรวจสอบย้อนหลังตาม PDPA
      </p>
    </div>
  )
}
