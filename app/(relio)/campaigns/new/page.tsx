"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Coins,
  FloppyDisk,
  Gift,
  Receipt,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang } from "@/lib/relio/i18n"
import { TODAY } from "@/lib/relio/data"
import {
  salesChannelLabel,
  type Campaign,
  type CampaignAudience,
  type CampaignRule,
  type SalesChannel,
  type Text,
} from "@/lib/relio/dashboard"
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  PageHeader,
  inputClass,
} from "@/components/relio/ui"
import {
  audienceLabel,
  campaignPoints,
  ruleKindLabel,
  ruleText,
} from "@/components/relio/campaign"
import { addCampaign, useCampaigns } from "@/lib/relio/campaign-store"
import { DatePicker } from "@/components/relio/date-picker"

const c = {
  title: { th: "สร้างแคมเปญ", en: "New campaign" },
  sub: {
    th: "ตั้งเงื่อนไขคะแนน กลุ่มลูกค้า และช่วงเวลา แคมเปญเริ่มทำงานตามวันที่กำหนด",
    en: "Set the points rule, audience and dates. The campaign starts on its start date.",
  },
  back: { th: "กลับไปหน้าแคมเปญ", en: "Back to campaigns" },
  copyOf: { th: "{name} (สำเนา)", en: "{name} (copy)" },
  s1: { th: "1. ชื่อแคมเปญ", en: "1. Name" },
  name: { th: "ชื่อแคมเปญ", en: "Campaign name" },
  nameHint: { th: "ลูกค้าเห็นชื่อนี้ใน LINE และใบเสร็จ", en: "Customers see this on LINE and receipts." },
  nameReq: { th: "ตั้งชื่อแคมเปญ", en: "Give the campaign a name." },
  s2: { th: "2. เงื่อนไขคะแนน", en: "2. Points rule" },
  kindMultiplierSub: { th: "เช่น คะแนน 2 เท่าช่วงวันเกิด", en: "e.g. double points for birthdays" },
  kindThresholdSub: { th: "เช่น ซื้อครบ ฿1,000 รับ 100 คะแนน", en: "e.g. spend ฿1,000, get 100 points" },
  kindWelcomeSub: { th: "ให้คะแนนเมื่อซื้อครั้งแรก", en: "Points on a member's first order" },
  multiplier: { th: "คูณคะแนน", en: "Multiply by" },
  minSpend: { th: "ยอดซื้อขั้นต่ำต่อออเดอร์ (บาท)", en: "Minimum order (baht)" },
  bonus: { th: "คะแนนที่ให้เพิ่ม", en: "Bonus points" },
  numReq: { th: "ใส่ตัวเลขมากกว่า 0", en: "Enter a number above 0." },
  s3: { th: "3. ใครได้ และซื้อที่ไหน", en: "3. Who and where" },
  audience: { th: "กลุ่มเป้าหมาย", en: "Audience" },
  channels: { th: "ช่องทางที่ร่วมแคมเปญ", en: "Channels" },
  channelsReq: { th: "เลือกอย่างน้อย 1 ช่องทาง", en: "Choose at least one channel." },
  allChannels: { th: "เลือกทั้งหมด", en: "Select all" },
  s4: { th: "4. ช่วงเวลาและลำดับ", en: "4. Dates and priority" },
  start: { th: "วันเริ่ม", en: "Start date" },
  end: { th: "วันสิ้นสุด", en: "End date" },
  startReq: { th: "เลือกวันเริ่ม ตั้งแต่วันนี้เป็นต้นไป", en: "Choose today or a later date." },
  endReq: { th: "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม", en: "End date can't be before the start." },
  priority: { th: "Priority", en: "Priority" },
  priorityHint: {
    th: "ถ้าออเดอร์เข้าหลายแคมเปญ ใช้แคมเปญที่เลขน้อยที่สุด",
    en: "If an order matches several campaigns, the lowest number wins.",
  },
  priorityTaken: {
    th: "P{n} ใช้กับ “{name}” อยู่ แคมเปญเดิมและที่ตามมาจะเลื่อนลงหนึ่งลำดับ",
    en: "P{n} is used by “{name}”. It and the ones after it move down one place.",
  },
  summary: { th: "สรุป", en: "Summary" },
  exampleTitle: { th: "ตัวอย่าง: Silver ซื้อ ฿1,000", en: "Example: Silver, ฿1,000 order" },
  usual: { th: "ปกติ", en: "Usual" },
  during: { th: "ช่วงแคมเปญ", en: "Campaign" },
  pointsUnit: { th: "คะแนน", en: "points" },
  everyChannel: { th: "ทุกช่องทาง", en: "every channel" },
  when: { th: "ช่วงเวลา", en: "Dates" },
  channelsN: { th: "{n} ช่องทาง", en: "{n} channels" },
  save: { th: "บันทึกแคมเปญ", en: "Save campaign" },
  cancel: { th: "ยกเลิก", en: "Cancel" },
  saved: { th: "สร้างแคมเปญแล้ว", en: "Campaign created" },
  savedBody: {
    th: "แคมเปญจะเริ่มให้คะแนนตั้งแต่ {date}",
    en: "It starts awarding points on {date}.",
  },
  another: { th: "สร้างอีกแคมเปญ", en: "Create another" },
  toList: { th: "ไปหน้าแคมเปญ", en: "Go to campaigns" },
  view: { th: "ดูแคมเปญนี้", en: "View campaign" },
} satisfies Record<string, Text>

