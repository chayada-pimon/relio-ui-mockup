"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowsMerge,
  Check,
  CheckCircle,
  Prohibit,
  WarningCircle,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang } from "@/lib/relio/i18n"
import {
  customerStats,
  getCustomer,
  maskEmail,
  maskPhone,
  mergeCandidates,
  type MergeCandidate,
} from "@/lib/relio/data"
import type { Text } from "@/lib/relio/dashboard"
import {
  Avatar,
  Button,
  Card,
  PageHeader,
  StatusChip,
  channelLabel,
} from "@/components/relio/ui"

const c = {
  title: { th: "รวมโปรไฟล์ลูกค้าซ้ำ", en: "Merge duplicate customers" },
  sub: {
    th: "ระบบพบข้อมูลจากช่องทางขายที่น่าจะเป็นลูกค้าคนเดิม ตรวจแล้วเลือกว่าจะรวมหรือแยกไว้",
    en: "These channel records look like existing customers. Check each one, then merge or keep it separate.",
  },
  back: { th: "กลับไปหน้าลูกค้า", en: "Back to customers" },
  left: { th: "รอตัดสินใจ {n} รายการ", en: "{n} left to review" },
  whatHappens: {
    th: "เมื่อรวม ออเดอร์และคะแนนจากช่องทางนั้นจะย้ายเข้าโปรไฟล์หลัก และออเดอร์ใหม่จะเข้าโปรไฟล์นี้อัตโนมัติ",
    en: "Merging moves the record's orders and points to the main profile. New orders from it will join automatically.",
  },
  high: { th: "ตรงกันสูง", en: "Strong match" },
  medium: { th: "ควรตรวจสอบ", en: "Check carefully" },
  matchPhone: { th: "เบอร์โทรตรงกัน", en: "Same phone" },
  matchEmail: { th: "อีเมลตรงกัน", en: "Same email" },
  matchName: { th: "ชื่อคล้ายกัน", en: "Similar name" },
  field: { th: "ข้อมูล", en: "Field" },
  profile: { th: "โปรไฟล์ใน RELIO", en: "RELIO profile" },
  from: { th: "จาก {ch}", en: "From {ch}" },
  name: { th: "ชื่อ", en: "Name" },
  phone: { th: "เบอร์โทร", en: "Phone" },
  email: { th: "อีเมล", en: "Email" },
  city: { th: "จังหวัด", en: "Province" },
  same: { th: "ตรงกัน", en: "Same" },
  keep: { th: "ใช้ค่านี้", en: "Keep this" },
  pickHint: {
    th: "ข้อมูลที่ต่างกัน เลือกค่าที่จะเก็บไว้ในโปรไฟล์หลัก",
    en: "Where values differ, choose which one the main profile keeps.",
  },
  orders: { th: "ออเดอร์", en: "orders" },
  firstSeen: { th: "พบครั้งแรก", en: "First seen" },
  afterMerge: { th: "หลังรวม", en: "After merging" },
  merge: { th: "รวมโปรไฟล์", en: "Merge" },
  separate: { th: "ไม่ใช่คนเดียวกัน", en: "Not the same person" },
  merged: { th: "รวมเข้า {name} แล้ว", en: "Merged into {name}" },
  kept: { th: "แยกไว้เป็นลูกค้าคนละคน", en: "Kept as a separate customer" },
  undo: { th: "เลิกทำ", en: "Undo" },
  allDone: {
    th: "ตัดสินใจครบทุกรายการแล้ว ระบบจะแจ้งเมื่อพบรายการใหม่",
    en: "All reviewed. We will let you know when new matches come in.",
  },
  empty: { th: "—", en: "—" },
} satisfies Record<string, Text>

type Key = keyof typeof c
type FieldKey = "name" | "phone" | "email" | "city"
type Decision = "merged" | "kept"

const fields: FieldKey[] = ["name", "phone", "email", "city"]
const matchLabel: Record<MergeCandidate["matchedOn"][number], Key> = {
  phone: "matchPhone",
  email: "matchEmail",
  name: "matchName",
}

const norm = (k: FieldKey, v: string) =>
  k === "phone" ? v.replace(/\D/g, "") : v.trim().toLowerCase()

