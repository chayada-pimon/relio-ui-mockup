"use client"

import * as React from "react"
import { Plus } from "@phosphor-icons/react"

import {
  channelTypeLabel,
  marketplaceTypes,
  type ChannelType,
  type ShopMapping,
} from "@/lib/portal/commerce"
import { formatDate, today } from "@/lib/portal/data"
import { retryEvent } from "@/lib/portal/ingest"
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

export default function MappingPage() {
  return (
    <CompanyScoped permission="integration.read">
      {(companyId) => <MappingList companyId={companyId} />}
    </CompanyScoped>
  )
}

function MappingList({ companyId }: { companyId: string }) {
  const { data, setData, can } = usePortal()
  const editable = can("integration.write")
  const [adding, setAdding] = React.useState(false)
  const [removing, setRemoving] = React.useState<ShopMapping | null>(null)
  const [notice, setNotice] = React.useState("")

  const mappings = data.mappings
    .filter((m) => m.companyId === companyId)
    .sort((a, b) => Number(!!a.channelId) - Number(!!b.channelId) || a.platform.localeCompare(b.platform))
  const channelsFor = (platform: ChannelType) =>
    data.channels.filter((c) => c.companyId === companyId && c.type === platform)
  const waiting = (m: ShopMapping) =>
    data.ingestEvents.filter(
      (e) =>
        e.companyId === companyId &&
        e.status === "failed" &&
        !e.channelId &&
        e.platform === m.platform &&
        e.externalShopId === m.externalShopId
    )
  const unmapped = mappings.filter((m) => !m.channelId)

  function assign(m: ShopMapping, channelId: string) {
    const pending = waiting(m)
    let next = {
      ...data,
      mappings: data.mappings.map((x) => (x.id === m.id ? { ...x, channelId } : x)),
    }
    // Replay the orders that were waiting for this shop.
    let replayed = 0
    for (const e of pending) {
      const result = retryEvent(next, e.id)
      next = result.data
      if (result.ok) replayed++
    }
    setData(() => next)
    setNotice(
      replayed
        ? `map ${m.externalShopId} แล้ว — รับคำสั่งซื้อที่ค้างอยู่เข้าระบบ ${replayed} รายการ`
        : `map ${m.externalShopId} แล้ว`
    )
  }

  const channelSelect = (m: ShopMapping) => (
    <Select
      aria-label={`ช่องทางของ ${m.externalShopId}`}
      value={m.channelId ?? ""}
      disabled={!editable}
      placeholder="เลือกช่องทาง"
      onChange={(v) => assign(m, v)}
      options={channelsFor(m.platform).map((c) => ({ value: c.id, label: c.name }))}
      className="w-full md:w-[220px]"
    />
  )
  const stateTag = (m: ShopMapping) =>
    m.channelId ? <Tag tone="success">map แล้ว</Tag> : <Tag tone="warning">ยังไม่ได้ map</Tag>

  return (
    <PageCard>
      <PageHeader
        title="Mapping ร้านค้า"
        description="จับคู่รหัสร้านบน Shopee, Lazada และ TikTok Shop กับช่องทางใน CRM เพื่อให้รับคำสั่งซื้อได้"
        extra={
          editable && (
            <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
              เพิ่ม mapping
            </Button>
          )
        }
      >
        <Alert type="info">
          คำสั่งซื้อจาก Shopee, Lazada และ TikTok Shop ระบุร้านด้วยรหัสร้านของแพลตฟอร์ม ต้อง map รหัสร้านกับช่องทางใน CRM
          ก่อน จึงรับคำสั่งซื้อเข้าระบบได้ · เว็บไซต์และหน้าร้านใช้ API key ของช่องทางโดยตรง
        </Alert>
        {unmapped.length > 0 && (
          <Alert type="warning">
            พบร้านใหม่ที่ยังไม่ได้ map {unmapped.length} ร้าน — คำสั่งซื้อจากร้านเหล่านี้รออยู่ที่หน้า “ติดตามการรับข้อมูล”
          </Alert>
        )}
        {notice && <Alert type="info">{notice}</Alert>}
      </PageHeader>

      {mappings.length === 0 ? (
        <EmptyState>ยังไม่มีร้านจาก marketplace</EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>แพลตฟอร์ม</Th>
                  <Th>รหัสร้าน</Th>
                  <Th>ช่องทางใน CRM</Th>
                  <Th>สถานะ</Th>
                  <Th>พบครั้งแรก</Th>
                  {editable && <Th />}
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className={m.channelId ? undefined : "bg-warning-soft"}>
                    <Td>{channelTypeLabel[m.platform]}</Td>
                    <Td className="font-mono text-[13px]">{m.externalShopId}</Td>
                    <Td>{channelSelect(m)}</Td>
                    <Td>
                      {stateTag(m)}
                      {waiting(m).length > 0 && (
                        <span className="block text-xs text-content-quiet">
                          คำสั่งซื้อรอ {waiting(m).length} รายการ
                        </span>
                      )}
                    </Td>
                    <Td>{formatDate(m.firstSeenAt)}</Td>
                    {editable && (
                      <Td>
                        <Button size="sm" variant="danger" onClick={() => setRemoving(m)}>
                          ลบ
                        </Button>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {mappings.map((m) => (
              <MobileCard key={m.id}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[13px] font-semibold">{m.externalShopId}</span>
                  {stateTag(m)}
                </div>
                <p className="mt-1 mb-2 text-content-secondary">
                  {channelTypeLabel[m.platform]} · พบครั้งแรก {formatDate(m.firstSeenAt)}
                </p>
                {channelSelect(m)}
              </MobileCard>
            ))}
          </div>
        </>
      )}

      {adding && <AddMappingModal companyId={companyId} onClose={() => setAdding(false)} />}
      <ConfirmModal
        open={!!removing}
        title="ลบ mapping"
        message={
          <>
            ลบ mapping ของร้าน <b>{removing?.externalShopId}</b> — คำสั่งซื้อใหม่จากร้านนี้จะรับเข้าไม่ได้จนกว่าจะ map อีกครั้ง
          </>
        }
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          const id = removing!.id
          setData((d) => ({ ...d, mappings: d.mappings.filter((m) => m.id !== id) }))
          setRemoving(null)
        }}
      />
    </PageCard>
  )
}

function AddMappingModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const { data, setData } = usePortal()
  const [platform, setPlatform] = React.useState<ChannelType>("shopee")
  const [shopId, setShopId] = React.useState("")
  const [channelId, setChannelId] = React.useState("")
  const [errors, setErrors] = React.useState<{ shopId?: string; channelId?: string }>({})
  const channels = data.channels.filter((c) => c.companyId === companyId && c.type === platform)

  function save() {
    const id = shopId.trim()
    const next: typeof errors = {}
    if (!id) next.shopId = "กรุณากรอกรหัสร้าน"
    else if (
      data.mappings.some((m) => m.companyId === companyId && m.platform === platform && m.externalShopId === id)
    )
      next.shopId = "รหัสร้านนี้มีอยู่แล้ว"
    if (!channelId) next.channelId = "กรุณาเลือกช่องทาง"
    setErrors(next)
    if (next.shopId || next.channelId) return
    setData((d) => ({
      ...d,
      mappings: [
        ...d.mappings,
        { id: newId("map"), companyId, platform, externalShopId: id, channelId, firstSeenAt: today() },
      ],
    }))
    onClose()
  }

  return (
    <Modal
      open
      title="เพิ่ม mapping"
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
      <Field label="แพลตฟอร์ม">
        <Select
          value={platform}
          onChange={(v) => {
            setPlatform(v as ChannelType)
            setChannelId("")
          }}
          options={marketplaceTypes.map((t) => ({ value: t, label: channelTypeLabel[t] }))}
        />
      </Field>
      <Field label="รหัสร้านบนแพลตฟอร์ม" required error={errors.shopId}>
        <TextInput className="font-mono" value={shopId} onChange={(e) => setShopId(e.target.value)} />
      </Field>
      <Field
        label="ช่องทางใน CRM"
        required
        error={errors.channelId}
        hint={channels.length === 0 ? `ยังไม่มีช่องทางประเภท ${channelTypeLabel[platform]} — เพิ่มที่หน้า “ช่องทางและ API key”` : undefined}
      >
        <Select
          value={channelId}
          onChange={setChannelId}
          placeholder="เลือกช่องทาง"
          disabled={channels.length === 0}
          options={channels.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Field>
    </Modal>
  )
}
