"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle,
  FloppyDisk,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { useLang } from "@/lib/relio/i18n"
import { customers, type Customer, type Segment } from "@/lib/relio/data"
import type { Text } from "@/lib/relio/dashboard"
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  PageHeader,
  Select,
  Toast,
  inputClass,
} from "@/components/relio/ui"

const c = {
  newTitle: { th: "เพิ่มลูกค้า", en: "Add customer" },
  newSub: {
    th: "กรอกข้อมูลติดต่อ ระบบจะเช็กว่าซ้ำกับลูกค้าที่มีอยู่หรือไม่",
    en: "Enter contact details. We check whether this customer already exists.",
  },
  editTitle: { th: "แก้ไขข้อมูลลูกค้า", en: "Edit customer" },
  editSub: {
    th: "การแก้ไขมีผลกับโปรไฟล์นี้ในทุกช่องทาง",
    en: "Changes apply to this profile on every channel.",
  },
  backProfile: { th: "กลับไปโปรไฟล์ลูกค้า", en: "Back to profile" },
  secContact: { th: "ข้อมูลติดต่อ", en: "Contact details" },
  secCrm: { th: "การดูแลลูกค้า", en: "Account" },
  secPdpa: { th: "ความยินยอม (PDPA)", en: "Consent (PDPA)" },
  name: { th: "ชื่อ-นามสกุล", en: "Full name" },
  nameReq: { th: "กรอกชื่อลูกค้า", en: "Enter the customer's name." },
  company: { th: "ชื่อร้านหรือบริษัท", en: "Shop or company" },
  companyHint: { th: "เว้นว่างได้ถ้าเป็นลูกค้าบุคคล", en: "Leave blank for an individual." },
  phone: { th: "เบอร์โทร", en: "Phone" },
  phoneHint: { th: "ใช้จับคู่ลูกค้าข้ามช่องทาง", en: "Used to match the customer across channels." },
  phoneReq: { th: "กรอกเบอร์โทร 9–10 หลัก", en: "Enter a 9–10 digit phone number." },
  email: { th: "อีเมล", en: "Email" },
  emailBad: { th: "รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com", en: "Use a format like name@example.com." },
  city: { th: "จังหวัด", en: "Province" },
  segment: { th: "กลุ่มลูกค้า", en: "Segment" },
  owner: { th: "ผู้ดูแล", en: "Account owner" },
  note: { th: "บันทึก", en: "Note" },
  noteHint: { th: "ทีมงานทุกคนเห็นบันทึกนี้", en: "Everyone on the team can see this." },
  consent: {
    th: "ลูกค้ายินยอมให้เก็บและใช้ข้อมูลเพื่อการขายและบริการ",
    en: "The customer agreed to data collection for sales and service.",
  },
  consentHint: {
    th: "ระบบบันทึกวันที่ยินยอมไว้เป็นหลักฐาน",
    en: "The date of consent is recorded as evidence.",
  },
  dupTitle: { th: "อาจเป็นลูกค้าคนเดิม", en: "This may be an existing customer" },
  dupBody: {
    th: "มีโปรไฟล์ที่ใช้{field}เดียวกันอยู่แล้ว เปิดดูก่อนเพื่อไม่ให้ข้อมูลซ้ำ",
    en: "A profile with the same {field} already exists. Check it first to avoid a duplicate.",
  },
  dupPhone: { th: "เบอร์โทร", en: "phone" },
  dupEmail: { th: "อีเมล", en: "email" },
  openProfile: { th: "เปิดโปรไฟล์", en: "Open profile" },
  saveNew: { th: "บันทึกลูกค้า", en: "Save customer" },
  saveEdit: { th: "บันทึกการแก้ไข", en: "Save changes" },
  cancel: { th: "ยกเลิก", en: "Cancel" },
  savedNew: { th: "เพิ่มลูกค้าแล้ว", en: "Customer added" },
  savedNewBody: {
    th: "ออเดอร์จากทุกช่องทางที่ใช้เบอร์นี้จะเข้าโปรไฟล์นี้อัตโนมัติ",
    en: "Orders on any channel with this phone number will join this profile.",
  },
  addAnother: { th: "เพิ่มอีกคน", en: "Add another" },
  toList: { th: "ไปหน้าลูกค้า", en: "Go to customers" },
  savedEdit: { th: "บันทึกการแก้ไขแล้ว", en: "Changes saved" },
  unchanged: { th: "ยังไม่มีอะไรเปลี่ยน", en: "Nothing has changed yet" },
} satisfies Record<string, Text>

const segments: { value: Segment; label: Text }[] = [
  { value: "new", label: { th: "ลูกค้าใหม่", en: "New" } },
  { value: "regular", label: { th: "ลูกค้าประจำ", en: "Regular" } },
  { value: "vip", label: { th: "VIP", en: "VIP" } },
]

