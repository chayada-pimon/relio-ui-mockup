"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { WarningCircle, Funnel } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import {
  duplicatesOf,
  formatDate,
  maskEmail,
  maskPhone,
  matchesSearch,
  type Customer,
} from "@/lib/portal/data"
import { usePortal } from "@/lib/portal/store"
import { Forbidden, NoCompany } from "@/components/portal/shell"
import { CompareModal } from "@/components/portal/merge"
import {
  Button,
  Checkbox,
  EmptyState,
  MobileCard,
  PageCard,
  PageHeader,
  SearchBox,
  Select,
  Table,
  Td,
  Th,
} from "@/components/portal/ui"

export default function CustomersPage() {
  const { session, can } = usePortal()
  if (!can("customers.read")) return <Forbidden />
  if (!session?.currentCompanyId) return <NoCompany />
  // Remount per company so search and selection start fresh.
  return <CustomerList key={session.currentCompanyId} companyId={session.currentCompanyId} />
}

function DuplicateIcon() {
  return (
    <WarningCircle
      className="inline size-4 shrink-0 text-warning"
      aria-label="อาจเป็นบัญชีซ้ำ"
      role="img"
    />
  )
}

function CustomerList({ companyId }: { companyId: string }) {
  const router = useRouter()
  const { data, can } = usePortal()
  const [query, setQuery] = React.useState("")
  const [dupFilter, setDupFilter] = React.useState("all")
  const [selected, setSelected] = React.useState<string[]>([])
  const [showFilters, setShowFilters] = React.useState(false)
  const [comparing, setComparing] = React.useState<[Customer, Customer] | null>(null)

  const all = data.customers.filter((c) => c.companyId === companyId)
  const isDup = (c: Customer) => duplicatesOf(data, c).length > 0
  const rows = all
    .filter((c) => matchesSearch(c, query))
    .filter((c) => dupFilter === "all" || (dupFilter === "suspected") === isDup(c))
    .sort((a, b) => a.id.localeCompare(b.id))

  const filtered = query !== "" || dupFilter !== "all"
  const canMerge = can("customers.merge")
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id))
  const someChecked = rows.some((r) => selected.includes(r.id))

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)))
  const open = (c: Customer) => router.push(`/customers/${c.id}`)

  function startMerge() {
    const [a, b] = selected.map((id) => all.find((c) => c.id === id)!)
    setComparing([a, b])
  }

  const mergeButton = canMerge && (
    <Button
      variant={selected.length === 2 ? "primary" : "default"}
      disabled={selected.length !== 2}
      title={selected.length !== 2 ? "เลือกลูกค้า 2 รายการเพื่อรวมบัญชี" : undefined}
      onClick={startMerge}
    >
      รวมบัญชี
    </Button>
  )

  const filters = (
    <>
      <Select
        value={dupFilter}
        onChange={setDupFilter}
        prefix="สถานะการตรวจสอบซ้ำ"
        options={[
          { value: "all", label: "ทั้งหมด" },
          { value: "suspected", label: "อาจซ้ำ" },
          { value: "clear", label: "ไม่พบข้อมูลซ้ำ" },
        ]}
        className="md:w-[215px]"
      />
      {filtered && (
        <Button
          onClick={() => {
            setQuery("")
            setDupFilter("all")
          }}
        >
          ล้างตัวกรอง
        </Button>
      )}
    </>
  )

  return (
    <PageCard>
      <PageHeader
        title="ลูกค้า"
        description={
          <>
            ลูกค้าทุกคนจากทุกช่องทาง รวมคนเดียวกันเป็นโปรไฟล์เดียว · <DuplicateIcon /> คือบัญชีที่อาจซ้ำกัน
          </>
        }
      >
        <div className="-mt-2 hidden flex-wrap gap-3 md:flex">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาชื่อ / เบอร์โทร / อีเมล / รหัสลูกค้า"
            className="w-[320px]"
          />
          {filters}
          {mergeButton}
        </div>
        <div className="-mt-2 flex flex-col gap-2 md:hidden">
          <SearchBox value={query} onChange={setQuery} placeholder="ค้นหา..." />
          <Button icon={<Funnel className="size-4" />} onClick={() => setShowFilters((s) => !s)}>
            ตัวกรอง
          </Button>
          {showFilters && <div className="flex flex-col gap-2">{filters}</div>}
          {selected.length > 0 && mergeButton}
        </div>
      </PageHeader>

      {rows.length === 0 ? (
        <EmptyState>
          {all.length === 0
            ? "ยังไม่มีลูกค้าในบริษัทนี้ — ลูกค้ามาจากการรับ order ของช่องทางขาย หรือสร้างผ่าน Bruno"
            : "ไม่พบลูกค้าที่ตรงกับเงื่อนไข"}
        </EmptyState>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th className="w-12 pr-0">
                    <Checkbox
                      aria-label="เลือกทั้งหมด"
                      checked={allChecked}
                      indeterminate={someChecked && !allChecked}
                      onChange={(v) =>
                        setSelected(v ? rows.map((r) => r.id) : [])
                      }
                    />
                  </Th>
                  <Th className="w-[13%]">รหัส</Th>
                  <Th className="w-[20%]">ชื่อ</Th>
                  <Th className="w-[20%]">เบอร์โทร</Th>
                  <Th className="w-[28%]">อีเมล</Th>
                  <Th>สร้างเมื่อ</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const checked = selected.includes(c.id)
                  return (
                    <tr
                      key={c.id}
                      onClick={() => open(c)}
                      className={cn(
                        "cursor-pointer",
                        checked ? "bg-selection" : "hover:bg-hover"
                      )}
                    >
                      <Td className="pr-0">
                        <Checkbox
                          aria-label={`เลือก ${c.id}`}
                          checked={checked}
                          onChange={(v) => toggle(c.id, v)}
                        />
                      </Td>
                      <Td>{c.id}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-2">
                          {c.name}
                          {isDup(c) && <DuplicateIcon />}
                        </span>
                      </Td>
                      <Td>{maskPhone(c.phone)}</Td>
                      <Td>{maskEmail(c.email)}</Td>
                      <Td>{formatDate(c.createdAt)}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((c) => (
              <MobileCard key={c.id} onClick={() => open(c)}>
                <div className="flex items-start gap-2">
                  <span className="pt-0.5">
                    <Checkbox
                      aria-label={`เลือก ${c.id}`}
                      checked={selected.includes(c.id)}
                      onChange={(v) => toggle(c.id, v)}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      {c.name}
                      {isDup(c) && <DuplicateIcon />}
                    </p>
                    <p className="text-content-secondary">
                      {c.id} · {maskPhone(c.phone)} · {maskEmail(c.email)}
                    </p>
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        </>
      )}

      <CompareModal
        pair={comparing}
        onClose={() => {
          setComparing(null)
          setSelected([])
        }}
      />
    </PageCard>
  )
}
