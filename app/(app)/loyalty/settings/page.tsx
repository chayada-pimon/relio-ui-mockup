"use client"

import * as React from "react"

import { defaultTiers, formatNumber, type LoyaltySettings } from "@/lib/portal/commerce"
import { formatDate, today } from "@/lib/portal/data"
import { loyaltyOf, pointsFor } from "@/lib/portal/loyalty"
import { usePortal } from "@/lib/portal/store"
import { CompanyScoped } from "@/components/portal/shell"
import { TierTag } from "@/components/portal/points"
import {
  Alert,
  Button,
  Field,
  PageCard,
  PageHeader,
  Table,
  Td,
  TextInput,
  Th,
} from "@/components/portal/ui"

export default function LoyaltySettingsPage() {
  return (
    <CompanyScoped permission="loyalty.read">
      {(companyId) => <SettingsForm companyId={companyId} />}
    </CompanyScoped>
  )
}

type Draft = {
  tiers: { rate: string; minSpend: string }[]
  confirmDays: string
  expiryMonths: string
  expiryNoticeDays: string
}

function toDraft(s: LoyaltySettings): Draft {
  return {
    tiers: s.tiers.map((t) => ({ rate: String(t.rate), minSpend: String(t.minSpend) })),
    confirmDays: String(s.confirmDays),
    expiryMonths: String(s.expiryMonths),
    expiryNoticeDays: String(s.expiryNoticeDays),
  }
}

const digits = (v: string) => v.replace(/\D/g, "")