const owners = [...new Set(customers.map((cu) => cu.owner))]

type Values = {
  name: string
  company: string
  phone: string
  email: string
  city: string
  segment: Segment
  owner: string
  note: string
  consent: boolean
}

type Errors = Partial<Record<"name" | "phone" | "email", boolean>>

const digits = (v: string) => v.replace(/\D/g, "")
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fromCustomer(cu?: Customer): Values {
  return {
    name: cu?.name ?? "",
    company: cu?.company ?? "",
    phone: cu?.phone ?? "",
    email: cu?.email ?? "",
    city: cu?.city ?? "",
    segment: cu?.segment ?? "new",
    owner: cu?.owner ?? owners[0],
    note: cu?.note ?? "",
    consent: Boolean(cu?.consentAt),
  }
}

export function CustomerForm({ customer }: { customer?: Customer }) {
  const { lang } = useLang()
  const l = (k: keyof typeof c) => c[k][lang]
  const editing = Boolean(customer)

  const [initial, setInitial] = React.useState(() => fromCustomer(customer))
  const [v, setV] = React.useState(initial)
  const [errors, setErrors] = React.useState<Errors>({})
  const [saving, setSaving] = React.useState(false)
  const [savedNew, setSavedNew] = React.useState(false)
  const [toast, setToast] = React.useState(false)
  const closeToast = React.useCallback(() => setToast(false), [])

  const dirty = JSON.stringify(v) !== JSON.stringify(initial)

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setV((s) => ({ ...s, [key]: value }))
    if (key in errors) setErrors((e) => ({ ...e, [key]: false }))
  }

  // Warn, don't block: staff may know two people share a shop phone.
  const duplicate = React.useMemo(() => {
    const phone = digits(v.phone)
    const email = v.email.trim().toLowerCase()
    for (const cu of customers) {
      if (cu.id === customer?.id) continue
      if (phone.length >= 9 && digits(cu.phone) === phone)
        return { customer: cu, field: "dupPhone" as const }
      if (email && cu.email.toLowerCase() === email)
        return { customer: cu, field: "dupEmail" as const }
    }
    return null
  }, [v.phone, v.email, customer?.id])

  function save(e: React.FormEvent) {
    e.preventDefault()
    const len = digits(v.phone).length
    const next: Errors = {
      name: !v.name.trim(),
      phone: len < 9 || len > 10,
      email: Boolean(v.email.trim()) && !EMAIL.test(v.email.trim()),
    }
    setErrors(next)
    const first = (["name", "phone", "email"] as const).find((k) => next[k])
    if (first) {
      document.getElementById(`cf-${first}`)?.focus()
      return
    }
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      if (editing) {
        setInitial(v)
        setToast(true)
      } else {
        setSavedNew(true)
      }
    }, 800)
  }

  const backHref = customer ? `/customers/${customer.id}` : "/customers"

  if (savedNew) {
    return (
      <Card className="mx-auto max-w-[560px]">
        <div role="status" className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle size={32} weight="fill" aria-hidden />
          </span>
          <h1 className="text-[28px] leading-[1.3] font-semibold">{l("savedNew")}</h1>
          <p className="text-base text-content-secondary">
            {v.name}
            {v.company && ` · ${v.company}`}
          </p>
          <p className="max-w-[44ch] text-sm text-content-secondary">{l("savedNewBody")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                setSavedNew(false)
                setV(fromCustomer())
              }}
            >
              {l("addAnother")}
            </Button>
            <ButtonLink href="/customers" variant="primary">
              {l("toList")}
            </ButtonLink>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <form onSubmit={save} noValidate>
      <PageHeader
        title={editing ? l("editTitle") : l("newTitle")}
        description={editing ? l("editSub") : l("newSub")}
        back={
          <Link
            href={backHref}
            className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-content-secondary hover:text-content"
          >
            <ArrowLeft size={18} aria-hidden />
            {editing ? l("backProfile") : c.toList[lang]}
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader title={l("secContact")} />
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={`${l("name")} *`} htmlFor="cf-name" error={errors.name ? l("nameReq") : undefined}>
                <input
                  id="cf-name"
                  value={v.name}
                  onChange={(e) => set("name", e.target.value)}
                  autoComplete="off"
                  aria-invalid={errors.name || undefined}
                  aria-describedby={errors.name ? "cf-name-msg" : undefined}
                  className={inputClass}
                />
              </Field>
              <Field label={l("company")} htmlFor="cf-company" hint={l("companyHint")}>
                <input
                  id="cf-company"
                  value={v.company}
                  onChange={(e) => set("company", e.target.value)}
                  aria-describedby="cf-company-msg"
                  className={inputClass}
                />
              </Field>
              <Field
                label={`${l("phone")} *`}
                htmlFor="cf-phone"
                hint={l("phoneHint")}
                error={errors.phone ? l("phoneReq") : undefined}
              >
                <input
                  id="cf-phone"
                  type="tel"
                  inputMode="tel"
                  value={v.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  aria-invalid={errors.phone || undefined}
                  aria-describedby="cf-phone-msg"
                  className={cn(inputClass, "tabular")}
                />
              </Field>
              <Field label={l("email")} htmlFor="cf-email" error={errors.email ? l("emailBad") : undefined}>
                <input
                  id="cf-email"
                  type="email"
                  inputMode="email"
                  value={v.email}
                  onChange={(e) => set("email", e.target.value)}
                  aria-invalid={errors.email || undefined}
                  aria-describedby={errors.email ? "cf-email-msg" : undefined}
                  className={inputClass}
                />
              </Field>
              <Field label={l("city")} htmlFor="cf-city">
                <input
                  id="cf-city"
                  value={v.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            {duplicate && (
              <div role="status" className="mt-5 flex flex-wrap items-center gap-3 rounded-md bg-warning-soft p-4">
                <WarningCircle size={20} weight="bold" aria-hidden className="shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{l("dupTitle")}</p>
                  <p className="text-sm text-content-secondary">
                    {l("dupBody").replace("{field}", c[duplicate.field][lang])}
                  </p>
                </div>
                <Link
                  href={`/customers/${duplicate.customer.id}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-surface px-3 text-sm font-medium hover:bg-hover"
                >
                  <Avatar name={duplicate.customer.name} size={24} />
                  {l("openProfile")}: {duplicate.customer.name}
                </Link>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={l("secCrm")} />
            <fieldset className="mb-5">
              <legend className="mb-1.5 text-sm leading-[1.4] font-medium">{l("segment")}</legend>
              <div className="flex flex-wrap gap-2">
                {segments.map((s) => (
                  <label
                    key={s.value}
                    className={cn(
                      "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors duration-[120ms] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]",
                      v.segment === s.value
                        ? "border-crm bg-crm-soft text-crm-on-soft"
                        : "border-line bg-surface text-content-secondary hover:bg-hover"
                    )}
                  >
                    <input
                      type="radio"
                      name="segment"
                      value={s.value}
                      checked={v.segment === s.value}
                      onChange={() => set("segment", s.value)}
                      className="sr-only"
                    />
                    {s.label[lang]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-5">
              <div className="md:max-w-[calc(50%-10px)]">
                <Field label={l("owner")} htmlFor="cf-owner">
                  <Select
                    id="cf-owner"
                    value={v.owner}
                    onValueChange={(o) => set("owner", o)}
                    options={owners.map((o) => ({ value: o, label: o }))}
                  />
                </Field>
              </div>
              <Field label={l("note")} htmlFor="cf-note" hint={l("noteHint")}>
                <textarea
                  id="cf-note"
                  rows={3}
                  value={v.note}
                  onChange={(e) => set("note", e.target.value)}
                  aria-describedby="cf-note-msg"
                  className={cn(inputClass, "py-2.5 leading-[1.6]")}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-xl leading-[1.4] font-semibold">
              <ShieldCheck size={22} aria-hidden />
              {l("secPdpa")}
            </h2>
            <label className="flex cursor-pointer items-start gap-3 rounded-md p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)]">
              <input
                type="checkbox"
                checked={v.consent}
                onChange={(e) => set("consent", e.target.checked)}
                aria-describedby="cf-consent-hint"
                className="mt-0.5 size-5 shrink-0 accent-crm-graphic"
              />
              <span>
                <span className="block text-sm font-medium">{l("consent")}</span>
                <span id="cf-consent-hint" className="block text-sm text-content-quiet">
                  {l("consentHint")}
                </span>
              </span>
            </label>
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-[96px]">
            <div className="flex items-center gap-3">
              <Avatar name={v.name.trim() || "?"} size={48} />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{v.name.trim() || "—"}</p>
                <p className="truncate text-sm text-content-quiet">
                  {[v.company, v.city].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="submit"
                variant="primary"
                icon={FloppyDisk}
                loading={saving}
                disabled={editing && !dirty}
                className="w-full"
              >
                {editing ? l("saveEdit") : l("saveNew")}
              </Button>
              {editing && !dirty && (
                <p className="text-center text-xs text-content-quiet">{l("unchanged")}</p>
              )}
              <ButtonLink href={backHref} variant="tertiary" className="w-full">
                {l("cancel")}
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>

      {toast && customer && (
        <Toast
          title={l("savedEdit")}
          onClose={closeToast}
          action={
            <Link href={backHref} className="text-sm font-medium text-crm hover:underline">
              {l("backProfile")}
            </Link>
          }
        />
      )}
    </form>
  )
}
