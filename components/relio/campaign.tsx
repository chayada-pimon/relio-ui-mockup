"use client"

import { CalendarBlank, CheckCircle, Clock, Pause } from "@phosphor-icons/react"

import { useLang, type Lang } from "@/lib/relio/i18n"
import type {
  CampaignAudience,
  CampaignRule,
  Text,
} from "@/lib/relio/dashboard"
import { pointsFor, type Tier } from "@/lib/relio/loyalty"
import { StatusChip } from "@/components/relio/ui"

export const audienceLabel: Record<CampaignAudience, Text> = {
  all: { th: "สมาชิกทุกคน", en: "All members" },
  silver: { th: "สมาชิก Silver", en: "Silver members" },
  gold: { th: "สมาชิก Gold", en: "Gold members" },
  platinum: { th: "สมาชิก Platinum", en: "Platinum members" },
  new: { th: "สมาชิกใหม่", en: "New members" },
}

export const ruleKindLabel: Record<CampaignRule["kind"], Text> = {
  multiplier: { th: "คูณคะแนน", en: "Points multiplier" },
  threshold: { th: "ซื้อครบรับคะแนนพิเศษ", en: "Spend-and-get bonus" },
  welcome: { th: "คะแนนต้อนรับสมาชิกใหม่", en: "Welcome bonus" },
}

/** One plain sentence that says what the customer gets. */
export function ruleText(rule: CampaignRule, lang: Lang) {
  const n = (v: number) => v.toLocaleString(lang === "th" ? "th-TH" : "en-GB")
  switch (rule.kind) {
    case "multiplier":
      return lang === "th"
        ? `ได้คะแนน ${rule.multiplier} เท่าของปกติ`
        : `Earns ${rule.multiplier}× the usual points`
    case "threshold":
      return lang === "th"
        ? `ซื้อครบ ฿${n(rule.minSpend)} ต่อออเดอร์ รับเพิ่ม ${n(rule.bonus)} คะแนน`
        : `Spend ฿${n(rule.minSpend)} in one order, get ${n(rule.bonus)} extra points`
    case "welcome":
      return lang === "th"
        ? `รับ ${n(rule.bonus)} คะแนนเมื่อซื้อครั้งแรก`
        : `Gets ${n(rule.bonus)} points on the first order`
  }
}

/** Points on one order under the campaign, next to the usual amount. */
export function campaignPoints(rule: CampaignRule, amount: number, tier: Tier) {
  const base = pointsFor(amount, tier)
  switch (rule.kind) {
    case "multiplier":
      return { base, total: base * rule.multiplier }
    case "threshold":
      return { base, total: amount >= rule.minSpend ? base + rule.bonus : base }
    case "welcome":
      return { base, total: base + rule.bonus }
  }
}

export type CampaignState = "active" | "scheduled" | "ended" | "paused"

const stateMeta: Record<
  CampaignState,
  { tone: "success" | "info" | "neutral" | "warning"; icon: typeof Clock; label: Text }
> = {
  active: { tone: "success", icon: CheckCircle, label: { th: "กำลังทำงาน", en: "Active" } },
  scheduled: { tone: "info", icon: CalendarBlank, label: { th: "รอเริ่ม", en: "Scheduled" } },
  ended: { tone: "neutral", icon: Clock, label: { th: "จบแล้ว", en: "Ended" } },
  paused: { tone: "warning", icon: Pause, label: { th: "หยุดชั่วคราว", en: "Paused" } },
}

export function CampaignStatusChip({ state }: { state: CampaignState }) {
  const { lang } = useLang()
  const meta = stateMeta[state]
  return (
    <StatusChip tone={meta.tone} icon={meta.icon}>
      {meta.label[lang]}
    </StatusChip>
  )
}