function SettingsForm({ companyId }: { companyId: string }) {
  const { data, setData, can } = usePortal()
  const saved = loyaltyOf(data, companyId)
  const editable = can("loyalty.write")
  const [draft, setDraft] = React.useState(() => toDraft(saved))
  const [errors, setErrors] = React.useState<string[]>([])
  const [notice, setNotice] = React.useState("")

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(saved))
  const setTier = (i: number, key: "rate" | "minSpend", value: string) => {
    setNotice("")
    setDraft((d) => ({
      ...d,
      tiers: d.tiers.map((t, j) => (j === i ? { ...t, [key]: digits(value) } : t)),
    }))
  }
  const setField = (key: "confirmDays" | "expiryMonths" | "expiryNoticeDays", value: string) => {
    setNotice("")
    setDraft((d) => ({ ...d, [key]: digits(value) }))
  }

  function save() {
    const tiers = saved.tiers.map((t, i) => ({
      ...t,
      rate: Number(draft.tiers[i].rate),
      minSpend: i === 0 ? 0 : Number(draft.tiers[i].minSpend),
    }))
    const problems: string[] = []
    if (tiers.some((t) => !t.rate)) problems.push("อัตราบาทต่อแต้มต้องมากกว่า 0 ทุกระดับ")
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].minSpend <= tiers[i - 1].minSpend)
        problems.push(`ยอดซื้อขั้นต่ำของ ${tiers[i].label} ต้องมากกว่า ${tiers[i - 1].label}`)
      if (tiers[i].rate > tiers[i - 1].rate)
        problems.push(`${tiers[i].label} ควรได้แต้มเร็วกว่า ${tiers[i - 1].label} (บาทต่อแต้มน้อยกว่าหรือเท่ากัน)`)
    }
    const confirmDays = Number(draft.confirmDays)
    const expiryMonths = Number(draft.expiryMonths)
    const expiryNoticeDays = Number(draft.expiryNoticeDays)
    if (draft.confirmDays === "") problems.push("กรุณากรอกจำนวนวันรอยืนยันแต้ม")
    if (!expiryMonths) problems.push("อายุแต้มต้องอย่างน้อย 1 เดือน")
    if (!expiryNoticeDays) problems.push("ช่วงแจ้งเตือนแต้มหมดอายุต้องอย่างน้อย 1 วัน")
    setErrors(problems)
    if (problems.length) return

    const next: LoyaltySettings = {
      companyId,
      tiers,
      confirmDays,
      expiryMonths,
      expiryNoticeDays,
      updatedAt: today(),
    }
    setData((d) => ({
      ...d,
      loyalty: [...d.loyalty.filter((l) => l.companyId !== companyId), next],
    }))
    setDraft(toDraft(next))
    setNotice("บันทึกแล้ว — กติกาใหม่ใช้คำนวณแต้มทันที")
  }

  const example = 274
  return (
    <PageCard>
      <PageHeader
        title="กติกาแต้ม"
        description="กำหนดว่าลูกค้าได้แต้มเท่าไร เลื่อนระดับเมื่อไร และแต้มหมดอายุเมื่อไร"
        extra={
          editable && (
            <div className="flex gap-2">
              <Button
                disabled={!dirty}
                onClick={() => {
                  setDraft(toDraft(saved))
                  setErrors([])
                }}
              >
                ยกเลิก
              </Button>
              <Button variant="primary" disabled={!dirty} onClick={save}>
                บันทึก
              </Button>
            </div>
          )
        }
      >
        <p className="-mt-2 text-sm text-content-quiet">
          ใช้กับบริษัทที่เลือกด้านบนเท่านั้น · แก้ไขล่าสุด {formatDate(saved.updatedAt)}
        </p>
        {!editable && (
          <Alert type="info">บัญชีของคุณดูได้อย่างเดียว ต้องมีสิทธิ์ “ตั้งค่ากติกาแต้ม” จึงจะแก้ไขได้</Alert>
        )}
        {errors.length > 0 && (
          <Alert type="error">
            <ul className="list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        )}
        {notice && <Alert type="info">{notice}</Alert>}
      </PageHeader>

      <h2 className="mb-3 text-base font-semibold">ระดับสมาชิก</h2>
      <Table>
        <thead>
          <tr>
            <Th>ระดับ</Th>
            <Th>อัตราได้แต้ม (บาท = 1 แต้ม)</Th>
            <Th>ยอดซื้อสะสม 12 เดือน (บาท)</Th>
            <Th>ตัวอย่าง: ซื้อ {example} บาท</Th>
          </tr>
        </thead>
        <tbody>
          {saved.tiers.map((t, i) => {
            const rate = Number(draft.tiers[i].rate)
            return (
              <tr key={t.tier}>
                <Td>
                  <TierTag tier={t.tier} label={t.label} />
                </Td>
                <Td>
                  <TextInput
                    aria-label={`อัตราได้แต้ม ${t.label}`}
                    inputMode="numeric"
                    disabled={!editable}
                    value={draft.tiers[i].rate}
                    onChange={(e) => setTier(i, "rate", e.target.value)}
                    className="w-28"
                  />
                </Td>
                <Td>
                  {i === 0 ? (
                    <span className="text-content-quiet">เริ่มต้น (สมาชิกใหม่)</span>
                  ) : (
                    <TextInput
                      aria-label={`ยอดซื้อขั้นต่ำ ${t.label}`}
                      inputMode="numeric"
                      disabled={!editable}
                      value={draft.tiers[i].minSpend}
                      onChange={(e) => setTier(i, "minSpend", e.target.value)}
                      className="w-36"
                    />
                  )}
                </Td>
                <Td className="text-content-secondary">
                  {rate ? `${formatNumber(pointsFor(example, { ...t, rate }))} แต้ม` : "-"}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
      <p className="mt-2 text-xs text-content-quiet">
        แต้มคิดจากยอดหลังหักส่วนลด ไม่รวมค่าส่ง ปัดเศษทิ้ง · ค่าเริ่มต้น{" "}
        {defaultTiers.map((t) => `${t.label} ${t.rate} บาท`).join(" / ")}
      </p>

      <h2 className="mt-6 mb-3 text-base font-semibold">กติกาแต้ม</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="รอยืนยันแต้ม (วัน)" hint="นับจากคำสั่งซื้อสำเร็จ เผื่อกรณีคืนสินค้า">
          <TextInput
            inputMode="numeric"
            disabled={!editable}
            value={draft.confirmDays}
            onChange={(e) => setField("confirmDays", e.target.value)}
          />
        </Field>
        <Field label="อายุแต้ม (เดือน)" hint="นับจากวันที่ได้แต้ม">
          <TextInput
            inputMode="numeric"
            disabled={!editable}
            value={draft.expiryMonths}
            onChange={(e) => setField("expiryMonths", e.target.value)}
          />
        </Field>
        <Field label="แจ้งเตือนก่อนหมดอายุ (วัน)" hint="แสดงรายชื่อลูกค้าในหน้าแต้มสะสม">
          <TextInput
            inputMode="numeric"
            disabled={!editable}
            value={draft.expiryNoticeDays}
            onChange={(e) => setField("expiryNoticeDays", e.target.value)}
          />
        </Field>
      </div>
    </PageCard>
  )
}
