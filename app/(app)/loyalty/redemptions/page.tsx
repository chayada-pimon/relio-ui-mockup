"use client"

import * as React from "react"
import { Plus } from "@phosphor-icons/react"

import { formatNumber, nowIso, randomCode, type Redemption } from "@/lib/portal/commerce"
import { formatDateTime } from "@/lib/portal/data"
import { pointSummary } from "@/lib/portal/loyalty"
import { newId, usePortal } from "@/lib/portal/store"
import { CompanyScoped } from "@/components/portal/shell"
import { customerName } from "@/components/portal/orders"
import {
  Alert,
  Button,
  ConfirmModal,
  EmptyState,
  Field,
  MobileCard,
  Modal,
  PageCard,
  PageHeader,
  SearchBox,
  Select,
  Table,
  Tag,
  Td,
  Th,
} from "@/components/portal/ui"

export default function RedemptionsPage() {
  return (
    <CompanyScoped permission="loyalty.read">
      {(companyId) => <RedemptionList companyId={companyId} />}
    </CompanyScoped>
  )
}

function StatusTag({ r }: { r: Redemption }) {
  return r.status === "completed" ? (
    <Tag tone="success">แลกสำเร็จ</Tag>
  ) : (
    <Tag tone="default">ยกเลิก · คืนแต้มแล้ว</Tag>
  )
}

function RedemptionList({ companyId }: { companyId: string }) {
  const { data, setData, can } = usePortal()
  const editable = can("loyalty.write")
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [creating, setCreating] = React.useState(false)
  const [cancelling, setCancelling] = React.useState<Redemption | null>(null)
  const [created, setCreated] = React.useState<Redemption | null>(null)

  const all = data.redemptions.filter((r) => r.companyId === companyId)
  const q = query.trim().toLowerCase()
  const rows = all
    .filter(
      (r) =>
        !q ||
        r.code.toLowerCase().includes(q) ||
        r.rewardName.toLowerCase().includes(q) ||
        r.customerId.toLowerCase().includes(q) ||
        customerName(data, r.customerId).toLowerCase().includes(q)
    )
    .filter((r) => status === "all" || r.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const totalPoints = all.filter((r) => r.status === "completed").reduce((s, r) => s + r.points, 0)

  function cancel(r: Redemption) {
    setData((d) => ({
      ...d,
      redemptions: d.redemptions.map((x) => (x.id === r.id ? { ...x, status: "cancelled" } : x)),
      rewards: d.rewards.map((w) =>
        w.id === r.rewardId && w.stock !== null ? { ...w, stock: w.stock + 1 } : w
      ),
    }))
    setCancelling(null)
  }

  return (
    <PageCard>
      <PageHeader
        title="ประวัติการแลก"
        description="ทุกครั้งที่ลูกค้าใช้แต้มแลกของรางวัลหรือคูปอง ยกเลิกได้และระบบคืนแต้มให้อัตโนมัติ"
        extra={
          editable && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              แลกของรางวัล
            </Button>
          )
        }
      >
        {created && (
          <Alert type="info">
            แลก <b>{created.rewardName}</b> ให้ {customerName(data, created.customerId)} แล้ว · รหัส{" "}
            <span className="font-mono font-semibold">{created.code}</span>
          </Alert>
        )}
        <div className="-mt-2 flex flex-col gap-3 sm:flex-row">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาลูกค้า / ของรางวัล / รหัส"
            className="sm:w-[300px]"
          />
          <Select
            value={status}
            onChange={setStatus}
            prefix="สถานะ"
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "completed", label: "แลกสำเร็จ" },
              { value: "cancelled", label: "ยกเลิก" },
            ]}
            className="sm:w-44"
          />
        </div>
        <p className="-mt-1 text-sm text-content-quiet">
          แลกสำเร็จ {all.filter((r) => r.status === "completed").length} ครั้ง · ใช้ไป{" "}
          {formatNumber(totalPoints)} แต้ม
        </p>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState>{all.length === 0 ? "ยังไม่มีการแลกของรางวัล" : "ไม่พบรายการที่ตรงกับเงื่อนไข"}</EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>วันที่</Th>
                  <Th>ลูกค้า</Th>
                  <Th>ของรางวัล</Th>
                  <Th className="text-right">แต้ม</Th>
                  <Th>รหัส</Th>
                  <Th>สถานะ</Th>
                  {editable && <Th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</Td>
                    <Td>
                      {customerName(data, r.customerId)}
                      <span className="block text-xs text-content-quiet">{r.customerId}</span>
                    </Td>
                    <Td>{r.rewardName}</Td>
                    <Td className="text-right tabular-nums">{formatNumber(r.points)}</Td>
                    <Td className="font-mono">{r.code}</Td>
                    <Td>
                      <StatusTag r={r} />
                      <span className="block text-xs text-content-quiet">โดย {r.by}</span>
                    </Td>
                    {editable && (
                      <Td>
                        {r.status === "completed" && (
                          <Button size="sm" variant="danger" onClick={() => setCancelling(r)}>
                            ยกเลิก
                          </Button>
                        )}
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
              <MobileCard key={r.id}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{r.rewardName}</span>
                  <StatusTag r={r} />
                </div>
                <p className="mt-1 text-content-secondary">
                  {customerName(data, r.customerId)} · {formatNumber(r.points)} แต้ม
                </p>
                <p className="mt-1 text-content-quiet">
                  {formatDateTime(r.createdAt)} · <span className="font-mono">{r.code}</span>
                </p>
                {editable && r.status === "completed" && (
                  <Button size="sm" variant="danger" className="mt-3" onClick={() => setCancelling(r)}>
                    ยกเลิก
                  </Button>
                )}
              </MobileCard>
            ))}
          </div>
        </>
      )}

      {creating && (
        <RedeemModal
          companyId={companyId}
          onClose={() => setCreating(false)}
          onDone={(r) => {
            setCreating(false)
            setCreated(r)
          }}
        />
      )}
      <ConfirmModal
        open={!!cancelling}
        title="ยกเลิกการแลก"
        confirmLabel="ยกเลิกการแลก"
        message={
          <>
            ยกเลิกการแลก <b>{cancelling?.rewardName}</b> ({cancelling?.code}) — คืน{" "}
            {formatNumber(cancelling?.points ?? 0)} แต้มให้ลูกค้า และคืนจำนวนของรางวัล
          </>
        }
        onClose={() => setCancelling(null)}
        onConfirm={() => cancel(cancelling!)}
      />
    </PageCard>
  )
}

