"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  FloppyDisk,
  Megaphone,
  Users,
  WarningCircle,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang } from "@/lib/relio/i18n"
import { nearUpgrade, plan, type Text } from "@/lib/relio/dashboard"
import { TIER_RULES } from "@/lib/relio/loyalty"
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  PageHeader,
  inputClass,
} from "@/components/relio/ui"

const c = {
  title: { th: "สร้างกลุ่มเป้าหมาย", en: "Create segment" },
  sub: {
    th: "รวมลูกค้าที่ใกล้ถึงเกณฑ์ Tier ถัดไป เพื่อส่งข้อความหรือทำแคมเปญกระตุ้นให้ซื้อเพิ่ม",
    en: "Group customers who are close to the next tier, then message them or run a campaign.",
  },
  back: { th: "กลับไปหน้าคะแนนสะสม", en: "Back to loyalty" },
  s1: { th: "1. ชื่อกลุ่ม", en: "1. Name" },
  name: { th: "ชื่อกลุ่ม", en: "Segment name" },
  nameHint: { th: "ทีมงานเห็นชื่อนี้เท่านั้น ลูกค้าไม่เห็น", en: "Only your team sees this name." },
  nameReq: { th: "ตั้งชื่อกลุ่ม", en: "Give the segment a name." },
  defaultName: { th: "ใกล้อัปเกรด Tier", en: "Close to a tier upgrade" },
  s2: { th: "2. อัปเกรดไป Tier ไหน", en: "2. Which upgrade" },
  pathsReq: { th: "เลือกอย่างน้อย 1 รายการ", en: "Choose at least one." },
  needs: { th: "ยอดซื้อ 12 เดือน ฿{n} ขึ้นไป", en: "12-month spend of ฿{n} or more" },
  s3: { th: "3. เงื่อนไข", en: "3. Conditions" },
  gap: { th: "ยอดที่ขาดอีกไม่เกิน", en: "Short of the next tier by at most" },
  gapHint: {
    th: "ยิ่งขาดน้อย ยิ่งมีโอกาสซื้อเพิ่มจนถึงเกณฑ์",
    en: "The smaller the gap, the more likely they buy enough to upgrade.",
  },
  recency: { th: "ซื้อล่าสุดภายใน", en: "Last order within" },
  anyTime: { th: "ไม่จำกัด", en: "Any time" },
  daysN: { th: "{n} วัน", en: "{n} days" },
  lineOnly: { th: "เฉพาะลูกค้าที่ติดต่อทาง LINE ได้", en: "Only customers reachable on LINE" },
  lineOnlySub: {
    th: "เพิ่มเพื่อน LINE OA และยินยอมรับข้อความตาม PDPA",
    en: "Added the LINE OA and agreed to receive messages under PDPA",
  },
  summary: { th: "สรุป", en: "Summary" },
  estimate: { th: "ลูกค้าในกลุ่มโดยประมาณ", en: "Estimated customers" },
  customersUnit: { th: "คน", en: "customers" },
  estimateNote: {
    th: "ตัวเลขนับใหม่ทุกคืน ลูกค้าที่อัปเกรดแล้วจะออกจากกลุ่มเอง",
    en: "Recounted every night. Customers leave the segment once they upgrade.",
  },
  when: { th: "เงื่อนไข", en: "Conditions" },
  within: { th: "ขาดไม่เกิน ฿{n}", en: "short by ฿{n} or less" },
  lastOrder: { th: "ซื้อภายใน {n} วัน", en: "ordered in the last {n} days" },
  lineQuota: { th: "โควตาข้อความ LINE ที่เหลือ", en: "LINE messages left this month" },
  quotaShort: {
    th: "โควตาไม่พอส่งให้ทุกคนในกลุ่ม ขาดอีก {n} ข้อความ",
    en: "Not enough quota to message everyone. {n} messages short.",
  },
  empty: {
    th: "ไม่มีลูกค้าตรงเงื่อนไข ลองเพิ่มยอดที่ขาดหรือขยายช่วงเวลา",
    en: "No customers match. Try a larger gap or a longer time window.",
  },
  save: { th: "บันทึกกลุ่ม", en: "Save segment" },
  cancel: { th: "ยกเลิก", en: "Cancel" },
  saved: { th: "สร้างกลุ่มแล้ว", en: "Segment created" },
  savedBody: {
    th: "ใช้กลุ่มนี้ตั้งแคมเปญหรือส่งข้อความได้ทันที",
    en: "You can use it in a campaign or message it now.",
  },
  another: { th: "สร้างอีกกลุ่ม", en: "Create another" },
  makeCampaign: { th: "สร้างแคมเปญให้กลุ่มนี้", en: "Create a campaign for it" },
  toLoyalty: { th: "ไปหน้าคะแนนสะสม", en: "Go to loyalty" },
} satisfies Record<string, Text>

type Key = keyof typeof c
type Path = "gold" | "platinum"

