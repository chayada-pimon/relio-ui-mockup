// Mock data for the RELIO prototype. Replace with API calls when wiring up.

export type Segment = "vip" | "regular" | "new"

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packing"
  | "shipped"
  | "delivered"
  | "cancelled"

export type PaymentStatus = "paid" | "unpaid" | "refunded"

export type Channel = "line" | "website" | "shopee" | "phone"

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

export function daysSince(iso: string) {
  const ms = new Date(TODAY).getTime() - new Date(iso.slice(0, 10)).getTime()
  return Math.round(ms / 86_400_000)
}