type Key = keyof typeof c
type Kind = CampaignRule["kind"]

const kinds: { value: Kind; icon: Icon; sub: Key }[] = [
  { value: "multiplier", icon: Coins, sub: "kindMultiplierSub" },
  { value: "threshold", icon: Receipt, sub: "kindThresholdSub" },
  { value: "welcome", icon: Gift, sub: "kindWelcomeSub" },
]
const audiences: CampaignAudience[] = ["all", "silver", "gold", "platinum", "new"]
const allChannels = Object.keys(salesChannelLabel) as SalesChannel[]
const multipliers = [1.5, 2, 3]

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
type Errors = Partial<Record<"name" | "minSpend" | "bonus" | "channels" | "start" | "end", boolean>>

function NewCampaignForm({ campaigns, source }: { campaigns: Campaign[]; source?: Campaign }) {
  const { lang, date } = useLang()
  const l = (k: Key) => c[k][lang]
  const num = (n: number) => n.toLocaleString(lang === "th" ? "th-TH" : "en-GB")
  const nextPriority = Math.max(0, ...campaigns.map((cp) => cp.priority)) + 1

  const [name, setName] = React.useState(
    source ? c.copyOf[lang].replace("{name}", source.name[lang]) : ""
  )
  const [kind, setKind] = React.useState<Kind>(source?.rule.kind ?? "multiplier")
  const [multiplier, setMultiplier] = React.useState(
    source?.rule.kind === "multiplier" ? source.rule.multiplier : 2
  )
  const [minSpend, setMinSpend] = React.useState(
    String(source?.rule.kind === "threshold" ? source.rule.minSpend : 1000)
  )
  const [bonus, setBonus] = React.useState(
    String(source && source.rule.kind !== "multiplier" ? source.rule.bonus : 100)
  )
  const [audience, setAudience] = React.useState<CampaignAudience>(source?.audience ?? "all")
  const [channels, setChannels] = React.useState<SalesChannel[]>(source?.channels ?? allChannels)
  const [start, setStart] = React.useState(TODAY)
  const [end, setEnd] = React.useState(addDays(TODAY, 30))
  const [priority, setPriority] = React.useState(nextPriority)
  const [errors, setErrors] = React.useState<Errors>({})
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState<string | null>(null)

  const clear = (k: keyof Errors) => setErrors((e) => ({ ...e, [k]: false }))
  const toInt = (v: string) => Math.floor(Number(v.replace(/,/g, "")))

  const rule: CampaignRule =
    kind === "multiplier"
      ? { kind, multiplier }
      : kind === "threshold"
        ? { kind, minSpend: Math.max(toInt(minSpend) || 0, 0), bonus: Math.max(toInt(bonus) || 0, 0) }
        : { kind, bonus: Math.max(toInt(bonus) || 0, 0) }
  const example = campaignPoints(rule, 1000, "silver")
  const taken = campaigns.find((cp) => cp.priority === priority && cp.end >= TODAY)

  function toggleChannel(ch: SalesChannel) {
    setChannels((list) => (list.includes(ch) ? list.filter((x) => x !== ch) : [...list, ch]))
    clear("channels")
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const next: Errors = {
      name: !name.trim(),
      minSpend: kind === "threshold" && !(toInt(minSpend) > 0),
      bonus: kind !== "multiplier" && !(toInt(bonus) > 0),
      channels: channels.length === 0,
      start: !start || start < TODAY,
      end: !end || end < start,
    }
    setErrors(next)
    const order: [keyof Errors, string][] = [
      ["name", "cp-name"],
      ["minSpend", "cp-min"],
      ["bonus", "cp-bonus"],
      ["channels", "cp-ch-0"],
      ["start", "cp-start"],
      ["end", "cp-end"],
    ]
    const first = order.find(([k]) => next[k])
    if (first) {
      document.getElementById(first[1])?.focus()
      return
    }
    setSaving(true)
    window.setTimeout(() => {
      const created = addCampaign({
        name: { th: name.trim(), en: name.trim() },
        start,
        end,
        priority,
        rule,
        audience,
        channels: allChannels.filter((ch) => channels.includes(ch)),
      })
      setSaving(false)
      setSaved(created.id)
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
            {name} · P{priority}
          </p>
          <p className="text-sm text-content-secondary">
            {l("savedBody").replace("{date}", date(start))}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                setSaved(null)
                setName("")
                setPriority(nextPriority)
              }}
            >
              {l("another")}
            </Button>
            <ButtonLink href={`/campaigns/${saved}`}>{l("view")}</ButtonLink>
            <ButtonLink href="/campaigns" variant="primary">
              {l("toList")}
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
            href="/campaigns"
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
            <Field label={l("name")} htmlFor="cp-name" hint={l("nameHint")} error={errors.name ? l("nameReq") : undefined}>
              <input
                id="cp-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  clear("name")
                }}
                aria-invalid={errors.name || undefined}
                aria-describedby="cp-name-msg"
                className={inputClass}
              />
            </Field>
          </Card>

          <Card>
            <CardHeader title={l("s2")} />
            <fieldset>
              <legend className="sr-only">{l("s2")}</legend>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {kinds.map((k) => {
                  const IconCmp = k.icon
                  const on = kind === k.value
                  return (
                    <label
                      key={k.value}
                      className={cn(
                        "relative flex cursor-pointer flex-col gap-1 rounded-md border p-4 transition-colors duration-[120ms] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]",
                        on ? "border-crm bg-crm-soft" : "border-line hover:bg-hover"
                      )}
                    >
                      <input
                        type="radio"
                        name="kind"
                        value={k.value}
                        checked={on}
                        onChange={() => setKind(k.value)}
                        className="sr-only"
                      />
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <IconCmp size={20} aria-hidden className={on ? "text-crm" : "text-content-secondary"} />
                        {ruleKindLabel[k.value][lang]}
                        {on && <Check size={16} weight="bold" aria-hidden className="ml-auto text-crm" />}
                      </span>
                      <span className="text-xs leading-[1.5] text-content-secondary">{l(k.sub)}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-5 grid grid-cols-1 gap-5 border-t border-line pt-5 md:grid-cols-2">
              {kind === "multiplier" && (
                <fieldset>
                  <legend className="mb-1.5 text-sm leading-[1.4] font-medium">{l("multiplier")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {multipliers.map((m) => (
                      <label key={m} className={pill(multiplier === m)}>
                        <input
                          type="radio"
                          name="multiplier"
                          checked={multiplier === m}
                          onChange={() => setMultiplier(m)}
                          className="sr-only"
                        />
                        <span className="tabular">{m}×</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {kind === "threshold" && (
                <Field label={l("minSpend")} htmlFor="cp-min" error={errors.minSpend ? l("numReq") : undefined}>
                  <input
                    id="cp-min"
                    inputMode="numeric"
                    value={minSpend}
                    onChange={(e) => {
                      setMinSpend(e.target.value)
                      clear("minSpend")
                    }}
                    aria-invalid={errors.minSpend || undefined}
                    aria-describedby={errors.minSpend ? "cp-min-msg" : undefined}
                    className={cn(inputClass, "tabular")}
                  />
                </Field>
              )}
              {kind !== "multiplier" && (
                <Field label={l("bonus")} htmlFor="cp-bonus" error={errors.bonus ? l("numReq") : undefined}>
                  <input
                    id="cp-bonus"
                    inputMode="numeric"
                    value={bonus}
                    onChange={(e) => {
                      setBonus(e.target.value)
                      clear("bonus")
                    }}
                    aria-invalid={errors.bonus || undefined}
                    aria-describedby={errors.bonus ? "cp-bonus-msg" : undefined}
                    className={cn(inputClass, "tabular")}
                  />
                </Field>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={l("s3")} />
            <fieldset className="mb-5">
              <legend className="mb-1.5 text-sm leading-[1.4] font-medium">{l("audience")}</legend>
              <div className="flex flex-wrap gap-2">
                {audiences.map((a) => (
                  <label key={a} className={pill(audience === a)}>
                    <input
                      type="radio"
                      name="audience"
                      checked={audience === a}
                      onChange={() => setAudience(a)}
                      className="sr-only"
                    />
                    {audienceLabel[a][lang]}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset aria-describedby={errors.channels ? "cp-ch-msg" : undefined}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <legend className="text-sm leading-[1.4] font-medium">{l("channels")}</legend>
                <Button
                  variant="tertiary"
                  className="-mr-3 min-h-9"
                  onClick={() => {
                    setChannels(allChannels)
                    clear("channels")
                  }}
                >
                  {l("allChannels")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allChannels.map((ch, i) => {
                  const on = channels.includes(ch)
                  return (
                    <label key={ch} className={pill(on)}>
                      <input
                        id={`cp-ch-${i}`}
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleChannel(ch)}
                        className="sr-only"
                      />
                      {on && <Check size={14} weight="bold" aria-hidden />}
                      {salesChannelLabel[ch][lang]}
                    </label>
                  )
                })}
              </div>
              {errors.channels && (
                <p id="cp-ch-msg" className="mt-1.5 flex items-center gap-1.5 text-sm text-danger">
                  <WarningCircle size={16} aria-hidden />
                  {l("channelsReq")}
                </p>
              )}
            </fieldset>
          </Card>

          <Card>
            <CardHeader title={l("s4")} />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={l("start")} htmlFor="cp-start" error={errors.start ? l("startReq") : undefined}>
                <DatePicker
                  id="cp-start"
                  min={TODAY}
                  value={start}
                  onValueChange={(v) => {
                    setStart(v)
                    clear("start")
                  }}
                  rangeFrom={start}
                  rangeTo={end}
                  invalid={errors.start}
                  describedBy={errors.start ? "cp-start-msg" : undefined}
                />
              </Field>
              <Field label={l("end")} htmlFor="cp-end" error={errors.end ? l("endReq") : undefined}>
                <DatePicker
                  id="cp-end"
                  min={start}
                  value={end}
                  onValueChange={(v) => {
                    setEnd(v)
                    clear("end")
                  }}
                  rangeFrom={start}
                  rangeTo={end}
                  invalid={errors.end}
                  describedBy={errors.end ? "cp-end-msg" : undefined}
                />
              </Field>
              <Field label={l("priority")} htmlFor="cp-priority" hint={l("priorityHint")}>
                <input
                  id="cp-priority"
                  type="number"
                  min={1}
                  max={nextPriority}
                  value={priority}
                  onChange={(e) =>
                    setPriority(Math.min(Math.max(Math.floor(Number(e.target.value)) || 1, 1), nextPriority))
                  }
                  aria-describedby="cp-priority-msg"
                  className={cn(inputClass, "tabular")}
                />
              </Field>
            </div>
            {taken && (
              <p role="status" className="mt-4 flex items-start gap-2 rounded-md bg-warning-soft p-3 text-sm">
                <WarningCircle size={18} weight="bold" aria-hidden className="mt-0.5 shrink-0 text-warning" />
                {l("priorityTaken").replace("{n}", String(priority)).replace("{name}", taken.name[lang])}
              </p>
            )}
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-[96px]">
            <CardHeader title={l("summary")} />
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs text-content-quiet">{l("name")}</dt>
                <dd className="font-medium break-words">{name.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-content-quiet">{ruleKindLabel[kind][lang]}</dt>
                <dd>{ruleText(rule, lang)}</dd>
              </div>
              <div>
                <dt className="text-xs text-content-quiet">{l("audience")}</dt>
                <dd>
                  {audienceLabel[audience][lang]} ·{" "}
                  {channels.length === allChannels.length
                    ? l("everyChannel")
                    : l("channelsN").replace("{n}", String(channels.length))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-content-quiet">{l("when")}</dt>
                <dd>
                  {start ? date(start) : "—"} – {end ? date(end) : "—"} · P{priority}
                </dd>
              </div>
            </dl>
            <div className="mt-5 rounded-md bg-raised p-4">
              <p className="text-xs text-content-quiet">{l("exampleTitle")}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-content-secondary">{l("usual")}</p>
                  <p className="tabular text-base">{num(example.base)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-content-secondary">{l("during")}</p>
                  <p className="tabular text-2xl leading-[1.25] font-semibold text-crm">
                    {num(example.total)}{" "}
                    <span className="text-sm font-normal">{l("pointsUnit")}</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button type="submit" variant="primary" icon={FloppyDisk} loading={saving} className="w-full">
                {l("save")}
              </Button>
              <ButtonLink href="/campaigns" variant="tertiary" className="w-full">
                {l("cancel")}
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </form>
  )
}

function NewCampaignLoader() {
  const campaigns = useCampaigns()
  const fromId = useSearchParams().get("from") ?? ""
  const source = campaigns.find((cp) => cp.id === fromId)
  // Remount once a stored campaign loads so the copy is prefilled.
  return <NewCampaignForm key={source?.id ?? "blank"} campaigns={campaigns} source={source} />
}

export default function NewCampaignPage() {
  return (
    <React.Suspense>
      <NewCampaignLoader />
    </React.Suspense>
  )
}