function RedeemModal({
  companyId,
  onClose,
  onDone,
}: {
  companyId: string
  onClose: () => void
  onDone: (r: Redemption) => void
}) {
  const { data, setData, user } = usePortal()
  const customers = data.customers.filter((c) => c.companyId === companyId)
  const rewards = data.rewards.filter((r) => r.companyId === companyId && r.status === "active")
  const [customerId, setCustomerId] = React.useState("")
  const [rewardId, setRewardId] = React.useState("")

  const balance = customerId ? pointSummary(data, companyId, customerId).available : 0
  const reward = rewards.find((r) => r.id === rewardId)
  const problem = !customerId
    ? "เลือกลูกค้า"
    : !reward
      ? "เลือกของรางวัล"
      : reward.stock === 0
        ? "ของรางวัลนี้หมดแล้ว"
        : reward.points > balance
          ? `แต้มไม่พอ — ต้องใช้ ${formatNumber(reward.points)} แต้ม มี ${formatNumber(balance)} แต้ม`
          : ""

  function redeem() {
    if (problem || !reward) return
    const prefix = reward.type === "coupon" ? "CP" : "RW"
    const r: Redemption = {
      id: newId("rd"),
      companyId,
      customerId,
      rewardId: reward.id,
      rewardName: reward.name,
      points: reward.points,
      code: `${prefix}-${randomCode(6).toUpperCase()}`,
      status: "completed",
      createdAt: nowIso(),
      by: user?.email ?? "",
    }
    setData((d) => ({
      ...d,
      redemptions: [...d.redemptions, r],
      rewards: d.rewards.map((w) =>
        w.id === reward.id && w.stock !== null ? { ...w, stock: w.stock - 1 } : w
      ),
    }))
    onDone(r)
  }

  return (
    <Modal
      open
      title="แลกของรางวัล"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" disabled={!!problem} onClick={redeem}>
            ยืนยันการแลก
          </Button>
        </>
      }
    >
      <Field label="ลูกค้า" required hint={customerId ? `แต้มใช้ได้ ${formatNumber(balance)} แต้ม` : undefined}>
        <Select
          value={customerId}
          onChange={setCustomerId}
          placeholder="เลือกลูกค้า"
          options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
        />
      </Field>
      <Field label="ของรางวัล" required>
        <Select
          value={rewardId}
          onChange={setRewardId}
          placeholder="เลือกของรางวัล"
          options={rewards.map((r) => ({
            value: r.id,
            label: `${r.name} · ${formatNumber(r.points)} แต้ม${r.stock === 0 ? " (หมด)" : ""}`,
          }))}
        />
      </Field>
      {customerId && reward && problem && <Alert type="warning">{problem}</Alert>}
    </Modal>
  )
}
