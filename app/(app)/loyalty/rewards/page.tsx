"use client"

import * as React from "react"
import { Plus } from "@phosphor-icons/react"

import { formatNumber, rewardTypeLabel, type Reward } from "@/lib/portal/commerce"
import { today } from "@/lib/portal/data"
import { newId, usePortal } from "@/lib/portal/store"
import { CompanyScoped } from "@/components/portal/shell"
import {
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
  TextInput,
  Th,
} from "@/components/portal/ui"

export default function RewardsPage() {
  return (
    <CompanyScoped permission="loyalty.read">
      {(companyId) => <RewardList companyId={companyId} />}
    </CompanyScoped>
  )
}

function StockCell({ reward }: { reward: Reward }) {
  if (reward.stock === null) return <span className="text-content-quiet">ไม่จำกัด</span>
  if (reward.stock === 0) return <Tag tone="error">หมด</Tag>
  return <span className="tabular-nums">{formatNumber(reward.stock)}</span>
}

function StatusTag({ reward }: { reward: Reward }) {
  return reward.status === "active" ? (
    <Tag tone="success">เปิดให้แลก</Tag>
  ) : (
    <Tag tone="default">ปิด</Tag>
  )
}

function RewardList({ companyId }: { companyId: string }) {
  const { data, setData, can } = usePortal()
  const editable = can("loyalty.write")
  const [query, setQuery] = React.useState("")
  const [type, setType] = React.useState("all")
  const [editing, setEditing] = React.useState<Reward | "new" | null>(null)
  const [deleting, setDeleting] = React.useState<Reward | null>(null)

  const all = data.rewards.filter((r) => r.companyId === companyId)
  const rows = all
    .filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((r) => type === "all" || r.type === type)
    .sort((a, b) => a.points - b.points)
  const redeemedCount = (r: Reward) =>
    data.redemptions.filter((x) => x.rewardId === r.id && x.status === "completed").length

  const actions = (r: Reward) =>
    editable && (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setEditing(r)}>
          แก้ไข
        </Button>
        <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>
          ลบ
        </Button>
      </div>
    )

  return (
    <PageCard>
      <PageHeader
        title="ของรางวัล"
        description="ของรางวัลและคูปองที่ลูกค้าใช้แต้มแลกได้ กำหนดแต้มที่ใช้และจำนวนคงเหลือ"
        extra={
          editable && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
              เพิ่มของรางวัล
            </Button>
          )
        }
      >
        <div className="-mt-2 flex flex-col gap-3 sm:flex-row">
          <SearchBox value={query} onChange={setQuery} placeholder="ค้นหาชื่อของรางวัล" className="sm:w-[280px]" />
          <Select
            value={type}
            onChange={setType}
            prefix="ประเภท"
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "reward", label: rewardTypeLabel.reward },
              { value: "coupon", label: rewardTypeLabel.coupon },
            ]}
            className="sm:w-44"
          />
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState>{all.length === 0 ? "ยังไม่มีของรางวัล" : "ไม่พบของรางวัลที่ตรงกับเงื่อนไข"}</EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>ชื่อ</Th>
                  <Th>ประเภท</Th>
                  <Th className="text-right">แต้มที่ใช้</Th>
                  <Th className="text-right">คงเหลือ</Th>
                  <Th className="text-right">แลกแล้ว</Th>
                  <Th>สถานะ</Th>
                  {editable && <Th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td>{r.name}</Td>
                    <Td>{rewardTypeLabel[r.type]}</Td>
                    <Td className="text-right tabular-nums">{formatNumber(r.points)}</Td>
                    <Td className="text-right">
                      <StockCell reward={r} />
                    </Td>
                    <Td className="text-right tabular-nums">{redeemedCount(r)}</Td>
                    <Td>
                      <StatusTag reward={r} />
                    </Td>
                    {editable && <Td>{actions(r)}</Td>}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
              <MobileCard key={r.id}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{r.name}</span>
                  <StatusTag reward={r} />
                </div>
                <p className="mt-1 text-content-secondary">
                  {rewardTypeLabel[r.type]} · {formatNumber(r.points)} แต้ม · คงเหลือ{" "}
                  {r.stock === null ? "ไม่จำกัด" : formatNumber(r.stock)}
                </p>
                <div className="mt-3">{actions(r)}</div>
              </MobileCard>
            ))}
          </div>
        </>
      )}

      {editing && (
        <RewardModal
          companyId={companyId}
          reward={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmModal
        open={!!deleting}
        title="ลบของรางวัล"
        message={
          <>
            ต้องการลบ <b>{deleting?.name}</b> ใช่หรือไม่ ประวัติการแลกที่ผ่านมายังเก็บไว้
          </>
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const id = deleting!.id
          setData((d) => ({ ...d, rewards: d.rewards.filter((r) => r.id !== id) }))
          setDeleting(null)
        }}
      />
    </PageCard>
  )
}

