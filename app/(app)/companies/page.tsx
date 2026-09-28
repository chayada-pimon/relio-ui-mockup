"use client"

import * as React from "react"
import { Copy, Plus } from "@phosphor-icons/react"

import { formatDate, today, type Company, type CompanyStatus } from "@/lib/portal/data"
import { newId, usePortal } from "@/lib/portal/store"
import { Forbidden } from "@/components/portal/shell"
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
  TextInput,
  Th,
} from "@/components/portal/ui"

type SortKey = "name" | "createdAt"

const statusLabel: Record<CompanyStatus, string> = {
  active: "ใช้งานอยู่",
  inactive: "ปิดใช้งาน",
}

export default function CompaniesPage() {
  const { data, setData, isSuperAdmin } = usePortal()
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc",
  })
  const [editing, setEditing] = React.useState<Company | "new" | null>(null)
  const [deleting, setDeleting] = React.useState<Company | null>(null)

  if (!isSuperAdmin) return <Forbidden />

  const rows = data.companies
    .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((c) => status === "all" || c.status === status)
    .sort((a, b) => {
      const cmp =
        sort.key === "name"
          ? a.name.localeCompare(b.name, "th")
          : a.createdAt.localeCompare(b.createdAt)
      return sort.dir === "asc" ? cmp : -cmp
    })

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))
  const sortOf = (key: SortKey) => (sort.key === key ? sort.dir : null)

  const empty = data.companies.length === 0

  return (
    <PageCard>
      <PageHeader
        title="บริษัท"
        description="บริษัทที่ใช้ระบบนี้ แต่ละบริษัทแยกข้อมูลลูกค้า คำสั่งซื้อ และแต้มออกจากกัน"
        extra={
          <Button
            variant="primary"
            icon={<Plus className="size-4" />}
            onClick={() => setEditing("new")}
          >
            {empty ? "เพิ่มบริษัทแรก" : "เพิ่มบริษัท"}
          </Button>
        }
      >
        <Alert type="info">หน้านี้แสดงข้อมูลของทุกบริษัท ไม่ขึ้นกับบริษัทที่เลือกไว้ด้านบน</Alert>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาชื่อบริษัท"
            className="sm:w-[280px]"
          />
          <Select
            value={status}
            onChange={setStatus}
            prefix="สถานะ"
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "active", label: statusLabel.active },
              { value: "inactive", label: statusLabel.inactive },
            ]}
            className="sm:w-40"
          />
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState>{empty ? "ยังไม่มีบริษัท" : "ไม่พบบริษัทที่ตรงกับเงื่อนไข"}</EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th sort={sortOf("name")} onSort={() => toggleSort("name")} className="w-[28%]">
                    ชื่อบริษัท
                  </Th>
                  <Th>สถานะ</Th>
                  <Th sort={sortOf("createdAt")} onSort={() => toggleSort("createdAt")}>
                    สร้างเมื่อ
                  </Th>
                  <Th>แก้ไขล่าสุด</Th>
                  <Th className="w-[20%]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <Td highlight={sort.key === "name"}>{c.name}</Td>
                    <Td>
                      <Tag tone={c.status === "active" ? "success" : "default"}>
                        {statusLabel[c.status]}
                      </Tag>
                    </Td>
                    <Td highlight={sort.key === "createdAt"}>{formatDate(c.createdAt)}</Td>
                    <Td>{formatDate(c.updatedAt)}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setEditing(c)}>
                          แก้ไข
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleting(c)}>
                          ลบ
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((c) => (
              <MobileCard key={c.id}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{c.name}</span>
                  <Tag tone={c.status === "active" ? "success" : "default"}>
                    {statusLabel[c.status]}
                  </Tag>
                </div>
                <p className="mt-1 text-content-quiet">
                  สร้าง {formatDate(c.createdAt)} · แก้ไข {formatDate(c.updatedAt)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => setEditing(c)}>
                    แก้ไข
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleting(c)}>
                    ลบ
                  </Button>
                </div>
              </MobileCard>
            ))}
          </div>
        </>
      )}

      {editing && (
        <CompanyModal
          company={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        title="ลบบริษัท"
        message={
          <>
            ต้องการลบ <b>{deleting?.name}</b> ใช่หรือไม่ ผู้ใช้งานที่ผูกกับบริษัทนี้จะเข้าถึงข้อมูลของบริษัทไม่ได้อีก
          </>
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const id = deleting!.id
          setData((d) => ({
            ...d,
            companies: d.companies.filter((c) => c.id !== id),
            users: d.users.map((u) => ({
              ...u,
              companyIds: u.companyIds.filter((cid) => cid !== id),
            })),
          }))
          setDeleting(null)
        }}
      />
    </PageCard>
  )
}

function CompanyModal({ company, onClose }: { company: Company | null; onClose: () => void }) {
  const { data, setData } = usePortal()
  const [name, setName] = React.useState(company?.name ?? "")
  const [status, setStatus] = React.useState<CompanyStatus>(company?.status ?? "active")
  const [error, setError] = React.useState("")
  const [copied, setCopied] = React.useState(false)

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return setError("กรุณากรอกชื่อบริษัท")
    // The API answers 409 when the name is taken.
    const taken = data.companies.some(
      (c) => c.id !== company?.id && c.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (taken) return setError("ชื่อบริษัทนี้ถูกใช้แล้ว")

    setData((d) => ({
      ...d,
      companies: company
        ? d.companies.map((c) =>
            c.id === company.id ? { ...c, name: trimmed, status, updatedAt: today() } : c
          )
        : [
            ...d.companies,
            {
              id: newId("company"),
              name: trimmed,
              status: "active",
              createdAt: today(),
              updatedAt: today(),
            },
          ],
    }))
    onClose()
  }

  return (
    <Modal
      open
      title={company ? "แก้ไขบริษัท" : "เพิ่มบริษัทใหม่"}
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
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        className="flex flex-col gap-5"
      >
        <Field label="ชื่อบริษัท" required error={error}>
          <TextInput
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError("")
            }}
          />
        </Field>
        {company && (
          <>
            <Field label="สถานะ">
              <Select
                value={status}
                onChange={(v) => setStatus(v as CompanyStatus)}
                options={[
                  { value: "active", label: statusLabel.active },
                  { value: "inactive", label: statusLabel.inactive },
                ]}
              />
            </Field>
            <Field
              label="รหัสบริษัท"
              hint="ใช้กับ make seed-admin SEED_ADMIN_COMPANY_IDS=<รหัสบริษัท>"
            >
              <div className="flex gap-2">
                <TextInput value={company.id} readOnly className="font-mono" />
                <Button
                  icon={<Copy className="size-4" />}
                  onClick={() => {
                    navigator.clipboard?.writeText(company.id).catch(() => {})
                    setCopied(true)
                  }}
                >
                  {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                </Button>
              </div>
            </Field>
          </>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
