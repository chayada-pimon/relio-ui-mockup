// Mock data for the CRM Center Admin Portal, mirroring the screens in the
// team's run guide (25 ก.ย. 2569). All people and companies are fictional.

import {
  seedAdjustments,
  seedChannels,
  seedIngestEvents,
  seedLoyalty,
  seedMappings,
  seedOrders,
  seedRedemptions,
  seedRewards,
  type Channel,
  type IngestEvent,
  type LoyaltySettings,
  type Order,
  type PointAdjustment,
  type Redemption,
  type Reward,
  type ShopMapping,
} from "@/lib/portal/commerce"

export type CompanyStatus = "active" | "inactive"

export type Company = {
  id: string
  name: string
  status: CompanyStatus
  createdAt: string
  updatedAt: string
}

export type PermissionCode =
  | "customers.read"
  | "customers.write"
  | "customers.merge"
  | "customers.pii"
  | "orders.read"
  | "orders.write"
  | "loyalty.read"
  | "loyalty.write"
  | "integration.read"
  | "integration.write"
  | "users.read"
  | "users.write"
  | "roles.manage"
  | "companies.manage"

export const permissions: { code: PermissionCode; label: string; group: string }[] = [
  { code: "customers.read", label: "ดูข้อมูลลูกค้า", group: "ลูกค้า" },
  { code: "customers.write", label: "สร้าง/แก้ไขลูกค้า", group: "ลูกค้า" },
  { code: "customers.merge", label: "รวมบัญชีลูกค้า", group: "ลูกค้า" },
  { code: "customers.pii", label: "เปิดดูเบอร์โทร/อีเมลเต็ม", group: "ลูกค้า" },
  { code: "orders.read", label: "ดูคำสั่งซื้อ", group: "คำสั่งซื้อ" },
  { code: "orders.write", label: "จัดการคำสั่งซื้อ", group: "คำสั่งซื้อ" },
  { code: "loyalty.read", label: "ดูแต้มและสิทธิประโยชน์", group: "สิทธิประโยชน์" },
  { code: "loyalty.write", label: "ตั้งค่ากติกาแต้ม", group: "สิทธิประโยชน์" },
  { code: "integration.read", label: "ดูการเชื่อมต่อระบบ", group: "การเชื่อมต่อระบบ" },
  { code: "integration.write", label: "จัดการช่องทางและ API key", group: "การเชื่อมต่อระบบ" },
  { code: "users.read", label: "ดูผู้ใช้งาน", group: "ตั้งค่า" },
  { code: "users.write", label: "เพิ่ม/แก้ไขผู้ใช้งาน", group: "ตั้งค่า" },
  { code: "roles.manage", label: "จัดการสิทธิ์การใช้งาน", group: "ตั้งค่า" },
  { code: "companies.manage", label: "จัดการบริษัท", group: "บริษัท" },
]

export type Role = {
  code: string
  name: string
  permissions: PermissionCode[]
  /** Seeded by the system; cannot be deleted. */
  system: boolean
  createdAt?: string
}

export type User = {
  id: string
  email: string
  roleCode: string
  companyIds: string[]
  createdAt: string
  password: string
}

export type Customer = {
  id: string
  companyId: string
  name: string
  phone?: string
  email?: string
  createdAt: string
  /** Customers sharing a key are flagged as possible duplicates. */
  duplicateKey?: string
  /** PDPA consent for marketing messages. */
  consent?: { marketing: boolean; updatedAt: string; source: string }
}

export type PortalData = {
  companies: Company[]
  roles: Role[]
  users: User[]
  customers: Customer[]
  /** Pairs marked "ไม่ใช่คนเดียวกัน", stored as "idA|idB" (sorted). */
  notDuplicate: string[]
  channels: Channel[]
  mappings: ShopMapping[]
  orders: Order[]
  ingestEvents: IngestEvent[]
  loyalty: LoyaltySettings[]
  rewards: Reward[]
  redemptions: Redemption[]
  adjustments: PointAdjustment[]
}

const allPermissions = permissions.map((p) => p.code)

/** Demo password for every seeded account. */
export const DEMO_PASSWORD = "CrmCenter@2569"

