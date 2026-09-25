// Mock data for the RELIO prototype. Replace with API calls when wiring up.

export type Segment = "vip" | "regular" | "new"

export type OrderStatus =
  "pending" | "confirmed" | "packing" | "shipped" | "delivered" | "cancelled"

export type PaymentStatus = "paid" | "unpaid" | "refunded"

export type Channel =
  "line" | "website" | "shopee" | "lazada" | "tiktok" | "pos" | "phone"

export type Customer = {
  id: string
  name: string
  company: string
  email: string
  phone: string
  city: string
  segment: Segment
  owner: string
  lastContact: string
  note: string
  /** PDPA: when the customer agreed to data collection, if on record. */
  consentAt?: string
}

export type OrderItem = {
  sku: string
  name: string
  qty: number
  price: number
}

export type Order = {
  id: string
  customerId: string
  date: string
  status: OrderStatus
  payment: PaymentStatus
  channel: Channel
  /** Store within the channel, when a company runs more than one (e.g. two Shopee shops). */
  store?: string
  items: OrderItem[]
  shipping: number
  address: string
}

export type Activity = {
  id: string
  customerId: string
  date: string
  kind: "call" | "chat" | "note" | "order"
  text: string
  orderId?: string
}

export const customers: Customer[] = [
  {
    id: "C-1001",
    name: "สมศรี ใจดี",
    company: "บ้านขนมสมศรี",
    email: "somsri@example.com",
    phone: "081-234-5678",
    city: "เชียงใหม่",
    segment: "vip",
    owner: "ปวีณา",
    lastContact: "2026-09-22",
    note: "ชอบให้แจ้งเลขพัสดุทาง LINE ทุกครั้ง",
    consentAt: "2025-11-02",
  },
  {
    id: "C-1002",
    name: "ธนากร วงศ์ทอง",
    company: "ทองดี เทรดดิ้ง",
    email: "thanakorn@example.com",
    phone: "089-555-0192",
    city: "กรุงเทพฯ",
    segment: "regular",
    owner: "ปวีณา",
    lastContact: "2026-09-18",
    note: "สั่งซื้อทุกต้นเดือน ขอใบกำกับภาษีเต็มรูป",
    consentAt: "2026-01-15",
  },
  {
    id: "C-1003",
    name: "มาลี ศรีสุข",
    company: "มาลีคาเฟ่",
    email: "malee@example.com",
    phone: "062-777-3344",
    city: "ขอนแก่น",
    segment: "new",
    owner: "กิตติ",
    lastContact: "2026-09-21",
    note: "ลูกค้าใหม่จากแคมเปญ LINE OA",
  },
  {
    id: "C-1004",
    name: "วีระ ประเสริฐ",
    company: "วีระการเกษตร",
    email: "weera@example.com",
    phone: "086-120-4455",
    city: "นครราชสีมา",
    segment: "regular",
    owner: "กิตติ",
    lastContact: "2026-09-02",
    note: "",
  },
  {
    id: "C-1005",
    name: "Anna Lee",
    company: "Lee Studio",
    email: "anna@example.com",
    phone: "095-808-1212",
    city: "ภูเก็ต",
    segment: "vip",
    owner: "ปวีณา",
    lastContact: "2026-09-10",
    note: "ติดต่อเป็นภาษาอังกฤษ",
    consentAt: "2026-03-08",
  },
  {
    id: "C-1006",
    name: "ชัยวัฒน์ แก้วมณี",
    company: "แก้วมณี ออฟฟิศ",
    email: "chaiwat@example.com",
    phone: "087-432-9988",
    city: "ชลบุรี",
    segment: "new",
    owner: "กิตติ",
    lastContact: "2026-09-23",
    note: "",
  },
  {
    id: "C-1007",
    name: "ปิยะนุช สายทอง",
    company: "ร้านปิยะของฝาก",
    email: "piyanuch@example.com",
    phone: "081-990-2231",
    city: "สุราษฎร์ธานี",
    segment: "vip",
    owner: "ปวีณา",
    lastContact: "2026-09-20",
    note: "ซื้อทั้งหน้าร้านและ Shopee",
    consentAt: "2025-12-20",
  },
  {
    id: "C-1008",
    name: "กฤษดา มั่นคง",
    company: "มั่นคงซัพพลาย",
    email: "kritsada@example.com",
    phone: "084-221-7788",
    city: "กรุงเทพฯ",
    segment: "regular",
    owner: "กิตติ",
    lastContact: "2026-09-12",
    note: "",
  },
  {
    id: "C-1009",
    name: "นภัสสร ทองคำ",
    company: "นภัสสร เบเกอรี่",
    email: "napatsorn@example.com",
    phone: "091-345-6677",
    city: "นนทบุรี",
    segment: "vip",
    owner: "ปวีณา",
    lastContact: "2026-09-19",
    note: "",
    consentAt: "2026-02-11",
  },
  {
    id: "C-1010",
    name: "David Chen",
    company: "Chen & Co.",
    email: "david@example.com",
    phone: "098-765-4321",
    city: "กรุงเทพฯ",
    segment: "regular",
    owner: "กิตติ",
    lastContact: "2026-09-05",
    note: "",
  },
  {
    id: "C-1011",
    name: "สมใจ รักดี",
    company: "ลูกค้าบุคคล",
    email: "somjai@example.com",
    phone: "081-456-0123",
    city: "กรุงเทพฯ",
    segment: "regular",
    owner: "ปวีณา",
    lastContact: "2026-09-03",
    note: "ซื้อจาก 4 ร้าน ระบบรวมเป็นโปรไฟล์เดียวจากเบอร์โทรที่ตรงกัน",
    consentAt: "2026-08-02",
  },
]

