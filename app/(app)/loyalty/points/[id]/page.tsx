"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { UserCircleDashed } from "@phosphor-icons/react"

import { formatNumber, nowIso } from "@/lib/portal/commerce"
import { type Customer } from "@/lib/portal/data"
import { pointSummary } from "@/lib/portal/loyalty"
import { newId, usePortal } from "@/lib/portal/store"
import { CompanyScoped } from "@/components/portal/shell"
import { PointLedger, PointTiles, TierTag } from "@/components/portal/points"
import {
  BackLink,
  Button,
  EmptyState,
  Field,
  Modal,
  PageCard,
  Select,
  TextInput,
} from "@/components/portal/ui"

export default function CustomerPointsPage() {
  return (
    <CompanyScoped permission="loyalty.read">
      {(companyId) => <CustomerPoints companyId={companyId} />}
    </CompanyScoped>
  )
}

function CustomerPoints({ companyId }: { companyId: string }) {
  const { id } = useParams<{ id: string }>()
  const { data, can } = usePortal()
  const [adjusting, setAdjusting] = React.useState(false)

  // Tenant scoping: a customer from another company is simply not found.
  const customer = data.customers.find(
    (c) => c.id === decodeURIComponent(id) && c.companyId === companyId
  )

  if (!customer) {
    return (
      <PageCard>
        <EmptyState
          icon={UserCircleDashed}
          title="ไม่พบลูกค้ารายนี้"
          action={
            <Link href={`/loyalty/points`} className="text-sm font-medium text-action hover:underline">
              กลับไปหน้าแต้มสะสม
            </Link>
          }
        >
          ลูกค้าอาจอยู่ในบริษัทอื่น ลองเปลี่ยนบริษัทที่แถบด้านบน
        </EmptyState>
      </PageCard>
    )
  }

  const summary = pointSummary(data, companyId, customer.id)

  return (
    <PageCard>
      <BackLink href={`/loyalty/points`}>แต้มสะสม</BackLink>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] leading-[1.25] font-semibold text-content md:text-[30px]">
              แต้มของ {customer.name}
            </h1>
            <TierTag tier={summary.tier.tier} label={summary.tier.label} />
          </div>
          <p className="mt-1 text-[15px] text-content-secondary">
            รหัส{" "}
            {can("customers.read") ? (
              <Link href={`/customers/${customer.id}`} className="text-action hover:underline">
                {customer.id}
              </Link>
            ) : (
              customer.id
            )}
          </p>
        </div>
        {can("loyalty.write") && (
          <Button variant="primary" onClick={() => setAdjusting(true)}>
            ปรับแต้ม
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <PointTiles summary={summary} />
        <PointLedger entries={summary.entries} />
      </div>

      {adjusting && (
        <AdjustModal customer={customer} available={summary.available} onClose={() => setAdjusting(false)} />
      )}
    </PageCard>
  )
}

function AdjustModal({
  customer,
  available,
  onClose,
}: {
  customer: Customer
  available: number
  onClose: () => void
}) {
  const { setData, user } = usePortal()
  const [direction, setDirection] = React.useState<"add" | "deduct">("add")
  const [amount, setAmount] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [errors, setErrors] = React.useState<{ amount?: string; reason?: string }>({})

  function save() {
    const n = Number(amount)
    const next: typeof errors = {}
    if (!Number.isInteger(n) || n <= 0) next.amount = "กรอกจำนวนแต้มเป็นจำนวนเต็มมากกว่า 0"
    else if (direction === "deduct" && n > available) next.amount = `หักได้ไม่เกิน ${formatNumber(available)} แต้ม`
    if (!reason.trim()) next.reason = "กรุณาระบุเหตุผล"
    setErrors(next)
    if (next.amount || next.reason) return
    setData((d) => ({
      ...d,
      adjustments: [
        ...d.adjustments,
        {
          id: newId("adj"),
          companyId: customer.companyId,
          customerId: customer.id,
          points: direction === "add" ? n : -n,
          reason: reason.trim(),
          createdAt: nowIso(),
          by: user?.email ?? "",
        },
      ],
    }))
    onClose()
  }

  return (
    <Modal
      open
      width={440}
      title="ปรับแต้ม"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={save}>
            บันทึก
          </Button>
        </>
      }
    >
      <p className="text-sm text-content-secondary">
        {customer.name} · แต้มใช้ได้ {formatNumber(available)} แต้ม
      </p>
      <Field label="ประเภท">
        <Select
          value={direction}
          onChange={(v) => setDirection(v as "add" | "deduct")}
          options={[
            { value: "add", label: "เพิ่มแต้ม" },
            { value: "deduct", label: "หักแต้ม" },
          ]}
        />
      </Field>
      <Field label="จำนวนแต้ม" required error={errors.amount}>
        <TextInput
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        />
      </Field>
      <Field label="เหตุผล" required error={errors.reason} hint="แสดงในประวัติแต้มของลูกค้า">
        <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  )
}
