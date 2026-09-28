"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowsClockwise } from "@phosphor-icons/react"

import { addDays, channelTypeLabel, type IngestEvent, type IngestStatus } from "@/lib/portal/commerce"
import { formatDateTime, today } from "@/lib/portal/data"
import { retryEvent } from "@/lib/portal/ingest"
import { usePortal } from "@/lib/portal/store"
import { CompanyScoped } from "@/components/portal/shell"
import { channelName } from "@/components/portal/orders"
import {
  Alert,
  Button,
  EmptyState,
  MobileCard,
  PageCard,
  PageHeader,
  SearchBox,
  Select,
  StatTile,
  Table,
  Tag,
  Td,
  Th,
  type TagTone,
} from "@/components/portal/ui"

export default function IngestionPage() {
  return (
    <CompanyScoped permission="integration.read">
      {(companyId) => <IngestionLog companyId={companyId} />}
    </CompanyScoped>
  )
}

const statusTag: Record<IngestStatus, [TagTone, string]> = {
  success: ["success", "สำเร็จ"],
  failed: ["error", "ไม่สำเร็จ"],
  duplicate: ["default", "ซ้ำ"],
}

function IngestionLog({ companyId }: { companyId: string }) {
  const { data, setData, can } = usePortal()
  const editable = can("integration.write")
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null)

  const all = data.ingestEvents.filter((e) => e.companyId === companyId)
  const q = query.trim().toLowerCase()
  const rows = all
    .filter(
      (e) =>
        !q ||
        e.externalOrderId.toLowerCase().includes(q) ||
        e.externalShopId.toLowerCase().includes(q) ||
        (e.orderId ?? "").toLowerCase().includes(q)
    )
    .filter((e) => status === "all" || e.status === status)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))

  const weekAgo = addDays(today(), -7)
  const recent = all.filter((e) => e.receivedAt.slice(0, 10) > weekAgo)
  const failed = all.filter((e) => e.status === "failed")
  const count = (s: IngestStatus) => recent.filter((e) => e.status === s).length

  function retry(e: IngestEvent) {
    const result = retryEvent(data, e.id)
    setData(() => result.data)
    const created = result.data.ingestEvents.find((x) => x.id === e.id)?.orderId
    setNotice(
      result.ok
        ? { ok: true, text: `รับ ${e.externalOrderId} เข้าระบบแล้ว เป็นคำสั่งซื้อ ${created}` }
        : { ok: false, text: `${e.externalOrderId} ยังไม่สำเร็จ: ${e.message}` }
    )
  }

  const source = (e: IngestEvent) =>
    e.channelId ? channelName(data, e.channelId) : `${channelTypeLabel[e.platform]} · ${e.externalShopId}`

  const action = (e: IngestEvent) =>
    e.status === "failed" && editable ? (
      <Button size="sm" icon={<ArrowsClockwise className="size-3.5" />} onClick={() => retry(e)}>
        ลองใหม่
      </Button>
    ) : e.orderId ? (
      <Link href={`/orders/${e.orderId}`} className="text-action hover:underline">
        {e.orderId}
      </Link>
    ) : null

  return (
    <PageCard>
      <PageHeader
        title="ติดตามการรับข้อมูล"
        description="ทุกคำสั่งซื้อที่ช่องทางส่งเข้ามา ดูว่ารับเข้าระบบสำเร็จไหม และลองใหม่ได้เมื่อแก้สาเหตุแล้ว"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="รับเข้า 7 วันล่าสุด" value={recent.length} note="รายการ" />
          <StatTile label="สำเร็จ" value={count("success")} note="7 วันล่าสุด" />
          <StatTile label="ไม่สำเร็จ" value={count("failed")} note="7 วันล่าสุด" />
          <StatTile label="ซ้ำ (ข้ามให้อัตโนมัติ)" value={count("duplicate")} note="7 วันล่าสุด" />
        </div>
        {failed.length > 0 && (
          <Alert
            type="error"
            action={
              status !== "failed" && (
                <Button size="sm" onClick={() => setStatus("failed")}>
                  ดูรายการ
                </Button>
              )
            }
          >
            มี {failed.length} รายการที่รับเข้าไม่สำเร็จ — แก้สาเหตุ (เช่น เพิ่ม mapping ร้าน) แล้วกด “ลองใหม่”
          </Alert>
        )}
        {notice && <Alert type={notice.ok ? "info" : "warning"}>{notice.text}</Alert>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาเลขที่จากช่องทาง / รหัสร้าน / เลขคำสั่งซื้อ"
            className="sm:w-[340px]"
          />
          <Select
            value={status}
            onChange={setStatus}
            prefix="สถานะ"
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "success", label: "สำเร็จ" },
              { value: "failed", label: "ไม่สำเร็จ" },
              { value: "duplicate", label: "ซ้ำ" },
            ]}
            className="sm:w-44"
          />
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState>{all.length === 0 ? "ยังไม่มีข้อมูลเข้ามา" : "ไม่พบรายการที่ตรงกับเงื่อนไข"}</EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>เวลารับ</Th>
                  <Th>ที่มา</Th>
                  <Th>เลขที่จากช่องทาง</Th>
                  <Th>สถานะ</Th>
                  <Th>รายละเอียด</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <Td className="whitespace-nowrap">{formatDateTime(e.receivedAt)}</Td>
                    <Td>{source(e)}</Td>
                    <Td className="font-mono text-[13px]">{e.externalOrderId}</Td>
                    <Td>
                      <Tag tone={statusTag[e.status][0]}>{statusTag[e.status][1]}</Tag>
                    </Td>
                    <Td className="text-content-secondary">
                      {e.message ?? "-"}
                      {e.attempts > 1 && (
                        <span className="block text-xs text-content-quiet">ลองแล้ว {e.attempts} ครั้ง</span>
                      )}
                    </Td>
                    <Td>{action(e)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((e) => (
              <MobileCard key={e.id}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[13px] font-semibold">{e.externalOrderId}</span>
                  <Tag tone={statusTag[e.status][0]}>{statusTag[e.status][1]}</Tag>
                </div>
                <p className="mt-1 text-content-secondary">{source(e)}</p>
                <p className="mt-1 text-content-quiet">{formatDateTime(e.receivedAt)}</p>
                {e.message && <p className="mt-1 text-danger">{e.message}</p>}
                <div className="mt-2">{action(e)}</div>
              </MobileCard>
            ))}
          </div>
        </>
      )}
    </PageCard>
  )
}