/** A record from a sales channel that may be the same person as a customer. */
export type MergeCandidate = {
  id: string
  customerId: string
  /** Why the system thinks they match, strongest first. */
  matchedOn: ("phone" | "email" | "name")[]
  confidence: "high" | "medium"
  record: {
    name: string
    phone: string
    email: string
    city: string
    channel: Channel
    store?: string
    orders: number
    spent: number
    firstSeen: string
  }
}

export const mergeCandidates: MergeCandidate[] = [
  {
    id: "MG-201",
    customerId: "C-1001",
    matchedOn: ["phone", "name"],
    confidence: "high",
    record: {
      name: "Somsri Jaidee",
      phone: "081-234-5678",
      email: "somsri.bakery@example.com",
      city: "เชียงใหม่",
      channel: "shopee",
      store: "Shopee ร้านหลัก",
      orders: 6,
      spent: 4820,
      firstSeen: "2026-06-14",
    },
  },
  {
    id: "MG-202",
    customerId: "C-1007",
    matchedOn: ["email", "phone"],
    confidence: "high",
    record: {
      name: "ปิยะนุช สายทอง",
      phone: "081-990-2231",
      email: "piyanuch@example.com",
      city: "สุราษฎร์ธานี",
      channel: "pos",
      store: "หน้าร้านสุราษฎร์",
      orders: 11,
      spent: 9350,
      firstSeen: "2025-10-03",
    },
  },
  {
    id: "MG-203",
    customerId: "C-1005",
    matchedOn: ["email"],
    confidence: "medium",
    record: {
      name: "Anna L.",
      phone: "095-808-9090",
      email: "anna@example.com",
      city: "ภูเก็ต",
      channel: "website",
      orders: 2,
      spent: 3100,
      firstSeen: "2026-08-21",
    },
  },
  {
    id: "MG-204",
    customerId: "C-1009",
    matchedOn: ["phone"],
    confidence: "medium",
    record: {
      name: "คุณนภัส",
      phone: "091-345-6677",
      email: "",
      city: "นนทบุรี",
      channel: "line",
      orders: 3,
      spent: 1260,
      firstSeen: "2026-09-02",
    },
  },
  {
    id: "MG-205",
    customerId: "C-1002",
    matchedOn: ["name"],
    confidence: "medium",
    record: {
      name: "ธนากร วงศ์ทอง",
      phone: "089-555-7788",
      email: "tk.wongthong@example.com",
      city: "ปทุมธานี",
      channel: "lazada",
      orders: 1,
      spent: 890,
      firstSeen: "2026-09-11",
    },
  },
]

export const products: Omit<OrderItem, "qty">[] = [
  { sku: "BK-001", name: "กล่องของขวัญ ขนาด M", price: 250 },
  { sku: "BK-002", name: "กล่องของขวัญ ขนาด L", price: 390 },
  { sku: "TE-010", name: "ชาเขียวออร์แกนิก 100 g", price: 180 },
  { sku: "CF-021", name: "เมล็ดกาแฟคั่วกลาง 250 g", price: 320 },
  { sku: "CP-100", name: "แก้วเซรามิก RELIO", price: 290 },
]

