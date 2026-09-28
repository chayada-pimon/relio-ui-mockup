"use client"

import * as React from "react"
import { Copy, Key, Plus } from "@phosphor-icons/react"

import {
  channelTypeLabel,
  nowIso,
  randomCode,
  type ApiKey,
  type Channel,
  type ChannelType,
} from "@/lib/portal/commerce"
import { formatDate, formatDateTime, today } from "@/lib/portal/data"
import { newId, usePortal } from "@/lib/portal/store"
import { CompanyScoped } from "@/components/portal/shell"
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
  Select,
  Table,
  Tag,
  Td,
  TextInput,
  Th,
} from "@/components/portal/ui"

export default function ConnectionsPage() {
  return (
    <CompanyScoped permission="integration.read">
      {(companyId) => <ChannelList companyId={companyId} />}
    </CompanyScoped>
  )
}

const activeKey = (c: Channel) => c.apiKeys.find((k) => !k.revokedAt)

function newKey(): { key: ApiKey; secret: string } {
  const secret = `crm_live_${randomCode(32)}`
  return {
    secret,
    key: { id: newId("key"), prefix: secret.slice(0, 13), createdAt: today() },
  }
}

function ChannelList({ companyId }: { companyId: string }) {
  const { data, setData, can } = usePortal()
  const editable = can("integration.write")
  const [adding, setAdding] = React.useState(false)
  const [rotating, setRotating] = React.useState<Channel | null>(null)
  const [toggling, setToggling] = React.useState<Channel | null>(null)
  const [revealed, setRevealed] = React.useState<{ channel: string; secret: string } | null>(null)

  const channels = data.channels
    .filter((c) => c.companyId === companyId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const ordersOf = (c: Channel) => data.orders.filter((o) => o.channelId === c.id).length

  function rotate(channel: Channel) {
    const { key, secret } = newKey()
    setData((d) => ({
      ...d,
      channels: d.channels.map((c) =>
        c.id === channel.id
          ? {
              ...c,
              apiKeys: [
                ...c.apiKeys.map((k) => (k.revokedAt ? k : { ...k, revokedAt: nowIso() })),
                key,
              ],
            }
          : c
      ),
    }))
    setRotating(null)
    setRevealed({ channel: channel.name, secret })
  }

  function toggle(channel: Channel) {
    setData((d) => ({
      ...d,
      channels: d.channels.map((c) =>
        c.id === channel.id ? { ...c, status: c.status === "active" ? "inactive" : "active" } : c
      ),
    }))
    setToggling(null)
  }

  const statusTag = (c: Channel) =>
    c.status === "active" ? <Tag tone="success">เปิดใช้งาน</Tag> : <Tag tone="default">ปิดใช้งาน</Tag>

  const actions = (c: Channel) =>
    editable && (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<Key className="size-3.5" />} onClick={() => setRotating(c)}>
          ออก key ใหม่
        </Button>
        <Button size="sm" variant={c.status === "active" ? "danger" : "default"} onClick={() => setToggling(c)}>
          {c.status === "active" ? "ปิด" : "เปิด"}
        </Button>
      </div>
    )

  return (
    <PageCard>
      <PageHeader
        title="ช่องทางและ API key"
        description="ช่องทางขายที่ส่งคำสั่งซื้อเข้ามา แต่ละช่องทางใช้ API key ของตัวเอง"
        extra={
          editable && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
              เพิ่มช่องทาง
            </Button>
          )
        }
      >
        <Alert type="info">
          แต่ละช่องทางขาย (เว็บไซต์, Shopee, Lazada, TikTok Shop, หน้าร้าน) ใช้ API key ของตัวเองส่งคำสั่งซื้อเข้า CRM
          · ระบบเก็บเฉพาะส่วนต้นของ key และแสดง key เต็มเพียงครั้งเดียวตอนสร้าง
        </Alert>
      </PageHeader>

      {channels.length === 0 ? (
        <EmptyState>ยังไม่มีช่องทาง — เพิ่มช่องทางแรกเพื่อรับคำสั่งซื้อ</EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>ช่องทาง</Th>
                  <Th>ประเภท</Th>
                  <Th>API key</Th>
                  <Th>ใช้ล่าสุด</Th>
                  <Th className="text-right">คำสั่งซื้อ</Th>
                  <Th>สถานะ</Th>
                  {editable && <Th />}
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => {
                  const key = activeKey(c)
                  return (
                    <tr key={c.id}>
                      <Td>
                        {c.name}
                        <span className="block text-xs text-content-quiet">สร้าง {formatDate(c.createdAt)}</span>
                      </Td>
                      <Td>{channelTypeLabel[c.type]}</Td>
                      <Td className="font-mono text-[13px]">{key ? `${key.prefix}••••••••` : "-"}</Td>
                      <Td>{key?.lastUsedAt ? formatDateTime(key.lastUsedAt) : "ยังไม่เคยใช้"}</Td>
                      <Td className="text-right tabular-nums">{ordersOf(c)}</Td>
                      <Td>{statusTag(c)}</Td>
                      {editable && <Td>{actions(c)}</Td>}
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {channels.map((c) => {
              const key = activeKey(c)
              return (
                <MobileCard key={c.id}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{c.name}</span>
                    {statusTag(c)}
                  </div>
                  <p className="mt-1 text-content-secondary">
                    {channelTypeLabel[c.type]} · {ordersOf(c)} คำสั่งซื้อ
                  </p>
                  <p className="mt-1 font-mono text-xs text-content-quiet">
                    {key ? `${key.prefix}••••••••` : "ไม่มี key"}
                  </p>
                  <div className="mt-3">{actions(c)}</div>
                </MobileCard>
              )
            })}
          </div>
        </>
      )}

      {adding && (
        <AddChannelModal
          companyId={companyId}
          onClose={() => setAdding(false)}
          onCreated={(channel, secret) => {
            setAdding(false)
            setRevealed({ channel, secret })
          }}
        />
      )}
      <ConfirmModal
        open={!!rotating}
        title="ออก API key ใหม่"
        confirmLabel="ออก key ใหม่"
        message={
          <>
            key เดิมของ <b>{rotating?.name}</b> จะใช้ไม่ได้ทันที ระบบของช่องทางนี้ต้องเปลี่ยนไปใช้ key ใหม่
          </>
        }
        onClose={() => setRotating(null)}
        onConfirm={() => rotate(rotating!)}
      />
      <ConfirmModal
        open={!!toggling}
        title={toggling?.status === "active" ? "ปิดช่องทาง" : "เปิดช่องทาง"}
        confirmLabel="ยืนยัน"
        message={
          toggling?.status === "active" ? (
            <>
              ปิด <b>{toggling?.name}</b> — คำสั่งซื้อจากช่องทางนี้จะถูกปฏิเสธจนกว่าจะเปิดอีกครั้ง
            </>
          ) : (
            <>
              เปิด <b>{toggling?.name}</b> ให้รับคำสั่งซื้ออีกครั้ง
            </>
          )
        }
        onClose={() => setToggling(null)}
        onConfirm={() => toggle(toggling!)}
      />
      {revealed && <KeyModal {...revealed} onClose={() => setRevealed(null)} />}
    </PageCard>
  )
}

function AddChannelModal({
  companyId,
  onClose,
  onCreated,
}: {
  companyId: string
  onClose: () => void
  onCreated: (channelName: string, secret: string) => void
}) {
  const { data, setData } = usePortal()
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<ChannelType>("website")
  const [error, setError] = React.useState("")

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return setError("กรุณากรอกชื่อช่องทาง")
    const taken = data.channels.some(
      (c) => c.companyId === companyId && c.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (taken) return setError("ชื่อช่องทางนี้มีอยู่แล้ว")
    const { key, secret } = newKey()
    setData((d) => ({
      ...d,
      channels: [
        ...d.channels,
        {
          id: newId("ch"),
          companyId,
          type,
          name: trimmed,
          status: "active",
          createdAt: today(),
          apiKeys: [key],
        },
      ],
    }))
    onCreated(trimmed, secret)
  }

  return (
    <Modal
      open
      title="เพิ่มช่องทาง"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={save}>
            สร้างและออก API key
          </Button>
        </>
      }
    >
      <Field label="ชื่อช่องทาง" required error={error} hint="เช่น Shopee ร้านที่ 3, หน้าร้าน สาขาบางนา">
        <TextInput
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError("")
          }}
        />
      </Field>
      <Field label="ประเภท">
        <Select
          value={type}
          onChange={(v) => setType(v as ChannelType)}
          options={(Object.keys(channelTypeLabel) as ChannelType[]).map((t) => ({
            value: t,
            label: channelTypeLabel[t],
          }))}
        />
      </Field>
      {type !== "website" && type !== "pos" && (
        <Alert type="info">
          หลังสร้างแล้ว ให้ map รหัสร้านของ {channelTypeLabel[type]} กับช่องทางนี้ที่หน้า “Mapping ร้านค้า”
        </Alert>
      )}
    </Modal>
  )
}

function KeyModal({
  channel,
  secret,
  onClose,
}: {
  channel: string
  secret: string
  onClose: () => void
}) {
  const [copied, setCopied] = React.useState(false)
  return (
    <Modal open title={`API key ของ ${channel}`} onClose={onClose} footer={<Button onClick={onClose}>ปิด</Button>}>
      <Alert type="warning">คัดลอกเก็บไว้ตอนนี้ — ปิดหน้าต่างนี้แล้วจะดู key เต็มอีกไม่ได้</Alert>
      <div className="flex gap-2">
        <TextInput value={secret} readOnly className="font-mono text-[13px]" />
        <Button
          icon={<Copy className="size-4" />}
          onClick={() => {
            navigator.clipboard?.writeText(secret).catch(() => {})
            setCopied(true)
          }}
        >
          {copied ? "คัดลอกแล้ว" : "คัดลอก"}
        </Button>
      </div>
      <p className="text-xs text-content-quiet">
        ส่งใน header <code className="rounded bg-raised px-1">X-API-Key</code> ทุกครั้งที่ส่งคำสั่งซื้อเข้า CRM
      </p>
    </Modal>
  )
}
