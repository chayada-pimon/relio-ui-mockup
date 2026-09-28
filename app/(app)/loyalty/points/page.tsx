"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { formatBaht, formatNumber } from "@/lib/portal/commerce"
import { formatDate, matchesSearch, type Customer } from "@/lib/portal/data"
import { loyaltyOf, pointSummary, type PointSummary } from "@/lib/portal/loyalty"
import { usePortal } from "@/lib/portal/store"
import { CompanyScoped } from "@/components/portal/shell"
import { TierTag } from "@/components/portal/points"
import {
  Alert,
  Button,
  EmptyState,
  MobileCard,
  PageCard,
  PageHeader,
  SearchBox,
  Select,
  Table,
  Td,
  Th,
} from "@/components/portal/ui"

export default function PointsPage() {
  return (
    <CompanyScoped permission="loyalty.read">
      {(companyId) => <PointBalances companyId={companyId} />}
    </CompanyScoped>
  )
}

type Row = { customer: Customer; summary: PointSummary }

function PointBalances({ companyId }: { companyId: string }) {
  const { data } = usePortal()
  const settings = loyaltyOf(data, companyId)
  const [query, setQuery] = React.useState("")
  const [tier, setTier] = React.useState("all")
  const [expiringOnly, setExpiringOnly] = React.useState("all")
  const router = useRouter()
  const open = (c: Customer) => router.push(`/loyalty/points/${c.id}`)

  const all: Row[] = data.customers
    .filter((c) => c.companyId === companyId)
    .map((customer) => ({ customer, summary: pointSummary(data, companyId, customer.id) }))
  const expiring = all.filter((r) => r.summary.expiringSoon > 0)
  const rows = all
    .filter((r) => matchesSearch(r.customer, query))
    .filter((r) => tier === "all" || r.summary.tier.tier === tier)
    .filter((r) => expiringOnly === "all" || r.summary.expiringSoon > 0)
    .sort((a, b) => b.summary.available - a.summary.available)

  return (
    <PageCard>
      <PageHeader
        title="แต้มสะสม"
        description="แต้มคงเหลือและระดับสมาชิกของลูกค้าแต่ละคน กดที่ชื่อเพื่อดูประวัติแต้มหรือปรับแต้ม"
      >
        {expiring.length > 0 && (
          <Alert
            type="warning"
            className="items-center"
            action={
              <Button size="sm" onClick={() => setExpiringOnly("soon")}>
                ดูรายชื่อ
              </Button>
            }
          >
            ลูกค้า {expiring.length} รายมีแต้มจะหมดอายุภายใน {settings.expiryNoticeDays} วัน รวม{" "}
            {formatNumber(expiring.reduce((s, r) => s + r.summary.expiringSoon, 0))} แต้ม
          </Alert>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาชื่อ / เบอร์โทร / อีเมล / รหัสลูกค้า"
            className="md:w-[320px]"
          />
          <Select
            value={tier}
            onChange={setTier}
            prefix="ระดับ"
            options={[
              { value: "all", label: "ทั้งหมด" },
              ...settings.tiers.map((t) => ({ value: t.tier, label: t.label })),
            ]}
            className="md:w-[180px]"
          />
          <Select
            value={expiringOnly}
            onChange={setExpiringOnly}
            prefix="หมดอายุ"
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "soon", label: `ภายใน ${settings.expiryNoticeDays} วัน` },
            ]}
            className="md:w-[200px]"
          />
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState>{all.length === 0 ? "ยังไม่มีลูกค้าในบริษัทนี้" : "ไม่พบลูกค้าที่ตรงกับเงื่อนไข"}</EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>ลูกค้า</Th>
                  <Th>ระดับ</Th>
                  <Th className="text-right">ยอดซื้อ 12 เดือน</Th>
                  <Th className="text-right">ใช้ได้</Th>
                  <Th className="text-right">รอยืนยัน</Th>
                  <Th>ใกล้หมดอายุ</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ customer, summary }) => (
                  <tr
                    key={customer.id}
                    onClick={() => open(customer)}
                    className="cursor-pointer hover:bg-hover"
                  >
                    <Td>
                      {customer.name}
                      <span className="block text-xs text-content-quiet">{customer.id}</span>
                    </Td>
                    <Td>
                      <TierTag tier={summary.tier.tier} label={summary.tier.label} />
                    </Td>
                    <Td className="text-right tabular-nums">{formatBaht(summary.spend12m)}</Td>
                    <Td className="text-right font-medium tabular-nums">
                      {formatNumber(summary.available)}
                    </Td>
                    <Td className="text-right tabular-nums">{formatNumber(summary.pending)}</Td>
                    <Td>
                      {summary.expiringSoon > 0
                        ? `${formatNumber(summary.expiringSoon)} แต้ม · ${formatDate(summary.expiringOn!)}`
                        : "-"}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map(({ customer, summary }) => (
              <MobileCard key={customer.id} onClick={() => open(customer)}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{customer.name}</span>
                  <TierTag tier={summary.tier.tier} label={summary.tier.label} />
                </div>
                <p className="mt-1 text-content-secondary">
                  ใช้ได้ {formatNumber(summary.available)} · รอยืนยัน {formatNumber(summary.pending)}
                </p>
                {summary.expiringSoon > 0 && (
                  <p className="mt-1 text-warning">
                    หมดอายุ {formatNumber(summary.expiringSoon)} แต้ม วันที่{" "}
                    {formatDate(summary.expiringOn!)}
                  </p>
                )}
              </MobileCard>
            ))}
          </div>
        </>
      )}
    </PageCard>
  )
}