function RewardModal({
  companyId,
  reward,
  onClose,
}: {
  companyId: string
  reward: Reward | null
  onClose: () => void
}) {
  const { setData } = usePortal()
  const [name, setName] = React.useState(reward?.name ?? "")
  const [type, setType] = React.useState<Reward["type"]>(reward?.type ?? "reward")
  const [points, setPoints] = React.useState(reward ? String(reward.points) : "")
  const [unlimited, setUnlimited] = React.useState(reward ? reward.stock === null : false)
  const [stock, setStock] = React.useState(reward?.stock != null ? String(reward.stock) : "")
  const [status, setStatus] = React.useState<Reward["status"]>(reward?.status ?? "active")
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  function save() {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "กรุณากรอกชื่อ"
    if (!Number(points)) next.points = "แต้มต้องมากกว่า 0"
    if (!unlimited && stock === "") next.stock = "กรุณากรอกจำนวนคงเหลือ"
    setErrors(next)
    if (Object.keys(next).length) return

    const value: Reward = {
      id: reward?.id ?? newId("rw"),
      companyId,
      name: name.trim(),
      type,
      points: Number(points),
      stock: unlimited ? null : Number(stock),
      status,
      createdAt: reward?.createdAt ?? today(),
    }
    setData((d) => ({
      ...d,
      rewards: reward
        ? d.rewards.map((r) => (r.id === reward.id ? value : r))
        : [...d.rewards, value],
    }))
    onClose()
  }

  return (
    <Modal
      open
      title={reward ? "แก้ไขของรางวัล" : "เพิ่มของรางวัล"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={save}>
            บันทึก
          </Button>
        </>
      }
    >
      <Field label="ชื่อ" required error={errors.name}>
        <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="ประเภท">
          <Select
            value={type}
            onChange={(v) => setType(v as Reward["type"])}
            options={[
              { value: "reward", label: rewardTypeLabel.reward },
              { value: "coupon", label: rewardTypeLabel.coupon },
            ]}
          />
        </Field>
        <Field label="แต้มที่ใช้แลก" required error={errors.points}>
          <TextInput
            inputMode="numeric"
            value={points}
            onChange={(e) => setPoints(e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="จำนวน">
          <Select
            value={unlimited ? "unlimited" : "limited"}
            onChange={(v) => setUnlimited(v === "unlimited")}
            options={[
              { value: "limited", label: "จำกัดจำนวน" },
              { value: "unlimited", label: "ไม่จำกัด" },
            ]}
          />
        </Field>
        {!unlimited && (
          <Field label="คงเหลือ" required error={errors.stock}>
            <TextInput
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        )}
        <Field label="สถานะ">
          <Select
            value={status}
            onChange={(v) => setStatus(v as Reward["status"])}
            options={[
              { value: "active", label: "เปิดให้แลก" },
              { value: "inactive", label: "ปิด" },
            ]}
          />
        </Field>
      </div>
    </Modal>
  )
}