export const seedData: PortalData = {
  companies: [
    {
      id: "company-a",
      name: "บริษัท ตัวอย่าง เอ จำกัด",
      status: "active",
      createdAt: "2026-01-10",
      updatedAt: "2026-01-10",
    },
    {
      id: "company-b",
      name: "บริษัท ตัวอย่าง บี จำกัด",
      status: "active",
      createdAt: "2026-02-15",
      updatedAt: "2026-02-15",
    },
  ],
  roles: [
    { code: "super_admin", name: "Super Admin", permissions: allPermissions, system: true },
    {
      code: "admin",
      name: "Admin",
      permissions: allPermissions.filter(
        (p) => p !== "roles.manage" && p !== "companies.manage"
      ),
      system: true,
    },
    {
      code: "manager",
      name: "Manager",
      permissions: [
        "customers.read",
        "customers.write",
        "customers.merge",
        "orders.read",
        "loyalty.read",
        "users.read",
      ],
      system: true,
    },
    { code: "staff", name: "Staff", permissions: ["customers.read", "orders.read"], system: true },
    {
      code: "viewer",
      name: "Viewer",
      permissions: ["customers.read", "orders.read", "loyalty.read"],
      system: true,
    },
  ],
  users: [
    {
      id: "u-admin",
      email: "admin@exampleco.co.th",
      roleCode: "super_admin",
      companyIds: ["company-a", "company-b"],
      createdAt: "2026-01-11",
      password: DEMO_PASSWORD,
    },
    {
      id: "u-manager-a",
      email: "manager.a@exampleco.co.th",
      roleCode: "manager",
      companyIds: ["company-a"],
      createdAt: "2026-01-20",
      password: DEMO_PASSWORD,
    },
    {
      id: "u-staff-a",
      email: "staff.a@exampleco.co.th",
      roleCode: "staff",
      companyIds: ["company-a"],
      createdAt: "2026-02-01",
      password: DEMO_PASSWORD,
    },
    {
      id: "u-viewer-b",
      email: "viewer.b@exampleco.co.th",
      roleCode: "viewer",
      companyIds: ["company-a", "company-b"],
      createdAt: "2026-02-05",
      password: DEMO_PASSWORD,
    },
  ],
  customers: [
    {
      id: "C-0001",
      companyId: "company-a",
      name: "สมชาย ใจดี",
      phone: "0811112234",
      email: "somchai@example.com",
      createdAt: "2026-03-01",
      duplicateKey: "somchai",
      consent: { marketing: true, updatedAt: "2026-03-01", source: "เว็บไซต์บริษัท" },
    },
    {
      id: "C-0002",
      companyId: "company-a",
      name: "สมหญิง รักเรียน",
      phone: "0892223567",
      email: "somying@gmail.com",
      createdAt: "2026-03-02",
      consent: { marketing: true, updatedAt: "2026-04-05", source: "Shopee ร้านที่ 1" },
    },
    {
      id: "C-0003",
      companyId: "company-a",
      name: "วิชัย พัฒนากิจ",
      phone: "0823334789",
      createdAt: "2026-03-03",
    },
    {
      id: "C-0004",
      companyId: "company-a",
      name: "อรทัย มั่นคงดี",
      email: "orathai@hotmail.com",
      createdAt: "2026-03-04",
      consent: { marketing: false, updatedAt: "2026-07-21", source: "ติดต่อ Call center" },
    },
    {
      id: "C-0005",
      companyId: "company-a",
      name: "ธนกร แสงทองดี",
      phone: "0954445321",
      email: "thanakorn@example.com",
      createdAt: "2025-09-20",
      consent: { marketing: true, updatedAt: "2025-10-02", source: "เว็บไซต์บริษัท" },
    },
    {
      id: "C-0006",
      companyId: "company-a",
      name: "สมชาย ใจดี",
      phone: "0811112234",
      email: "somchai@example.com",
      createdAt: "2026-03-06",
      duplicateKey: "somchai",
    },
    {
      id: "C-0007",
      companyId: "company-a",
      name: "พิมพ์ชนก ศรีสุข",
      phone: "0985556654",
      email: "pimchanok@example.com",
      createdAt: "2026-03-07",
      consent: { marketing: true, updatedAt: "2026-08-08", source: "TikTok Shop" },
    },
    {
      id: "C-0008",
      companyId: "company-a",
      name: "สมใจ มีสุข",
      phone: "0839990112",
      email: "somjai@example.com",
      createdAt: "2026-06-12",
      consent: { marketing: true, updatedAt: "2026-06-12", source: "เว็บไซต์บริษัท" },
    },
    {
      id: "C-0101",
      companyId: "company-b",
      name: "กิตติพงษ์ ทองมา",
      phone: "0867778123",
      email: "kittipong@example.com",
      createdAt: "2026-03-10",
    },
    {
      id: "C-0102",
      companyId: "company-b",
      name: "นภัสสร วงศ์ดี",
      phone: "0918889456",
      email: "napatsorn@gmail.com",
      createdAt: "2026-03-12",
    },
  ],
  notDuplicate: [],
  channels: seedChannels,
  mappings: seedMappings,
  orders: seedOrders,
  ingestEvents: seedIngestEvents,
  loyalty: seedLoyalty,
  rewards: seedRewards,
  redemptions: seedRedemptions,
  adjustments: seedAdjustments,
}

/** "0811112234" → "081-xxx-x234". The real server always masks. */
export function maskPhone(phone?: string) {
  if (!phone) return "-"
  const digits = phone.replace(/\D/g, "")
  return `${digits.slice(0, 3)}-xxx-x${digits.slice(-3)}`
}

/** "somchai@example.com" → "so***@example.com". */
export function maskEmail(email?: string) {
  if (!email) return "-"
  const [local, domain] = email.split("@")
  return `${local.slice(0, 2)}***@${domain}`
}

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
]

/** "2026-02-15" → "15 ก.พ. 69" (Buddhist year, 2 digits). */
export function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return `${String(d).padStart(2, "0")} ${thaiMonths[m - 1]} ${String(y + 543).slice(-2)}`
}

/** "2026-09-25T14:02" → "25 ก.ย. 69 14:02". */
export function formatDateTime(iso: string) {
  const time = iso.slice(11, 16)
  return time ? `${formatDate(iso)} ${time}` : formatDate(iso)
}

export function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function pairKey(a: string, b: string) {
  return [a, b].sort().join("|")
}

/** Other customers in the same company that may be the same person. */
export function duplicatesOf(data: PortalData, customer: Customer) {
  if (!customer.duplicateKey) return []
  return data.customers.filter(
    (c) =>
      c.id !== customer.id &&
      c.companyId === customer.companyId &&
      c.duplicateKey === customer.duplicateKey &&
      !data.notDuplicate.includes(pairKey(c.id, customer.id))
  )
}

export function matchesSearch(customer: Customer, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const digits = q.replace(/\D/g, "")
  return (
    customer.name.toLowerCase().includes(q) ||
    customer.id.toLowerCase().includes(q) ||
    (customer.email ?? "").toLowerCase().includes(q) ||
    (digits.length > 0 && (customer.phone ?? "").includes(digits))
  )
}
