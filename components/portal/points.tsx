"use client"

import Link from "next/link"
import { Coins, Crown, HourglassMedium, Timer, TrendUp } from "@phosphor-icons/react"

import { formatBaht, formatNumber, type Tier } from "@/lib/portal/commerce"
import { formatDate, formatDateTime } from "@/lib/portal/data"
import type { LedgerEntry, PointSummary } from "@/lib/portal/loyalty"
import { EmptyState, StatTile, Table, Tag, Td, Th, type TagTone } from "@/components/portal/ui"

const tierClass: Record<Tier, string> = {
  silver: "bg-raised text-content-secondary",
  gold: "bg-warning-soft text-warning",
  platinum: "bg-crm-soft text-crm-on-soft",
}

/** Membership tier chip; the name is always shown, colour only supports it. */
export function TierTag({ tier, label }: { tier: Tier; label: string }) {
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs leading-none font-medium whitespace-nowrap ${tierClass[tier]}`}
    >
      <Crown size={14} weight="bold" aria-hidden />
      {label}
    </span>
  )
}

export function PointTiles({ summary }: { summary: PointSummary }) {
  const { tier, nextTier, spend12m } = summary
  const progress = nextTier ? Math.min(1, spend12m / nextTier.minSpend) : 1
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="แต้มใช้ได้" value={formatNumber(summary.available)} note="ใช้แลกของรางวัลได้ทันที" icon={Coins} context="crm" />
        <StatTile label="แต้มรอยืนยัน" value={formatNumber(summary.pending)} note="ใช้ได้เมื่อพ้นช่วงรับคืนสินค้า" icon={HourglassMedium} />
        <StatTile
          label="ใกล้หมดอายุ"
          value={formatNumber(summary.expiringSoon)}
          note={summary.expiringOn ? `หมดอายุ ${formatDate(summary.expiringOn)}` : "ยังไม่มีแต้มใกล้หมดอายุ"}
          icon={Timer}
          context={summary.expiringSoon > 0 ? "warning" : "neutral"}
        />
        <StatTile label="แต้มสะสมทั้งหมด" value={formatNumber(summary.earned)} note="ตั้งแต่เป็นสมาชิก" icon={TrendUp} />
      </div>
      <div className="rounded-lg border border-line bg-surface p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-content-quiet">ระดับสมาชิก</span>
          <TierTag tier={tier.tier} label={tier.label} />
          <span className="text-content-secondary">
            {tier.rate} บาท = 1 แต้ม · ยอดซื้อ 12 เดือน {formatBaht(spend12m)}
          </span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-raised"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="ความคืบหน้าสู่ระดับถัดไป"
        >
          <div className="relio-bar-x h-full rounded-full bg-chart-crm" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-content-quiet">
          {nextTier
            ? `ซื้อเพิ่มอีก ${formatBaht(nextTier.minSpend - spend12m)} ภายใน 12 เดือน เพื่อเป็น ${nextTier.label}`
            : "อยู่ในระดับสูงสุดแล้ว"}
        </p>
      </div>
    </div>
  )
}

const stateTag: Record<NonNullable<LedgerEntry["state"]>, [TagTone, string]> = {
  pending: ["warning", "รอยืนยัน"],
  available: ["success", "ใช้ได้"],
  expired: ["default", "หมดอายุ"],
}

const kindLabel: Record<LedgerEntry["kind"], string> = {
  earn: "ได้แต้ม",
  adjust: "ปรับแต้ม",
  redeem: "แลกของรางวัล",
  expire: "หมดอายุ",
}

export function PointLedger({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0)
    return (
      <EmptyState icon={Coins} title="ยังไม่มีความเคลื่อนไหวของแต้ม">
        ลูกค้าจะได้แต้มเมื่อคำสั่งซื้อแรกสำเร็จ
      </EmptyState>
    )
  return (
    <Table>
      <thead>
        <tr>
          <Th>วันที่</Th>
          <Th>ประเภท</Th>
          <Th>รายละเอียด</Th>
          <Th className="text-right">แต้ม</Th>
          <Th>สถานะ</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <Td className="whitespace-nowrap">{formatDateTime(e.date)}</Td>
            <Td className="whitespace-nowrap">{kindLabel[e.kind]}</Td>
            <Td>
              {e.orderId ? (
                <Link href={`/orders/${e.orderId}`} className="text-action hover:underline">
                  {e.label}
                </Link>
              ) : (
                e.label
              )}
              {e.state === "pending" && e.availableAt && (
                <span className="block text-xs text-content-quiet">ใช้ได้ {formatDate(e.availableAt)}</span>
              )}
              {e.state === "available" && e.expiresAt && (
                <span className="block text-xs text-content-quiet">หมดอายุ {formatDate(e.expiresAt)}</span>
              )}
            </Td>
            <Td
              className={`text-right font-medium tabular-nums ${e.points < 0 ? "text-danger" : "text-success"}`}
            >
              {e.points > 0 ? "+" : ""}
              {formatNumber(e.points)}
            </Td>
            <Td>
              {e.state && <Tag tone={stateTag[e.state][0]}>{stateTag[e.state][1]}</Tag>}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
