"use client"

import { formatDate, maskEmail, maskPhone, pairKey, type Customer } from "@/lib/portal/data"
import { usePortal } from "@/lib/portal/store"
import { Alert, Button, Modal } from "@/components/portal/ui"

/**
 * Side-by-side view of two customer records. The full merge screen is still
 * being built (CRM-22), so this only compares and lets you dismiss the flag.
 */
export function CompareModal({
  pair,
  onClose,
}: {
  pair: [Customer, Customer] | null
  onClose: () => void
}) {
  const { setData } = usePortal()
  if (!pair) return null
  const [a, b] = pair

  const fields: { label: string; value: (c: Customer) => string }[] = [
    { label: "รหัส", value: (c) => c.id },
    { label: "ชื่อ-นามสกุล", value: (c) => c.name },
    { label: "เบอร์โทร", value: (c) => maskPhone(c.phone) },
    { label: "อีเมล", value: (c) => maskEmail(c.email) },
    { label: "สร้างเมื่อ", value: (c) => formatDate(c.createdAt) },
  ]

  function notSamePerson() {
    setData((d) => ({ ...d, notDuplicate: [...d.notDuplicate, pairKey(a.id, b.id)] }))
    onClose()
  }

  return (
    <Modal
      open
      width={640}
      title="เปรียบเทียบบัญชีลูกค้า"
      onClose={onClose}
      footer={
        <>
          <Button onClick={notSamePerson}>ไม่ใช่คนเดียวกัน</Button>
          <Button variant="primary" disabled title="อยู่ระหว่างพัฒนา (CRM-22)">
            รวมบัญชี
          </Button>
        </>
      }
    >
      <Alert type="info">หน้ารวมบัญชีแบบเต็มยังอยู่ระหว่างพัฒนา (CRM-22)</Alert>
      <div className="overflow-hidden rounded-lg border border-line text-sm">
        {fields.map((f) => {
          const differs = f.label !== "รหัส" && f.value(a) !== f.value(b)
          return (
            <div
              key={f.label}
              className="grid grid-cols-[110px_1fr_1fr] border-b border-line last:border-b-0"
            >
              <span className="bg-raised px-3 py-2.5 text-content-quiet">{f.label}</span>
              {[a, b].map((c) => (
                <span
                  key={c.id}
                  className={differs ? "bg-warning-soft px-3 py-2.5" : "px-3 py-2.5"}
                >
                  {f.value(c)}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
