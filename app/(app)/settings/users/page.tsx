"use client"

import * as React from "react"
import { Plus } from "@phosphor-icons/react"

import { formatDate, today, type User } from "@/lib/portal/data"
import { newId, usePortal } from "@/lib/portal/store"
import { Forbidden, NoCompany } from "@/components/portal/shell"
import {
  Button,
  Checkbox,
  ConfirmModal,
  EmptyState,
  Field,
  MobileCard,
  Modal,
  PageCard,
  PageHeader,
  PasswordInput,
  SearchBox,
  Select,
  Table,
  Td,
  TextInput,
  Th,
} from "@/components/portal/ui"

export default function UsersPage() {
  const { data, setData, session, user: me, can } = usePortal()
  const [query, setQuery] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [editing, setEditing] = React.useState<User | "new" | null>(null)
  const [deleting, setDeleting] = React.useState<User | null>(null)

  if (!can("users.read")) return <Forbidden />
  const companyId = session?.currentCompanyId
  if (!companyId) return <NoCompany />

  const roleName = (code: string) => data.roles.find((r) => r.code === code)?.name ?? code
  const canWrite = can("users.write")

  const rows = data.users
    .filter((u) => u.companyIds.includes(companyId))
    .filter((u) => u.email.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((u) => roleFilter === "all" || u.roleCode === roleFilter)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  // Super admins and your own account cannot be deleted from here.
  const deletable = (u: User) => canWrite && u.roleCode !== "super_admin" && u.id !== me?.id

  return (
    <PageCard>
      <PageHeader
        title="ผู้ใช้งาน"
        description="บัญชีที่เข้าใช้ Admin Portal พร้อมบทบาทและบริษัทที่ดูข้อมูลได้"
        extra={
          canWrite && (
            <Button
              variant="primary"
              icon={<Plus className="size-4" />}
              onClick={() => setEditing("new")}
            >
              เพิ่มผู้ใช้งาน
            </Button>
          )
        }
      >
        <div className="-mt-2 flex flex-col gap-3 sm:flex-row">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาอีเมล"
            className="sm:w-[280px]"
          />
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            prefix="บทบาท"
            options={[
              { value: "all", label: "ทั้งหมด" },
              ...data.roles.map((r) => ({ value: r.code, label: r.name })),
            ]}
            className="sm:w-[180px]"
          />
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState>ไม่พบผู้ใช้งาน</EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th className="w-[33%]">อีเมล</Th>
                  <Th>บทบาท</Th>
                  <Th>Super Admin</Th>
                  <Th>สร้างเมื่อ</Th>
                  <Th className="w-[17%]" />
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <Td>{u.email}</Td>
                    <Td>{roleName(u.roleCode)}</Td>
                    <Td>{u.roleCode === "super_admin" ? "✓" : "-"}</Td>
                    <Td>{formatDate(u.createdAt)}</Td>
                    <Td>
                      {canWrite && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setEditing(u)}>
                            แก้ไข
                          </Button>
                          {deletable(u) && (
                            <Button size="sm" variant="danger" onClick={() => setDeleting(u)}>
                              ลบ
                            </Button>
                          )}
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((u) => (
              <MobileCard key={u.id}>
                <p className="font-semibold break-all">{u.email}</p>
                <p className="mt-1 text-content-quiet">
                  {roleName(u.roleCode)} · สร้าง {formatDate(u.createdAt)}
                </p>
                {canWrite && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => setEditing(u)}>
                      แก้ไข
                    </Button>
                    {deletable(u) && (
                      <Button size="sm" variant="danger" onClick={() => setDeleting(u)}>
                        ลบ
                      </Button>
                    )}
                  </div>
                )}
              </MobileCard>
            ))}
          </div>
        </>
      )}

      {editing && (
        <UserModal
          user={editing === "new" ? null : editing}
          currentCompanyId={companyId}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        title="ลบผู้ใช้งาน"
        message={
          <>
            ต้องการลบ <b>{deleting?.email}</b> ใช่หรือไม่
          </>
        }
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const id = deleting!.id
          setData((d) => ({ ...d, users: d.users.filter((u) => u.id !== id) }))
          setDeleting(null)
        }}
      />
    </PageCard>
  )
}

function UserModal({
  user,
  currentCompanyId,
  onClose,
}: {
  user: User | null
  currentCompanyId: string
  onClose: () => void
}) {
  const { data, setData } = usePortal()
  const [email, setEmail] = React.useState(user?.email ?? "")
  const [password, setPassword] = React.useState("")
  const [companyIds, setCompanyIds] = React.useState<string[]>(
    user?.companyIds ?? [currentCompanyId]
  )
  const [roleCode, setRoleCode] = React.useState(user?.roleCode ?? "")
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // super_admin is created with make seed-admin, not here; users get one of
  // the company roles (admin, manager, staff, viewer, or a custom one).
  const roleOptions = data.roles
    .filter((r) => r.code !== "super_admin" || user?.roleCode === "super_admin")
    .map((r) => ({ value: r.code, label: r.name }))

  function save() {
    const next: Record<string, string> = {}
    const trimmed = email.trim().toLowerCase()
    if (!user) {
      if (!/^\S+@\S+\.\S+$/.test(trimmed)) next.email = "กรุณากรอกอีเมลให้ถูกต้อง"
      else if (data.users.some((u) => u.email.toLowerCase() === trimmed))
        next.email = "อีเมลนี้มีผู้ใช้งานแล้ว"
      if (password.length < 8) next.password = "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร"
    }
    if (companyIds.length === 0) next.companies = "กรุณาเลือกอย่างน้อย 1 บริษัท"
    if (!roleCode) next.role = "กรุณาเลือกบทบาท"
    setErrors(next)
    if (Object.keys(next).length) return

    setData((d) => ({
      ...d,
      users: user
        ? d.users.map((u) => (u.id === user.id ? { ...u, companyIds, roleCode } : u))
        : [
            ...d.users,
            {
              id: newId("u"),
              email: trimmed,
              password,
              companyIds,
              roleCode,
              createdAt: today(),
            },
          ],
    }))
    onClose()
  }

  return (
    <Modal
      open
      title={user ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
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
      <Field label="อีเมล" required error={errors.email}>
        <TextInput
          type="email"
          value={email}
          disabled={!!user}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      {!user && (
        <Field
          label="รหัสผ่านชั่วคราว"
          required
          error={errors.password}
          hint="ผู้ใช้งานควรเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก (ยังไม่มีระบบเปลี่ยนรหัสผ่านบังคับในเวอร์ชันนี้)"
        >
          <PasswordInput
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      )}
      <Field label="บริษัทที่เกี่ยวข้อง" required error={errors.companies}>
        <div className="flex flex-col gap-1">
          {data.companies.map((c) => {
            // The company you are working in stays ticked for new users.
            const locked = !user && c.id === currentCompanyId
            const checked = companyIds.includes(c.id)
            return (
              <label
                key={c.id}
                className={
                  locked ? "flex items-center gap-2 text-sm text-content-disabled" : "flex items-center gap-2 text-sm"
                }
              >
                <Checkbox
                  checked={checked}
                  disabled={locked}
                  aria-label={c.name}
                  onChange={(v) =>
                    setCompanyIds((ids) => (v ? [...ids, c.id] : ids.filter((id) => id !== c.id)))
                  }
                />
                {c.name}
              </label>
            )
          })}
        </div>
      </Field>
      <Field label="บทบาท" required error={errors.role}>
        <Select
          value={roleCode}
          onChange={setRoleCode}
          placeholder="เลือกบทบาท"
          options={roleOptions}
        />
      </Field>
    </Modal>
  )
}