export const orders: Order[] = [
  {
    id: "SO-2609-0148",
    customerId: "C-1001",
    date: "2026-09-23T09:42:00",
    status: "pending",
    payment: "unpaid",
    channel: "line",
    items: [
      { sku: "BK-002", name: "กล่องของขวัญ ขนาด L", qty: 4, price: 390 },
      { sku: "TE-010", name: "ชาเขียวออร์แกนิก 100 g", qty: 4, price: 180 },
    ],
    shipping: 60,
    address: "88/12 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
  },
  {
    id: "SO-2609-0147",
    customerId: "C-1006",
    date: "2026-09-23T08:15:00",
    status: "confirmed",
    payment: "paid",
    channel: "website",
    items: [{ sku: "CP-100", name: "แก้วเซรามิก RELIO", qty: 12, price: 290 }],
    shipping: 0,
    address: "45 ถ.สุขุมวิท ต.บางปลาสร้อย อ.เมือง จ.ชลบุรี 20000",
  },
  {
    id: "SO-2609-0145",
    customerId: "C-1003",
    date: "2026-09-22T16:30:00",
    status: "packing",
    payment: "paid",
    channel: "line",
    items: [
      { sku: "CF-021", name: "เมล็ดกาแฟคั่วกลาง 250 g", qty: 6, price: 320 },
    ],
    shipping: 50,
    address: "12 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
  },
  {
    id: "SO-2609-0141",
    customerId: "C-1002",
    date: "2026-09-21T11:05:00",
    status: "shipped",
    payment: "paid",
    channel: "phone",
    items: [
      { sku: "BK-001", name: "กล่องของขวัญ ขนาด M", qty: 30, price: 250 },
      { sku: "CP-100", name: "แก้วเซรามิก RELIO", qty: 10, price: 290 },
    ],
    shipping: 0,
    address: "199 ถ.สีลม แขวงสุริยวงศ์ เขตบางรัก กรุงเทพฯ 10500",
  },
  {
    id: "SO-2609-0137",
    customerId: "C-1005",
    date: "2026-09-19T14:20:00",
    status: "delivered",
    payment: "paid",
    channel: "shopee",
    items: [
      { sku: "TE-010", name: "ชาเขียวออร์แกนิก 100 g", qty: 8, price: 180 },
    ],
    shipping: 45,
    address: "7 ถ.ราษฎร์อุทิศ ต.ป่าตอง อ.กะทู้ จ.ภูเก็ต 83150",
  },
  {
    id: "SO-2609-0130",
    customerId: "C-1001",
    date: "2026-09-15T10:00:00",
    status: "delivered",
    payment: "paid",
    channel: "line",
    items: [
      { sku: "BK-001", name: "กล่องของขวัญ ขนาด M", qty: 10, price: 250 },
    ],
    shipping: 60,
    address: "88/12 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
  },
  {
    id: "SO-2609-0122",
    customerId: "C-1004",
    date: "2026-09-08T09:30:00",
    status: "cancelled",
    payment: "refunded",
    channel: "website",
    items: [
      { sku: "CF-021", name: "เมล็ดกาแฟคั่วกลาง 250 g", qty: 2, price: 320 },
    ],
    shipping: 50,
    address: "301 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.นครราชสีมา 30000",
  },
  {
    id: "SO-2609-0118",
    customerId: "C-1002",
    date: "2026-09-01T13:45:00",
    status: "delivered",
    payment: "paid",
    channel: "phone",
    items: [
      { sku: "BK-002", name: "กล่องของขวัญ ขนาด L", qty: 20, price: 390 },
    ],
    shipping: 0,
    address: "199 ถ.สีลม แขวงสุริยวงศ์ เขตบางรัก กรุงเทพฯ 10500",
  },
  // คุณสมใจ: 4 orders from 4 stores in 3 channels, 4,000 baht in total.
  {
    id: "SO-2609-0102",
    customerId: "C-1011",
    date: "2026-09-03T15:10:00",
    status: "delivered",
    payment: "paid",
    channel: "pos",
    store: "สาขาสยาม",
    items: [{ sku: "GS-300", name: "ชุดของขวัญ", qty: 1, price: 1300 }],
    shipping: 0,
    address: "รับสินค้าที่หน้าร้าน",
  },
  {
    id: "SO-2608-0877",
    customerId: "C-1011",
    date: "2026-08-21T20:05:00",
    status: "delivered",
    payment: "paid",
    channel: "shopee",
    store: "Shopee ร้านที่ 2",
    items: [{ sku: "SN-110", name: "กันแดด", qty: 1, price: 450 }],
    shipping: 40,
    address: "59 ซ.อารีย์ 2 แขวงพญาไท เขตพญาไท กรุงเทพฯ 10400",
  },
  {
    id: "SO-2608-0791",
    customerId: "C-1011",
    date: "2026-08-10T12:40:00",
    status: "delivered",
    payment: "paid",
    channel: "shopee",
    store: "Shopee ร้านที่ 1",
    items: [{ sku: "SR-210", name: "เซรั่ม", qty: 2, price: 500 }],
    shipping: 40,
    address: "59 ซ.อารีย์ 2 แขวงพญาไท เขตพญาไท กรุงเทพฯ 10400",
  },
  {
    id: "SO-2608-0702",
    customerId: "C-1011",
    date: "2026-08-02T09:25:00",
    status: "delivered",
    payment: "paid",
    channel: "website",
    items: [{ sku: "CR-120", name: "ครีมบำรุงผิว", qty: 1, price: 1250 }],
    shipping: 0,
    address: "59 ซ.อารีย์ 2 แขวงพญาไท เขตพญาไท กรุงเทพฯ 10400",
  },
]