export default function MergePage() {
  const { lang, t, money, date } = useLang()
  const l = (k: Key) => c[k][lang]

  const [decisions, setDecisions] = React.useState<Record<string, Decision>>({})
  const [picks, setPicks] = React.useState<Record<string, Partial<Record<FieldKey, "profile" | "record">>>>({})
  const [busy, setBusy] = React.useState<string | null>(null)

  const list = [...mergeCandidates].sort((a, b) =>
    a.confidence === b.confidence ? 0 : a.confidence === "high" ? -1 : 1
  )
  const remaining = list.filter((m) => !decisions[m.id]).length

  function decide(id: string, d: Decision) {
    setBusy(id)
    window.setTimeout(() => {
      setBusy(null)
      setDecisions((s) => ({ ...s, [id]: d }))
    }, 600)
  }

  function undo(id: string) {
    setDecisions((s) => {
      const next = { ...s }
      delete next[id]
      return next
    })
  }

  const show = (k: FieldKey, value: string) =>
    !value ? l("empty") : k === "phone" ? maskPhone(value) : k === "email" ? maskEmail(value) : value

  return (
    <>
      <PageHeader
        title={l("title")}
        description={l("sub")}
        back={
          <Link
            href="/customers"
            className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-content-secondary hover:text-content"
          >
            <ArrowLeft size={18} aria-hidden />
            {l("back")}
          </Link>
        }
        actions={
          remaining > 0 && (
            <StatusChip tone="warning" icon={WarningCircle}>
              {l("left").replace("{n}", String(remaining))}
            </StatusChip>
          )
        }
      />

      <p className="mb-5 flex items-start gap-3 rounded-lg bg-crm-soft px-4 py-3 text-sm text-crm-on-soft">
        <ArrowsMerge size={20} aria-hidden className="mt-0.5 shrink-0" />
        {l("whatHappens")}
      </p>

      {remaining === 0 && (
        <p
          role="status"
          className="mb-5 flex items-center gap-2 rounded-lg bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          <CheckCircle size={20} weight="fill" aria-hidden />
          {l("allDone")}
        </p>
      )}

      <ul className="flex flex-col gap-5">
        {list.map((m) => {
          const cu = getCustomer(m.customerId)
          if (!cu) return null
          const decision = decisions[m.id]
          const ch = c.from[lang].replace("{ch}", m.record.store ?? t(channelLabel[m.record.channel]))
          const stats = customerStats(cu.id)

          if (decision) {
            return (
              <li key={m.id}>
                <Card className="flex flex-wrap items-center gap-3 py-4">
                  {decision === "merged" ? (
                    <CheckCircle size={20} weight="fill" aria-hidden className="text-success" />
                  ) : (
                    <Prohibit size={20} aria-hidden className="text-content-quiet" />
                  )}
                  <p className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{m.record.name}</span>{" "}
                    <span className="text-content-secondary">
                      ·{" "}
                      {decision === "merged"
                        ? l("merged").replace("{name}", cu.name)
                        : l("kept")}
                    </span>
                  </p>
                  <Button variant="tertiary" icon={ArrowCounterClockwise} onClick={() => undo(m.id)}>
                    {l("undo")}
                  </Button>
                </Card>
              </li>
            )
          }

          const values = {
            profile: { name: cu.name, phone: cu.phone, email: cu.email, city: cu.city },
            record: {
              name: m.record.name,
              phone: m.record.phone,
              email: m.record.email,
              city: m.record.city,
            },
          }
          const differs = (k: FieldKey) =>
            Boolean(values.record[k]) && norm(k, values.profile[k]) !== norm(k, values.record[k])
          const anyDiff = fields.some(differs)

          return (
            <li key={m.id}>
              <Card className="p-0">
                <div className="flex flex-wrap items-center gap-2 px-6 pt-5 pb-4">
                  <h2 className="mr-2 flex items-center gap-3 text-base leading-[1.4] font-semibold">
                    <Avatar name={cu.name} size={32} />
                    {cu.name}
                  </h2>
                  <StatusChip
                    tone={m.confidence === "high" ? "success" : "warning"}
                    icon={m.confidence === "high" ? CheckCircle : WarningCircle}
                  >
                    {l(m.confidence)}
                  </StatusChip>
                  {m.matchedOn.map((k) => (
                    <StatusChip key={k} tone="neutral">
                      {l(matchLabel[k])}
                    </StatusChip>
                  ))}
                  <span className="tabular ml-auto text-xs text-content-quiet">{m.id}</span>
                </div>

                <div role="table" aria-label={`${cu.name} · ${ch}`} className="border-y border-line text-sm">
                  <div
                    role="row"
                    className="hidden grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] bg-raised text-xs text-content-secondary sm:grid"
                  >
                    <span role="columnheader" className="px-6 py-2.5 font-medium">{l("field")}</span>
                    <span role="columnheader" className="px-3 py-2.5 font-medium">{l("profile")}</span>
                    <span role="columnheader" className="px-3 py-2.5 font-medium">{ch}</span>
                  </div>
                  {fields.map((k) => {
                    const diff = differs(k)
                    const pick = picks[m.id]?.[k] ?? "profile"
                    const group = `${m.id}-${k}`
                    const cell = (side: "profile" | "record") => {
                      const val = values[side][k]
                      if (!diff)
                        return (
                          <span className="tabular flex min-h-11 items-center gap-2 px-3 break-all">
                            {show(k, val)}
                            {side === "record" && val && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                                <Check size={14} weight="bold" aria-hidden />
                                {l("same")}
                              </span>
                            )}
                          </span>
                        )
                      return (
                        <label
                          className={cn(
                            "mx-1.5 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-1.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]",
                            pick === side ? "border-crm bg-crm-soft" : "border-transparent hover:bg-hover"
                          )}
                        >
                          <input
                            type="radio"
                            name={group}
                            checked={pick === side}
                            onChange={() =>
                              setPicks((s) => ({ ...s, [m.id]: { ...s[m.id], [k]: side } }))
                            }
                            className="size-4 shrink-0 accent-crm-graphic"
                          />
                          <span className="tabular min-w-0 break-all">
                            <span className="sm:hidden text-xs text-content-quiet">
                              {side === "profile" ? l("profile") : ch}:{" "}
                            </span>
                            {show(k, val)}
                          </span>
                          <span className="sr-only">{l("keep")}</span>
                        </label>
                      )
                    }
                    return (
                      <div
                        key={k}
                        role="row"
                        className="grid grid-cols-1 gap-1 border-t border-line py-2 first:border-t-0 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-0 sm:py-1"
                      >
                        <span role="rowheader" className="px-6 text-xs font-medium text-content-secondary sm:text-sm sm:font-normal">
                          {l(k)}
                        </span>
                        <span role="cell">{cell("profile")}</span>
                        <span role="cell" className={cn(!diff && "hidden sm:block")}>{cell("record")}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-col gap-4 px-6 py-5">
                  {anyDiff && <p className="text-xs text-content-quiet">{l("pickHint")}</p>}
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-md bg-raised p-3">
                      <dt className="text-xs text-content-quiet">{l("profile")}</dt>
                      <dd className="tabular font-medium">
                        {stats.orders} {l("orders")} · {money(stats.spent)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-raised p-3">
                      <dt className="text-xs text-content-quiet">
                        {ch} · {l("firstSeen")} {date(m.record.firstSeen)}
                      </dt>
                      <dd className="tabular font-medium">
                        {m.record.orders} {l("orders")} · {money(m.record.spent)}
                      </dd>
                    </div>
                    <div className="rounded-md bg-crm-soft p-3 text-crm-on-soft">
                      <dt className="text-xs">{l("afterMerge")}</dt>
                      <dd className="tabular font-semibold">
                        {stats.orders + m.record.orders} {l("orders")} ·{" "}
                        {money(stats.spent + m.record.spent)}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      icon={Prohibit}
                      disabled={busy === m.id}
                      onClick={() => decide(m.id, "kept")}
                    >
                      {l("separate")}
                    </Button>
                    <Button
                      variant="primary"
                      icon={ArrowsMerge}
                      loading={busy === m.id}
                      onClick={() => decide(m.id, "merged")}
                    >
                      {l("merge")}
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
    </>
  )
}
