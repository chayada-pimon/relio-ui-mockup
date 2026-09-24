"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowsClockwise,
  CheckCircle,
  Hourglass,
  WarningOctagon,
} from "@phosphor-icons/react"

import { useLang } from "@/lib/relio/i18n"
import {
  EVENT_LAG,
  failedIngestions,
  salesChannelLabel,
  type Text,
} from "@/lib/relio/dashboard"
import { Button, Card, PageHeader, StatusChip } from "@/components/relio/ui"

const c = {
  title: { th: "Ingestion Monitor", en: "Ingestion Monitor" },
  sub: {
    th: "ออเดอร์จากทุกช่องทางที่นำเข้าโปรไฟล์ลูกค้าไม่สำเร็จ ตรวจสาเหตุแล้วลองนำเข้าใหม่",
    en: "Orders that did not reach customer profiles. Check the reason, then retry.",
  },
  back: { th: "กลับไปหน้าภาพรวม", en: "Back to overview" },
  lagTitle: { th: "Event รอประมวลผล", en: "Events waiting" },
  lagBody: {
    th: `คะแนนของลูกค้าอาจยังไม่อัปเดต ช้ากว่าปกติราว ${EVENT_LAG.minutes} นาที`,
    en: `Customer points may be out of date, about ${EVENT_LAG.minutes} minutes behind.`,
  },
  failed: { th: "นำเข้าไม่สำเร็จ", en: "Failed" },
  retry: { th: "นำเข้าใหม่", en: "Retry" },
  retryAll: { th: "นำเข้าใหม่ทั้งหมด", en: "Retry all" },
  done: { th: "นำเข้าแล้ว", en: "Ingested" },
  allDone: {
    th: "นำเข้าครบทุกรายการแล้ว ออเดอร์อยู่ในโปรไฟล์ลูกค้าเรียบร้อย",
    en: "Everything is ingested. Orders are on customer profiles.",
  },
  ref: { th: "เลขอ้างอิง", en: "Reference" },
  reason: { th: "สาเหตุ", en: "Reason" },
  channel: { th: "ช่องทาง", en: "Channel" },
  time: { th: "เวลา", en: "Time" },
} satisfies Record<string, Text>

type State = "failed" | "retrying" | "done"

export default function IngestionPage() {
  const { lang, date } = useLang()
  const l = (k: keyof typeof c) => c[k][lang]
  const [state, setState] = React.useState<Record<string, State>>(() =>
    Object.fromEntries(failedIngestions.map((f) => [f.id, "failed" as State]))
  )
  const remaining = failedIngestions.filter((f) => state[f.id] !== "done").length

  function retry(ids: string[]) {
    setState((s) => ({ ...s, ...Object.fromEntries(ids.map((id) => [id, "retrying"])) }))
    window.setTimeout(() => {
      setState((s) => ({ ...s, ...Object.fromEntries(ids.map((id) => [id, "done"])) }))
    }, 1000)
  }

  return (
    <>
      <PageHeader
        title={l("title")}
        description={l("sub")}
        back={
          <Link
            href="/"
            className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-content-secondary hover:text-content"
          >
            <ArrowLeft size={18} aria-hidden />
            {l("back")}
          </Link>
        }
        actions={
          remaining > 0 && (
            <Button
              variant="primary"
              icon={ArrowsClockwise}
              onClick={() =>
                retry(failedIngestions.filter((f) => state[f.id] === "failed").map((f) => f.id))
              }
            >
              {l("retryAll")}
            </Button>
          )
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-lg bg-warning-soft px-4 py-3">
        <Hourglass size={20} weight="bold" aria-hidden className="mt-0.5 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-semibold">
            {l("lagTitle")}: {EVENT_LAG.events.toLocaleString(lang === "th" ? "th-TH" : "en-GB")}
          </p>
          <p className="text-sm text-content-secondary">{l("lagBody")}</p>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {remaining === 0 && (
          <p role="status" className="flex items-center gap-2 border-b border-line bg-success-soft px-6 py-3 text-sm font-medium text-success">
            <CheckCircle size={20} weight="fill" aria-hidden />
            {l("allDone")}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-raised text-xs text-content-secondary">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">{l("ref")}</th>
                <th scope="col" className="px-4 py-3 font-medium">{l("channel")}</th>
                <th scope="col" className="px-4 py-3 font-medium">{l("reason")}</th>
                <th scope="col" className="px-4 py-3 font-medium">{l("time")}</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">
                  <span className="sr-only">{l("retry")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {failedIngestions.map((f) => {
                const s = state[f.id]
                return (
                  <tr key={f.id} className="border-b border-line last:border-0">
                    <td className="px-6 py-3">
                      <p className="tabular font-semibold">{f.orderRef}</p>
                      <p className="tabular text-xs text-content-quiet">{f.id}</p>
                    </td>
                    <td className="px-4 py-3">{salesChannelLabel[f.channel][lang]}</td>
                    <td className="px-4 py-3">
                      {s === "done" ? (
                        <StatusChip tone="success" icon={CheckCircle}>{l("done")}</StatusChip>
                      ) : (
                        <span className="flex items-start gap-2">
                          <WarningOctagon size={18} aria-hidden className="mt-0.5 shrink-0 text-danger" />
                          {f.reason[lang]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-content-secondary">{date(f.at, true)}</td>
                    <td className="px-6 py-3 text-right">
                      {s !== "done" && (
                        <Button
                          icon={ArrowsClockwise}
                          loading={s === "retrying"}
                          onClick={() => retry([f.id])}
                        >
                          {l("retry")}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
