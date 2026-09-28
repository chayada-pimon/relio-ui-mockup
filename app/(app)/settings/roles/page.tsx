"use client"

import * as React from "react"
import { Plus } from "@phosphor-icons/react"

import { formatDate, permissions, today, type PermissionCode, type Role } from "@/lib/portal/data"
import { usePortal } from "@/lib/portal/store"
import { Forbidden } from "@/components/portal/shell"
import {
  Alert,
  Button,
  Checkbox,
  ConfirmModal,
  Field,
  MobileCard,
  Modal,
  PageCard,
  PageHeader,
  Table,
  Td,
  TextInput,
  Th,
} from "@/components/portal/ui"

const total = permissions.length

export default function RolesPage() {
  const { data, setData, isSuperAdmin } = usePortal()
  const [editing, setEditing] = React.useState<Role | "new" | null>(null)
  const [deleting, setDeleting] = React.useState<Role | null>(null)

  if (!isSuperAdmin) return <Forbidden />

  const actions = (r: Role) => (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => setEditing(r)}>
        {r.code === "super_admin" ? "ดู" : "แก้ไข"}
      </Button>
      {!r.system && (
        <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>
          ลบ
        </Button>
      )}
    </div>
  )

  return (
    <PageCard>
      <PageHeader
        title="สิทธิ์การใช้งาน"
        description="บทบาทกำหนดว่าผู้ใช้แต่ละคนดูหรือแก้ไขเมนูไหนได้บ้าง"
        extra={
          <Button
            variant="primary"
            icon={<Plus className="size-4" />}
            onClick={() => setEditing("new")}
          >
            เพิ่มบทบาท
          </Button>
        }
      >
        <Alert type="info">หน้านี้แสดงข้อมูลของทุกบทบาทในระบบ ไม่ขึ้นกับบริษัทที่เลือกไว้ด้านบน</Alert>
        <Alert type="warning" className="-mt-2">
          การกำหนดสิทธิ์ในหน้านี้มีผลจริงกับผู้ใช้งาน แต่จะมีผลก็ต่อเมื่อผู้ใช้งานได้รับ access token
          ใหม่เท่านั้น — อาจใช้เวลาไม่เกิน 15 นาที (อายุของ access token) กว่าการเปลี่ยนแปลงจะมีผล
        </Alert>
      </PageHeader>

      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>ชื่อบทบาท</Th>
              <Th>Code</Th>
              <Th>จำนวนสิทธิ์</Th>
              <Th>ระบบ</Th>
              <Th>สร้างเมื่อ</Th>
              <Th className="w-[14%]" />
            </tr>
          </thead>
          <tbody>
            {data.roles.map((r) => (
              <tr key={r.code}>
                <Td>{r.name}</Td>
                <Td>{r.code}</Td>
                <Td>
                  {r.permissions.length}/{total}
                </Td>
                <Td>{r.system ? "✓" : "-"}</Td>
                <Td>{r.createdAt ? formatDate(r.createdAt) : "(seed)"}</Td>
                <Td>{actions(r)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {data.roles.map((r) => (
          <MobileCard key={r.code}>
            <p className="font-semibold">{r.name}</p>
            <p className="mt-1 text-content-quiet">
              {r.code} · {r.permissions.length}/{total} สิทธิ์ · {r.system ? "ระบบ" : "กำหนดเอง"}
            </p>
            <div className="mt-3">{actions(r)}</div>
          </MobileCard>
        ))}
      </div>

      {editing && (
        <RoleModal role={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmModal
        open={!!deleting}
        title="ลบบทบาท"
        message={
          data.users.some((u) => u.roleCode === deleting?.code) ? (
            <>ยังมีผู้ใช้งานที่ใช้บทบาท <b>{deleting?.name}</b> อยู่ ต้องเปลี่ยนบทบาทของผู้ใช้เหล่านั้นก่อน</>
          ) : (
            <>
              ต้องการลบบทบาท <b>{deleting?.name}</b> ใช่หรือไม่
            </>
          )
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const code = deleting!.code
          if (!data.users.some((u) => u.roleCode === code)) {
            setData((d) => ({ ...d, roles: d.roles.filter((r) => r.code !== code) }))
          }
          setDeleting(null)
        }}
      />
    </PageCard>
  )
}

function RoleModal({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const { data, setData } = usePortal()
  const readOnly = role?.code === "super_admin"
  const [name, setName] = React.useState(role?.name ?? "")
  const [code, setCode] = React.useState(role?.code ?? "")
  const [selected, setSelected] = React.useState<PermissionCode[]>(role?.permissions ?? [])
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const groups = [...new Set(permissions.map((p) => p.group))]

  function save() {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "กรุณากรอกชื่อบทบาท"
    if (!role) {
      if (!/^[a-z][a-z0-9_]*$/.test(code)) next.code = "ใช้ตัวพิมพ์เล็ก a–z ตัวเลข และ _ เท่านั้น"
      else if (data.roles.some((r) => r.code === code)) next.code = "Code นี้ถูกใช้แล้ว"
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setData((d) => ({
      ...d,
      roles: role
        ? d.roles.map((r) =>
            r.code === role.code ? { ...r, name: name.trim(), permissions: selected } : r
          )
        : [
            ...d.roles,
            {
              code,
              name: name.trim(),
              permissions: selected,
              system: false,
              createdAt: today(),
            },
          ],
    }))
    onClose()
  }

  return (
    <Modal
      open
      width={640}
      title={readOnly ? "ดูบทบาท" : role ? "แก้ไขบทบาท" : "เพิ่มบทบาทใหม่"}
      onClose={onClose}
      footer={
        readOnly ? (
          <Button onClick={onClose}>ปิด</Button>
        ) : (
          <>
            <Button onClick={onClose}>ยกเลิก</Button>
            <Button variant="primary" onClick={save}>
              บันทึก
            </Button>
          </>
        )
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="ชื่อบทบาท" required error={errors.name}>
          <TextInput value={name} disabled={readOnly} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Code" required error={errors.code}>
          <TextInput
            value={code}
            disabled={!!role}
            className="font-mono"
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
      </div>
      <Field label={`สิทธิ์ (${selected.length}/${total})`}>
        <div className="grid gap-4 rounded-lg border border-line p-4 sm:grid-cols-2">
          {groups.map((group) => (
            <div key={group} className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-content-quiet">{group}</p>
              {permissions
                .filter((p) => p.group === group)
                .map((p) => (
                  <label key={p.code} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selected.includes(p.code)}
                      disabled={readOnly}
                      aria-label={p.label}
                      onChange={(v) =>
                        setSelected((s) => (v ? [...s, p.code] : s.filter((c) => c !== p.code)))
                      }
                    />
                    <span>{p.label}</span>
                    <code className="ml-auto text-xs text-content-disabled">{p.code}</code>
                  </label>
                ))}
            </div>
          ))}
        </div>
      </Field>
    </Modal>
  )
}