const paths: { value: Path; from: string; to: string; base: number; minSpend: number }[] =
  nearUpgrade.map((u) => ({
    value: u.to.toLowerCase() as Path,
    from: u.from,
    to: u.to,
    base: u.customers,
    minSpend: TIER_RULES.find((t) => t.label === u.to)?.minSpend ?? 0,
  }))

// The loyalty page's "close to upgrade" counts use a ฿5,000 gap and any recency.
// Other choices scale that count. Replace with a real count query when wired up.
const gaps = [
  { value: 2000, share: 0.45 },
  { value: 5000, share: 1 },
  { value: 10000, share: 1.8 },
]
const recencies = [
  { value: 0, share: 1 },
  { value: 90, share: 0.72 },
  { value: 60, share: 0.58 },
  { value: 30, share: 0.41 },
]
const LINE_SHARE = 0.68

type Errors = Partial<Record<"name" | "paths", boolean>>

export default function NewSegmentPage() {
  const { lang } = useLang()
  const l = (k: Key) => c[k][lang]
  const num = (n: number) => n.toLocaleString(lang === "th" ? "th-TH" : "en-GB")

  const [name, setName] = React.useState<string>(c.defaultName[lang])
  const [picked, setPicked] = React.useState<Path[]>(paths.map((p) => p.value))
  const [gap, setGap] = React.useState(5000)
  const [recency, setRecency] = React.useState(0)
  const [lineOnly, setLineOnly] = React.useState(true)
  const [errors, setErrors] = React.useState<Errors>({})
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: false }))

  const factor =
    (gaps.find((g) => g.value === gap)?.share ?? 1) *
    (recencies.find((r) => r.value === recency)?.share ?? 1) *
    (lineOnly ? LINE_SHARE : 1)
  const counts = paths.map((p) => ({
    ...p,
    count: picked.includes(p.value) ? Math.round(p.base * factor) : 0,
  }))
  const total = counts.reduce((s, p) => s + p.count, 0)

  const lineMeter = plan.meters.find((m) => m.id === "line")
  const quotaLeft = lineMeter ? lineMeter.limit - lineMeter.used : 0
  const quotaShort = lineOnly ? Math.max(total - quotaLeft, 0) : 0

  function togglePath(p: Path) {
    setPicked((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]))
    clear("paths")
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const next: Errors = { name: !name.trim(), paths: picked.length === 0 }
    setErrors(next)
    if (next.name) return document.getElementById("sg-name")?.focus()
    if (next.paths) return document.getElementById("sg-path-0")?.focus()
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      setSaved(true)
    }, 800)
  }

  if (saved) {
    return (
      <Card className="mx-auto max-w-[560px]">
        <div role="status" className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle size={32} weight="fill" aria-hidden />
          </span>
          <h1 className="text-[28px] leading-[1.3] font-semibold">{l("saved")}</h1>
          <p className="text-base text-content-secondary">
            {name} · {num(total)} {l("customersUnit")}
          </p>
          <p className="text-sm text-content-secondary">{l("savedBody")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                setSaved(false)
                setName("")
              }}
            >
              {l("another")}
            </Button>
            <ButtonLink href="/loyalty">{l("toLoyalty")}</ButtonLink>
            <ButtonLink href="/campaigns/new" variant="primary" icon={Megaphone}>
              {l("makeCampaign")}
            </ButtonLink>
          </div>
        </div>
      </Card>
    )
  }

  const pill = (on: boolean) =>
    cn(
      "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-[120ms] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]",
      on ? "border-crm bg-crm-soft text-crm-on-soft" : "border-line bg-surface text-content-secondary hover:bg-hover"
    )

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title={l("title")}
        description={l("sub")}
        back={
          <Link
            href="/loyalty"
            className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-content-secondary hover:text-content"
          >
            <ArrowLeft size={18} aria-hidden />
            {l("back")}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader title={l("s1")} />
            <Field label={l("name")} htmlFor="sg-name" hint={l("nameHint")} error={errors.name ? l("nameReq") : undefined}>
              <input
                id="sg-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  clear("name")
                }}
                aria-invalid={errors.name || undefined}
                aria-describedby="sg-name-msg"
                className={inputClass}
              />
            </Field>
          </Card>

          <Card>
            <CardHeader title={l("s2")} />
            <fieldset aria-describedby={errors.paths ? "sg-path-msg" : undefined}>
              <legend className="sr-only">{l("s2")}</legend>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {paths.map((p, i) => {
                  const on = picked.includes(p.value)
                  return (
                    <label
                      key={p.value}
                      className={cn(
                        "relative flex cursor-pointer flex-col gap-1 rounded-md border p-4 transition-colors duration-[120ms] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]",
                        on ? "border-crm bg-crm-soft" : "border-line hover:bg-hover"
                      )}
                    >
                      <input
                        id={`sg-path-${i}`}
                        type="checkbox"
                        checked={on}
                        onChange={() => togglePath(p.value)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {p.from} <ArrowRight size={14} aria-hidden /> {p.to}
                        {on && <Check size={16} weight="bold" aria-hidden className="ml-auto text-crm" />}
                      </span>
                      <span className="text-xs leading-[1.5] text-content-secondary">
                        {l("needs").replace("{n}", num(p.minSpend))}
                      </span>
                    </label>
                  )
                })}
              </div>
              {errors.paths && (
                <p id="sg-path-msg" className="mt-1.5 flex items-center gap-1.5 text-sm text-danger">
                  <WarningCircle size={16} aria-hidden />
                  {l("pathsReq")}
                </p>
              )}
            </fieldset>
          </Card>

          <Card>
            <CardHeader title={l("s3")} />
            <div className="flex flex-col gap-5">
              <fieldset>
                <legend className="mb-1.5 text-sm leading-[1.4] font-medium">{l("gap")}</legend>
                <div className="flex flex-wrap gap-2">
                  {gaps.map((g) => (
                    <label key={g.value} className={pill(gap === g.value)}>
                      <input
                        type="radio"
                        name="gap"
                        checked={gap === g.value}
                        onChange={() => setGap(g.value)}
                        className="sr-only"
                      />
                      <span className="tabular">฿{num(g.value)}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-sm text-content-secondary">{l("gapHint")}</p>
              </fieldset>

              <fieldset>
                <legend className="mb-1.5 text-sm leading-[1.4] font-medium">{l("recency")}</legend>
                <div className="flex flex-wrap gap-2">
                  {recencies.map((r) => (
                    <label key={r.value} className={pill(recency === r.value)}>
                      <input
                        type="radio"
                        name="recency"
                        checked={recency === r.value}
                        onChange={() => setRecency(r.value)}
                        className="sr-only"
                      />
                      {r.value === 0 ? l("anyTime") : l("daysN").replace("{n}", String(r.value))}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex cursor-pointer items-start gap-3 border-t border-line pt-5">
                <input
                  type="checkbox"
                  checked={lineOnly}
                  onChange={(e) => setLineOnly(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-crm-graphic"
                />
                <span>
                  <span className="block text-sm font-medium">{l("lineOnly")}</span>
                  <span className="block text-xs leading-[1.5] text-content-secondary">{l("lineOnlySub")}</span>
                </span>
              </label>
            </div>
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-[96px]">
            <CardHeader title={l("summary")} />
            <div className="rounded-md bg-raised p-4" aria-live="polite">
              <p className="flex items-center gap-1.5 text-xs text-content-quiet">
                <Users size={16} aria-hidden />
                {l("estimate")}
              </p>
              <p className="tabular mt-1 text-[32px] leading-[1.2] font-semibold text-crm">
                {num(total)} <span className="text-sm font-normal">{l("customersUnit")}</span>
              </p>
              {counts.some((p) => p.count > 0) && (
                <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
                  {counts
                    .filter((p) => picked.includes(p.value))
                    .map((p) => (
                      <li key={p.value} className="flex items-center justify-between gap-3">
                        <span className="text-content-secondary">
                          {p.from} <ArrowRight size={12} aria-hidden className="inline" /> {p.to}
                        </span>
                        <span className="tabular font-medium">{num(p.count)}</span>
                      </li>
                    ))}
                </ul>
              )}
              {total === 0 && picked.length > 0 && (
                <p className="mt-2 text-sm text-content-secondary">{l("empty")}</p>
              )}
            </div>
            <p className="mt-2 text-xs leading-[1.5] text-content-quiet">{l("estimateNote")}</p>

            <dl className="mt-5 flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs text-content-quiet">{l("name")}</dt>
                <dd className="font-medium break-words">{name.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-content-quiet">{l("when")}</dt>
                <dd>
                  {l("within").replace("{n}", num(gap))}
                  {recency > 0 && ` · ${l("lastOrder").replace("{n}", String(recency))}`}
                  {lineOnly && " · LINE"}
                </dd>
              </div>
              {lineOnly && (
                <div>
                  <dt className="text-xs text-content-quiet">{l("lineQuota")}</dt>
                  <dd className="tabular">{num(quotaLeft)}</dd>
                </div>
              )}
            </dl>
            {quotaShort > 0 && (
              <p role="status" className="mt-4 flex items-start gap-2 rounded-md bg-warning-soft p-3 text-sm">
                <WarningCircle size={18} weight="bold" aria-hidden className="mt-0.5 shrink-0 text-warning" />
                {l("quotaShort").replace("{n}", num(quotaShort))}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <Button type="submit" variant="primary" icon={FloppyDisk} loading={saving} className="w-full">
                {l("save")}
              </Button>
              <ButtonLink href="/loyalty" variant="tertiary" className="w-full">
                {l("cancel")}
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </form>
  )
}