export const activities: Activity[] = [
  {
    id: "A-1",
    customerId: "C-1001",
    date: "2026-09-23T09:42:00",
    kind: "order",
    text: "สร้างออเดอร์ผ่าน LINE",
    orderId: "SO-2609-0148",
  },
  {
    id: "A-2",
    customerId: "C-1001",
    date: "2026-09-22T15:10:00",
    kind: "chat",
    text: "สอบถามกล่องของขวัญสำหรับงานปีใหม่",
  },
  {
    id: "A-3",
    customerId: "C-1001",
    date: "2026-09-16T11:00:00",
    kind: "call",
    text: "โทรยืนยันการรับสินค้าเรียบร้อย",
  },
  {
    id: "A-4",
    customerId: "C-1001",
    date: "2026-09-15T10:00:00",
    kind: "order",
    text: "สร้างออเดอร์ผ่าน LINE",
    orderId: "SO-2609-0130",
  },
  {
    id: "A-5",
    customerId: "C-1002",
    date: "2026-09-21T11:05:00",
    kind: "order",
    text: "สั่งซื้อทางโทรศัพท์",
    orderId: "SO-2609-0141",
  },
  {
    id: "A-6",
    customerId: "C-1002",
    date: "2026-09-18T09:20:00",
    kind: "note",
    text: "ขอใบกำกับภาษีเต็มรูปแบบทุกออเดอร์",
  },
  {
    id: "A-7",
    customerId: "C-1003",
    date: "2026-09-22T16:30:00",
    kind: "order",
    text: "สร้างออเดอร์ผ่าน LINE",
    orderId: "SO-2609-0145",
  },
  {
    id: "A-8",
    customerId: "C-1003",
    date: "2026-09-21T10:00:00",
    kind: "chat",
    text: "ทักมาจากแคมเปญ LINE OA",
  },
  {
    id: "A-9",
    customerId: "C-1011",
    date: "2026-08-10T12:41:00",
    kind: "note",
    text: "ระบบรวมออเดอร์ Shopee ร้านที่ 1 เข้าโปรไฟล์เดิม เพราะเบอร์โทรตรงกับออเดอร์จากเว็บไซต์",
  },
]

export const orderFlow: OrderStatus[] = [
  "pending",
  "confirmed",
  "packing",
  "shipped",
  "delivered",
]

export function orderSubtotal(order: Order) {
  return order.items.reduce((sum, item) => sum + item.qty * item.price, 0)
}

export function orderTotal(order: Order) {
  return orderSubtotal(order) + order.shipping
}

export function getCustomer(id: string) {
  return customers.find((c) => c.id === id)
}

export function getOrder(id: string) {
  return orders.find((o) => o.id === id)
}

export function ordersOf(customerId: string) {
  return orders.filter((o) => o.customerId === customerId)
}

export function activitiesOf(customerId: string) {
  return activities.filter((a) => a.customerId === customerId)
}

export function customerStats(customerId: string) {
  const list = ordersOf(customerId).filter((o) => o.status !== "cancelled")
  return {
    orders: list.length,
    spent: list.reduce((sum, o) => sum + orderTotal(o), 0),
  }
}

// Fixed "today" so the prototype reads the same on any day.
export const TODAY = "2026-09-23"

/** PDPA: staff lists show only the first and last digits, e.g. 081-xxx-x123. */
export function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, "")
  if (d.length < 7) return phone
  return `${d.slice(0, 3)}-xxx-x${d.slice(-3)}`
}

export function maskEmail(email: string) {
  const [user, domain] = email.split("@")
  if (!domain) return email
  return `${user.slice(0, 1)}${"x".repeat(Math.max(user.length - 1, 3))}@${domain}`
}

export function daysSince(iso: string) {
  const ms = new Date(TODAY).getTime() - new Date(iso.slice(0, 10)).getTime()
  return Math.round(ms / 86_400_000)
}
