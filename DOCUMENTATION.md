# KhaoShop — อธิบายโค้ดทั้งระบบ

> เอกสารนี้อธิบายว่าแต่ละส่วนของโค้ดทำงานยังไง **และทำไมถึงเขียนแบบนั้น**
> เหมาะสำหรับกลับมาอ่านเวลาลืมหรืออยากแก้ไขระบบ

---

## สารบัญ

1. [โครงสร้างโปรเจกต์](#1-โครงสร้างโปรเจกต์)
2. [ฐานข้อมูล (Prisma Schema)](#2-ฐานข้อมูล-prisma-schema)
3. [ระบบ Login (NextAuth + JWT)](#3-ระบบ-login-nextauth--jwt)
4. [Prisma Client](#4-prisma-client)
5. [Utility Functions](#5-utility-functions)
6. [Layout — การป้องกันหน้า](#6-layout--การป้องกันหน้า)
7. [หน้าร้านลูกค้า (Store)](#7-หน้าร้านลูกค้า-store)
8. [API สร้างออเดอร์](#8-api-สร้างออเดอร์)
9. [API อัปเดตออเดอร์](#9-api-อัปเดตออเดอร์)
10. [API จัดการเมนู](#10-api-จัดการเมนู)
11. [Dashboard — หน้าจัดการเมนู](#11-dashboard--หน้าจัดการเมนู)
12. [Dashboard — หน้าออเดอร์](#12-dashboard--หน้าออเดอร์)
13. [Dashboard — ห้องครัว](#13-dashboard--ห้องครัว)
14. [Real-time (Pusher)](#14-real-time-pusher)
15. [Web Push Notification](#15-web-push-notification)
16. [Cron — รีเซ็ตสต็อกทุกคืน](#16-cron--รีเซ็ตสต็อกทุกคืน)
17. [ระบบ Admin — Users](#17-ระบบ-admin--users)
18. [ระบบ Admin — Permissions](#18-ระบบ-admin--permissions)
19. [Forgot / Reset Password](#19-forgot--reset-password)
20. [สมัครสมาชิก (Register)](#20-สมัครสมาชิก-register)

---

## 1. โครงสร้างโปรเจกต์

```
src/
├── app/                  ← หน้าต่างๆ และ API (Next.js App Router)
│   ├── api/              ← API Routes (backend)
│   ├── admin/            ← หน้า Super Admin
│   ├── dashboard/        ← หน้าเจ้าของร้าน
│   ├── store/[shopId]/   ← หน้าลูกค้าสั่งอาหาร
│   ├── login/            ← หน้า login
│   └── register/         ← หน้าสมัครสมาชิก
├── components/           ← component ที่ใช้ซ้ำหลายที่
├── lib/                  ← โค้ดกลาง (auth, prisma, pusher, utils)
├── hooks/                ← React custom hooks
└── types/                ← TypeScript type definitions
prisma/
└── schema.prisma         ← โครงสร้างฐานข้อมูล
```

**ทำไมถึงใช้โครงสร้างแบบนี้?**
Next.js 14 App Router กำหนดว่าแต่ละ folder ใน `app/` จะกลายเป็น URL path อัตโนมัติ เช่น `app/dashboard/menu/page.tsx` → URL `/dashboard/menu` ไม่ต้องตั้งค่า routing เอง

---

## 2. ฐานข้อมูล (Prisma Schema)

ไฟล์: `prisma/schema.prisma`

### ทำไมถึงใช้ Prisma?

Prisma คือ ORM (Object-Relational Mapper) — แทนที่จะเขียน SQL ตรงๆ เราเขียน TypeScript แล้ว Prisma แปลงเป็น SQL ให้ ได้รับ type safety และ autocomplete ด้วย

### ทำไมถึงใช้ PostgreSQL บน Neon?

Neon คือ serverless PostgreSQL — ไม่ต้องดูแล server เอง ราคาถูก เหมาะกับ Next.js บน Vercel

### โครงสร้าง Table หลัก

#### User
```prisma
model User {
  id          String    @id @default(cuid())  // ID สร้างเอง รูปแบบ cuid (ไม่ใช่ auto increment)
  email       String    @unique               // ห้ามซ้ำ
  password    String                          // เก็บแบบ hash เท่านั้น ไม่เก็บ plain text
  name        String
  role        UserRole  @default(USER)        // enum: USER หรือ SUPER_ADMIN
  isSuspended Boolean   @default(false)       // ถ้า true → login ไม่ได้
  shop        Shop?                           // ? = optional คือมีหรือไม่มีก็ได้
}
```

**ทำไมใช้ `cuid()` ไม่ใช้ auto increment?**
cuid (Collision Resistant Unique ID) ปลอดภัยกว่า — ลูกค้าเดาหมายเลข user id คนอื่นไม่ได้ เช่น `/user/1` → `/user/2` → ถ้าเป็นตัวเลขจะเดาได้

**ทำไม `role` เป็น enum?**
กำหนดค่าได้แค่ `USER` หรือ `SUPER_ADMIN` เท่านั้น ป้องกันค่าผิดพลาดเข้าฐานข้อมูล

#### Shop
```prisma
model Shop {
  shopType  String?  // เก็บเป็น comma-separated เช่น "ร้านเครื่องดื่ม,ร้านอาหาร/กับข้าว"
  slug      String   @unique  // URL ของร้าน เช่น /store/my-shop
  userId    String   @unique  // 1 user มีได้แค่ 1 ร้าน
}
```

**ทำไม shopType เก็บเป็น comma-separated string?**
เพราะไม่ต้องสร้าง table ใหม่หรือเปลี่ยน schema — ง่ายกว่า แค่เช็ค `.includes('เครื่องดื่ม')` ก็ทำงานได้

#### MenuItem
```prisma
model MenuItem {
  dailyLimit  Int      @default(20)   // ขายได้สูงสุดกี่ชิ้นต่อวัน
  soldCount   Int      @default(0)    // ขายไปแล้วกี่ชิ้นวันนี้
  isAvailable Boolean  @default(true) // เปิด/ปิดเมนู (admin control)
  options     String[] @default([])   // เช่น ["ปั่น", "ไม่ปั่น", "เย็น"]
  sizes       Json?                   // เช่น [{name:"แก้วเล็ก", price:35}]
  toppings    Json?                   // เช่น [{name:"ไข่มุก", price:5}]
  optionPrices Json?                  // เช่น {"เย็น":0, "ร้อน":0}
}
```

**ทำไม sizes/toppings ถึงเป็น Json ไม่ใช่ table แยก?**
เพราะแต่ละร้านมี sizes ไม่เท่ากัน การเก็บเป็น JSON ง่ายกว่าและ query ง่ายกว่า ถ้าแยก table จะต้อง join หลายชั้น

**soldCount vs isAvailable ต่างกันยังไง?**
- `isAvailable = false` → เจ้าของร้านปิดเมนูนี้ถาวร (ลูกค้าไม่เห็น)
- `soldCount = 999` → เมนูหมดวันนี้ แต่พรุ่งนี้จะกลับมา (cron รีเซ็ต soldCount ทุกคืน)

#### Order และ OrderItem
```prisma
model Order {
  queueNumber  Int           // เลขคิว นับใหม่ทุกวัน (1, 2, 3...)
  status       OrderStatus   // PENDING → CONFIRMED → PREPARING → READY → DELIVERED / CANCELLED
  paymentMethod PaymentMethod // CASH หรือ PROMPTPAY
  paymentStatus PaymentStatus // PENDING → PAID → VERIFIED / REJECTED
}

model OrderItem {
  selectedOption String?  // ตัวเลือกที่ลูกค้าเลือก เช่น "แก้วกลาง + ไข่มุก (฿5)"
}
```

**ทำไม Order แยก table กับ OrderItem?**
เพราะ 1 ออเดอร์มีหลายเมนู (1-to-many relationship) ถ้าเก็บรวมกันจะซับซ้อนมาก

#### UserPermission
```prisma
model UserPermission {
  userId      String  @id       // เชื่อมกับ User (1-to-1)
  canMenu     Boolean @default(true)
  canOrders   Boolean @default(true)
  // ... สิทธิ์อื่นๆ
}
```

**ทำไมไม่มี permission record ก็เข้าได้ทุกหน้า?**
เพราะ default คือ `true` ทั้งหมด — ถ้ายังไม่มี record ในฐานข้อมูล แสดงว่ายังไม่ได้จำกัดสิทธิ์อะไร

### คำสั่งสำคัญ

เมื่อแก้ไข schema แล้วต้องรัน:
```bash
npx prisma db push     # sync schema กับ database จริง
npx prisma generate    # สร้าง TypeScript types ใหม่
```

---

## 3. ระบบ Login (NextAuth + JWT)

ไฟล์: `src/lib/auth.ts`

### ทำไมถึงใช้ NextAuth?

NextAuth จัดการ session, cookies, CSRF protection ให้อัตโนมัติ ไม่ต้องเขียนเอง

### ทำไมใช้ JWT ไม่ใช้ database session?

- **JWT (JSON Web Token):** เก็บข้อมูล user ใน cookie ที่ browser — server ไม่ต้อง query database ทุก request เร็วกว่า
- **Database session:** เก็บ session ใน DB — ต้อง query ทุกครั้ง แต่ logout ทันที

โปรเจกต์นี้เลือก JWT เพราะเน้นความเร็ว

### ขั้นตอน Login

```typescript
async authorize(credentials) {
  // 1. เช็คว่ากรอกข้อมูลมาครบ
  if (!credentials?.email || !credentials?.password) throw new Error(...)

  // 2. หา user จาก email
  const user = await prisma.user.findUnique({ where: { email } })

  // 3. เช็คว่า user มีอยู่จริง
  if (!user) throw new Error('ไม่พบบัญชีนี้ในระบบ')

  // 4. เช็คว่าถูกระงับหรือเปล่า
  if (user.isSuspended) throw new Error('บัญชีนี้ถูกระงับ...')

  // 5. เปรียบเทียบ password ด้วย bcrypt
  const isValid = await bcrypt.compare(credentials.password, user.password)
  if (!isValid) throw new Error('รหัสผ่านไม่ถูกต้อง')

  // 6. ถ้าผ่านทุกอย่าง return ข้อมูล user
  return { id, email, name, role, shopId, shopSlug }
}
```

**ทำไมใช้ bcrypt เปรียบเทียบ password?**
รหัสผ่านในฐานข้อมูลถูก hash ไว้ (เช่น `$2b$10$...`) ดูรหัสจริงไม่ได้ `bcrypt.compare` จะ hash รหัสที่ผู้ใช้พิมพ์แล้วเปรียบเทียบกับ hash ในฐานข้อมูล

**ทำไมต้องมี JWT Callback และ Session Callback?**
- `jwt callback` → เมื่อ login สำเร็จ เอาข้อมูล (`role`, `shopId`, `shopSlug`) ใส่ใน token
- `session callback` → ทุกครั้งที่ component เรียก `useSession()` จะดึงข้อมูลจาก token มาให้ใช้ได้

```typescript
// jwt callback — รันตอน login
async jwt({ token, user }) {
  if (user) {
    token.role = user.role
    token.shopId = user.shopId
  }
  return token
}

// session callback — รันทุกครั้งที่เรียก session
async session({ session, token }) {
  session.user.id = token.sub        // sub = user id ที่ JWT เก็บ
  session.user.role = token.role
  session.user.shopId = token.shopId
  return session
}
```

---

## 4. Prisma Client

ไฟล์: `src/lib/prisma.ts`

```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**ทำไมต้องเก็บ prisma ใน `globalThis`?**
Next.js ใน development mode จะ hot-reload โค้ดบ่อยมาก ถ้าสร้าง `new PrismaClient()` ใหม่ทุกครั้งจะได้ connection pool เยอะเกินไป และ database จะบ่น `Too many connections`

การเก็บใน `globalThis` ทำให้แน่ใจว่าทั้ง app ใช้ instance เดียวกันเสมอ

---

## 5. Utility Functions

ไฟล์: `src/lib/utils.ts`

### cn()
```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
ใช้รวม class CSS หลายอัน และจัดการ conflict อัตโนมัติ เช่น ถ้าใส่ทั้ง `text-red-500` และ `text-blue-500` จะเอาอันหลังสุดไว้

### formatPrice()
```typescript
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(price)
}
```
ใช้ `Intl.NumberFormat` ของ browser แสดงเงินบาทไทย เช่น `฿1,250` — ไม่ต้องเขียน logic เอง

### getStockStatus()
```typescript
export function getStockStatus(dailyLimit: number, soldCount: number) {
  const remaining = dailyLimit - soldCount
  if (remaining <= 0) return { label: 'หมดแล้ว', color: 'red', remaining: 0 }
  if (remaining <= 3) return { label: `เหลือ ${remaining}`, color: 'orange', remaining }
  return { label: `เหลือ ${remaining}`, color: 'green', remaining }
}
```
คืน object ที่มีทั้ง label, สี, และจำนวนที่เหลือ — เรียกครั้งเดียวได้ข้อมูลครบ ใช้ได้ทั้งหน้าร้านและหน้า admin

---

## 6. Layout — การป้องกันหน้า

### Dashboard Layout
ไฟล์: `src/app/dashboard/layout.tsx`

```typescript
export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')                         // ยังไม่ login → ไป login
  if (session.user.role === 'SUPER_ADMIN') redirect('/admin')  // admin → ไปหน้า admin
  // ...
}
```

**ทำไมเช็คที่ Layout ไม่ใช่ที่แต่ละหน้า?**
Layout ครอบทุกหน้าใน `/dashboard/*` ทำให้เช็คครั้งเดียวก็ป้องกันได้ทุกหน้า ไม่ต้องเขียนซ้ำทุก page

**ทำไมใช้ `Promise.all`?**
```typescript
const [permission, shop] = await Promise.all([
  prisma.userPermission.findUnique(...),
  prisma.shop.findUnique(...),
])
```
`Promise.all` รัน query ทั้งสองพร้อมกัน แทนที่จะรอทีละอัน ทำให้โหลดเร็วขึ้นครึ่งหนึ่ง

### Admin Layout
ไฟล์: `src/app/admin/layout.tsx`

```typescript
if (!session) redirect('/login')
if (session.user.role !== 'SUPER_ADMIN') redirect('/dashboard')  // ไม่ใช่ admin → ออก
```

ตรงกันข้ามกับ dashboard — ถ้าไม่ใช่ SUPER_ADMIN จะถูกเด้งออกทันที

---

## 7. หน้าร้านลูกค้า (Store)

ไฟล์: `src/app/store/[shopId]/StoreClient.tsx`

### State หลัก
```typescript
const [cart, setCart] = useState<CartItem[]>([])         // ตะกร้าสินค้า
const [step, setStep] = useState<'menu'|'cart'|'form'|'done'>('menu')  // ขั้นตอนปัจจุบัน
const [optionModal, setOptionModal] = useState<any|null>(null)  // modal เลือก size/topping
```

**ทำไมใช้ step แทนที่จะเป็นหลายหน้า?**
ทุก step อยู่ใน component เดียว ทำให้ข้อมูล cart ไม่หายเมื่อย้ายขั้นตอน ถ้าแยกเป็นหน้าจะต้องส่งข้อมูลผ่าน URL หรือ localStorage

### cartKey — กุญแจตะกร้า
```typescript
const key = `${item.id}::${selectedOption ?? ''}`
```
**ทำไมต้อง cartKey?**
เมนูเดียวกัน (id เดียวกัน) แต่เลือก option ต่างกัน ต้องแยก row — เช่น "ชาเขียว แก้วเล็ก" กับ "ชาเขียว แก้วใหญ่" ต้องอยู่คนละ row

### การเพิ่มสินค้าที่มี Size/Topping
```typescript
function addToCart(item: any) {
  const hasSizes = item.sizes?.length > 0
  const hasToppings = item.toppings?.length > 0
  const hasOptions = item.options?.length > 0
  if (hasSizes || hasToppings || hasOptions) {
    setOptionModal(item)  // เปิด modal ให้เลือกก่อน
    return
  }
  addToCartWithOption(item, undefined, item.price)  // ถ้าไม่มี option เพิ่มตรงๆ เลย
}
```

### การส่งออเดอร์
```typescript
async function handleOrder(e: React.FormEvent) {
  e.preventDefault()  // ป้องกัน browser reload หน้า (default form behavior)

  // 1. สร้างออเดอร์ก่อน
  const res = await fetch('/api/orders', { method: 'POST', body: JSON.stringify({...}) })
  const order = await res.json()

  // 2. ถ้าจ่าย QR → อัปโหลดสลิปแยกต่างหาก
  if (form.paymentMethod === 'PROMPTPAY' && slipFile) {
    const fd = new FormData()
    fd.append('file', slipFile)
    await fetch(`/api/orders/${order.id}/slip`, { method: 'POST', body: fd })
  }

  setStep('done')  // ไปหน้าสำเร็จ
}
```

**ทำไมอัปโหลดสลิปแยก request?**
เพราะสร้าง order ใช้ JSON แต่อัปโหลดไฟล์ต้องใช้ FormData — ไม่สามารถรวมได้ใน request เดียว

### Real-time refresh สต็อก
```typescript
useEffect(() => {
  const pusher = getPusherClient()
  const channel = pusher.subscribe(getShopChannel(shop.id))
  channel.bind(PUSHER_EVENTS.NEW_ORDER, () => { router.refresh() })
  return () => {
    channel.unbind_all()
    pusher.unsubscribe(getShopChannel(shop.id))
  }
}, [shop.id, router])
```

**ทำไม return cleanup function?**
เมื่อ component ถูก unmount (ออกจากหน้า) ต้องยกเลิก subscription ด้วย ไม่งั้น Pusher จะยัง active อยู่ใช้ memory เปล่า และอาจเกิด memory leak

---

## 8. API สร้างออเดอร์

ไฟล์: `src/app/api/orders/route.ts`

### Prisma Transaction
```typescript
const order = await prisma.$transaction(async (tx) => {
  // ทุกอย่างที่อยู่ใน transaction ถ้าขั้นตอนใดล้มเหลว
  // Prisma จะ rollback ทั้งหมด ข้อมูลจะไม่เปลี่ยน

  // 1. เช็ค stock ของทุก item
  for (const item of items) {
    const menuItem = await tx.menuItem.findUnique(...)
    if (!menuItem?.isAvailable) throw new Error(...)   // โยน error = rollback
    const remaining = menuItem.dailyLimit - menuItem.soldCount
    if (remaining < item.quantity) throw new Error(...)
  }

  // 2. สร้างออเดอร์
  const newOrder = await tx.order.create({...})

  // 3. เพิ่ม soldCount ทุก item
  for (const item of items) {
    await tx.menuItem.update({ data: { soldCount: { increment: item.quantity } } })
  }

  return newOrder
})
```

**ทำไมต้องใช้ Transaction?**
สมมุติมี 2 คนสั่งเมนูที่เหลือชิ้นสุดท้ายพร้อมกัน ถ้าไม่ใช้ transaction อาจผ่านทั้งคู่ได้ transaction ทำให้แน่ใจว่าต้องทำสำเร็จครบทุก step หรือยกเลิกทั้งหมด

**ทำไม queueNumber นับแบบนี้?**
```typescript
const todayStart = new Date()
todayStart.setHours(0,0,0,0)
const todayCount = await tx.order.count({ where: { shopId, createdAt: { gte: todayStart } } })
const queueNumber = todayCount + 1
```
นับออเดอร์วันนี้เฉพาะร้านนี้ แล้วบวก 1 ทำให้เลขคิวเริ่มใหม่ทุกวัน

---

## 9. API อัปเดตออเดอร์

ไฟล์: `src/app/api/orders/[id]/route.ts`

### การคืน soldCount เมื่อยกเลิก
```typescript
if (body.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
  await prisma.$transaction(
    existing.items.map(item =>
      prisma.menuItem.updateMany({
        where: { id: item.menuItemId, soldCount: { gte: item.quantity } },
        data: { soldCount: { decrement: item.quantity } },
      })
    )
  )
}
```

**ทำไมต้องเช็ค `soldCount: { gte: item.quantity }`?**
ป้องกัน soldCount ติดลบ — ถ้าสต็อกน้อยกว่าที่จะลบ ให้ข้ามไป

**ทำไม `existing.status !== 'CANCELLED'`?**
ป้องกันกรณีกด "ยกเลิก" ซ้ำบนออเดอร์ที่ยกเลิกไปแล้ว — ถ้าไม่เช็คจะคืน soldCount 2 รอบ

---

## 10. API จัดการเมนู

### POST /api/menu — เพิ่มเมนู
```typescript
const item = await prisma.menuItem.create({
  data: {
    sizes: body.sizes?.length ? body.sizes : undefined,  // ถ้าไม่มี size ให้ข้าม (null)
    toppings: body.toppings?.length ? body.toppings : undefined,
    optionPrices: body.optionPrices && Object.keys(body.optionPrices).length
      ? body.optionPrices : undefined,
  }
})
```

**ทำไมต้องเช็ค `.length` และ `Object.keys().length`?**
ป้องกันเซฟ array เปล่า `[]` หรือ object เปล่า `{}` เข้า database เพราะจะทำให้ query ยากขึ้น ดีกว่าเก็บ `null`

### POST /api/menu/[id]/soldout — กดหมดแล้ว
```typescript
await prisma.menuItem.update({
  where: { id: params.id },
  data: { soldCount: { set: 999 } },  // set เป็น 999 (เกิน dailyLimit ทุก item)
})
```

**ทำไมใช้ 999 ไม่ใช่ปิด isAvailable?**
- `soldCount = 999` → หมดวันนี้ แต่พรุ่งนี้ cron จะรีเซ็ตกลับเป็น 0 เอง
- `isAvailable = false` → ปิดถาวรจนกว่าจะเปิดเอง

### GET /api/cron/reset-stock
```typescript
// รันทุกคืนเที่ยงคืน (UTC 17:00 = ไทย 00:00)
await prisma.menuItem.updateMany({ data: { soldCount: 0 } })
```
รีเซ็ต soldCount ทุก item กลับเป็น 0 — เมนูที่ "หมดแล้ว" จะกลับมาขายวันใหม่ได้ แต่ `isAvailable` ไม่เปลี่ยน

---

## 11. Dashboard — หน้าจัดการเมนู

ไฟล์: `src/app/dashboard/menu/MenuClient.tsx`

### isDrinkShop — ตรวจว่าเป็นร้านเครื่องดื่มหรือเปล่า
```typescript
const isDrinkShop = shopType?.includes('เครื่องดื่ม')
const CATEGORIES = isDrinkShop ? CATEGORIES_DRINK : CATEGORIES_FOOD
```

**ทำไมใช้ `.includes()` ไม่ใช่ `===`?**
เพราะ shopType เก็บได้หลายประเภทพร้อมกัน เช่น `"ร้านเครื่องดื่ม,ร้านอาหาร/กับข้าว"` ถ้าใช้ `===` จะเปรียบเทียบทั้ง string ไม่เจอ

Sizes, Toppings, Options จะแสดงก็ต่อเมื่อ `isDrinkShop = true`:
```tsx
{isDrinkShop && (
  <div>/* ส่วน Sizes */</div>
)}
```

### Option History — จำตัวเลือกที่เคยใช้
```typescript
const OPTION_STORAGE_KEY = 'khaoshop_option_history'

function loadOptionHistory(): string[] {
  const saved = JSON.parse(localStorage.getItem(OPTION_STORAGE_KEY) ?? '[]')
  return [...DEFAULT_OPTIONS, ...saved.filter(s => !DEFAULT_OPTIONS.includes(s))]
}
```

**ทำไมเก็บใน localStorage?**
ข้อมูลนี้ไม่ต้องเก็บใน database — เป็นแค่ความสะดวกของเจ้าของร้านในการกรอก option ที่เคยใช้

### handleSubmit — บันทึกเมนู (เพิ่มหรือแก้ไข)
```typescript
const url = editing ? `/api/menu/${editing.id}` : '/api/menu'
const res = await fetch(url, {
  method: editing ? 'PUT' : 'POST',  // ถ้ากำลัง edit ใช้ PUT, ถ้าเพิ่มใหม่ใช้ POST
  ...
})
```

**ทำไมใช้ PUT สำหรับแก้ไขและ POST สำหรับสร้าง?**
นี่คือ REST convention — POST = สร้างใหม่, PUT = อัปเดตที่มีอยู่

### Optimistic Update — อัปเดต UI ก่อน
```typescript
if (editing) {
  setMenuItems(prev => prev.map(m => m.id === editing.id ? data : m))
} else {
  setMenuItems(prev => [data, ...prev])  // เพิ่มที่ต้นลิสต์
}
```
อัปเดต state ทันทีโดยไม่ต้อง reload หน้า ทำให้ UI ตอบสนองเร็ว

---

## 12. Dashboard — หน้าออเดอร์

ไฟล์: `src/app/dashboard/orders/OrdersClient.tsx`

### เสียงแจ้งเตือน
```typescript
function playOrderSound() {
  const ctx = new AudioContext()
  const playTone = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator()   // สร้าง oscillator (ตัวสร้างเสียง)
    const gain = ctx.createGain()         // ตัวควบคุมระดับเสียง
    osc.connect(gain)
    gain.connect(ctx.destination)         // เชื่อมต่อกับลำโพง
    osc.frequency.value = freq            // Hz ของโน้ต
    // fade in
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.01)
    // fade out
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
    osc.start(ctx.currentTime + start)
    osc.stop(ctx.currentTime + start + dur + 0.05)
  }
  playTone(880, 0, 0.15)    // โน้ต A5
  playTone(1100, 0.18, 0.15) // โน้ตสูงขึ้น
  playTone(1320, 0.36, 0.25) // โน้ตสูงสุด
}
```

**ทำไมใช้ Web Audio API สร้างเสียงเองแทนไฟล์ mp3?**
ไม่ต้องโหลดไฟล์ ไม่มีปัญหา CORS เล่นได้ทุก browser

### Real-time ออเดอร์ใหม่
```typescript
channel.bind(PUSHER_EVENTS.NEW_ORDER, async (data: any) => {
  playOrderSound()
  toast.success(`🔔 ออเดอร์ใหม่!...`)
  // ดึงข้อมูลออเดอร์เต็มๆ มาแสดง
  const res = await fetch(`/api/orders/${data.orderId}`)
  const newOrder = await res.json()
  setOrders(prev => [newOrder, ...prev])  // เพิ่มที่ต้นลิสต์
})
```

**ทำไม Pusher ส่งแค่ orderId แล้วต้อง fetch เพิ่ม?**
Pusher มีขนาด payload จำกัด และข้อมูลออเดอร์เต็มๆ ใหญ่มาก — ส่งแค่ id แล้วค่อย fetch ดีกว่า

### Tab filter
```typescript
const filtered = orders.filter(o => {
  const matchTab = tab === 'ALL'
    ? ACTIVE_STATUSES.includes(o.status)  // tab "ทั้งหมด" = แสดงเฉพาะ active
    : o.status === tab
  ...
})
```

**ทำไม tab "ทั้งหมด" ไม่แสดงทุก status?**
เพราะออเดอร์ที่ DELIVERED หรือ CANCELLED มักเยอะมาก tab "ทั้งหมด" จึงแสดงเฉพาะ PENDING และ CONFIRMED ที่ยังต้องดูแลอยู่

---

## 13. Dashboard — ห้องครัว

ไฟล์: `src/app/dashboard/kitchen/KitchenClient.tsx`

### เช็คออเดอร์ใน localStorage
```typescript
const [checked, setChecked] = useState<Set<string>>(() => {
  const stored = localStorage.getItem(`kitchen_checked_${shopId}`)
  if (stored) return new Set(JSON.parse(stored) as string[])
  return new Set()
})
```

**ทำไมเก็บว่าทำออเดอร์ไหนแล้วใน localStorage?**
ถ้า refresh หน้า รายการที่ติ๊กแล้วจะไม่หาย — ช่วยให้พนักงานครัวทำงานได้ต่อเนื่อง

**ทำไมใช้ `Set` ไม่ใช้ `Array`?**
`Set` เช็คว่ามีค่าอยู่แล้วหรือเปล่าใน O(1) (เร็วกว่า) และไม่มีค่าซ้ำอัตโนมัติ

---

## 14. Real-time (Pusher)

ไฟล์: `src/lib/pusher.ts`

```typescript
// Server-side: ใช้ trigger event ออกไป
export const pusherServer = new Pusher({ appId, key, secret, cluster })

// Client-side: ใช้ subscribe รับ event
export function getPusherClient(): PusherClient {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(NEXT_PUBLIC_PUSHER_KEY, { cluster })
  }
  return pusherClientInstance  // singleton — สร้างครั้งเดียว
}

export function getShopChannel(shopId: string) {
  return `shop-${shopId}`  // channel แยกตามร้าน
}
```

**ทำไมต้อง singleton สำหรับ PusherClient?**
ถ้าสร้าง instance ใหม่ทุกครั้ง จะมีหลาย connection และรับ event ซ้ำกันหลายรอบ

**ทำไมแยก channel ตาม shopId?**
เพื่อให้ event ของร้าน A ไม่ไปถึงร้าน B — แต่ละร้านรับ notification ของตัวเองเท่านั้น

### Flow การส่ง Pusher
```
ลูกค้าสั่ง → POST /api/orders → pusherServer.trigger('shop-{id}', 'new-order', data)
                                                     ↓
                                    เจ้าของร้านที่ subscribe อยู่รับ event
                                                     ↓
                                    เล่นเสียง + แสดง toast notification
```

---

## 15. Web Push Notification

ไฟล์: `src/components/PushManager.tsx`, `src/components/OrderNotifier.tsx`

### PushManager — ขอสิทธิ์แจ้งเตือน
```typescript
async function subscribeAndSave() {
  const reg = await navigator.serviceWorker.register('/sw.js')  // ลงทะเบียน service worker
  await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,                                    // ต้องแสดง notification จริงๆ
    applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),  // ใช้ VAPID key เพื่อ auth
  })
  // ส่ง subscription object ไปเก็บในฐานข้อมูล
  await fetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub.toJSON()) })
}
```

**ทำไมต้อง Service Worker?**
Web Push ต้องผ่าน Service Worker — มันทำงาน background ได้แม้ browser จะปิด tab ไปแล้ว

**ทำไม urlBase64ToUint8Array?**
VAPID key เก็บเป็น base64 string แต่ browser API ต้องการ `Uint8Array` — ต้องแปลงก่อน

### OrderNotifier — จัดการ notification ซ้ำ
```typescript
const recentOrders = useRef<Map<string, number>>(new Map())

const handleOrder = useCallback((orderId, ...) => {
  const now = Date.now()
  // ถ้าเพิ่งรับ orderId นี้ไปแล้วใน 5 วินาที → ข้าม
  if (recentOrders.current.has(orderId) && now - recentOrders.current.get(orderId)! < 5000) return
  recentOrders.current.set(orderId, now)
  ...
}, [])
```

**ทำไมต้อง deduplicate?**
Pusher และ Service Worker Push อาจส่ง event สำหรับออเดอร์เดียวกันพร้อมกัน ถ้าไม่เช็คจะเล่นเสียงและแสดง toast 2 รอบ

**ทำไมใช้ `useRef` แทน `useState`?**
`useRef` เปลี่ยนค่าได้โดยไม่ trigger re-render — เหมาะสำหรับเก็บข้อมูลที่ไม่ต้องแสดงผล

---

## 16. Cron — รีเซ็ตสต็อกทุกคืน

ไฟล์: `src/app/api/cron/reset-stock/route.ts`

```typescript
export async function GET(req: NextRequest) {
  // ตรวจสอบ secret key ป้องกันใครก็ได้มาเรียก
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // รีเซ็ต soldCount ทุกเมนูทุกร้านพร้อมกัน
  await prisma.menuItem.updateMany({ data: { soldCount: 0 } })
}
```

**ทำไมต้องมี CRON_SECRET?**
ถ้าไม่มี ใครก็ตามที่รู้ URL จะกด reset stock ตอนไหนก็ได้ — secret ป้องกันการเรียกโดยไม่ได้รับอนุญาต

**ทำไมรีเซ็ตแค่ soldCount ไม่รีเซ็ต isAvailable ด้วย?**
เพราะ `isAvailable = false` คือเจ้าของร้านปิดเมนูนั้นไว้จงใจ ไม่ควรเปิดโดยอัตโนมัติ

Cron ตั้งเวลา: `0 17 * * *` (UTC) = `00:00` (เวลาไทย UTC+7)

---

## 17. ระบบ Admin — Users

ไฟล์: `src/app/admin/users/page.tsx` และ component ย่อย

### แยก Super Admin ออกจาก shop owner
```typescript
const adminUsers   = users.filter(u => u.role === 'SUPER_ADMIN')
const shopUsers    = users.filter(u => u.role !== 'SUPER_ADMIN' && u.shop)
const regularUsers = users.filter(u => u.role !== 'SUPER_ADMIN' && !u.shop)
```

แสดงในส่วนแยก ป้องกันความสับสนระหว่าง admin กับเจ้าของร้าน

### SuspendButton — ระงับบัญชี
```typescript
// ปุ่มสีแดง = ปกติ (กดเพื่อระงับ)
// ปุ่มสีเหลือง = ถูกระงับอยู่ (กดเพื่อปลดระงับ)
const action = isSuspended ? 'ปลดระงับ' : 'ระงับ'
await fetch('/api/admin/suspend-user', {
  body: JSON.stringify({ userId, suspended: !isSuspended })  // toggle
})
router.refresh()  // โหลดหน้าใหม่เพื่อแสดงสถานะล่าสุด
```

**ทำไมใช้ `router.refresh()` แทน setState?**
ข้อมูลมาจาก Server Component (page.tsx) ต้องสั่ง refresh เพื่อให้ server โหลดใหม่

### ResetPasswordModal
```typescript
// Admin กรอก password ใหม่ → bcrypt hash → อัปเดต database
const hashed = await bcrypt.hash(password, 10)
await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
```

**ทำไม bcrypt cost = 10?**
ตัวเลข 10 คือ "cost factor" — ยิ่งสูง ยิ่งช้าและปลอดภัยกว่า แต่ 10 เป็นค่าที่สมดุลระหว่างความปลอดภัยและความเร็ว

### DeleteUserButton — ลบบัญชี
```typescript
// API route: ลบตามลำดับ foreign key
const shop = await prisma.shop.findUnique(...)
if (shop) {
  const orderIds = orders.map(o => o.id)
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })  // 1. ลบ item
  await prisma.order.deleteMany({ where: { shopId: shop.id } })                // 2. ลบ order
  await prisma.menuItem.deleteMany({ where: { shopId: shop.id } })             // 3. ลบเมนู
  await prisma.shop.delete({ where: { id: shop.id } })                        // 4. ลบร้าน
}
await prisma.user.delete({ where: { id: userId } })                           // 5. ลบ user
```

**ทำไมต้องลบตามลำดับ?**
Foreign Key Constraint — ถ้า OrderItem อ้างอิง Order อยู่ จะลบ Order ไม่ได้ ต้องลบลูกก่อนพ่อแม่เสมอ

**ทำไมต้องป้องกันลบตัวเอง?**
```typescript
if (userId === session.user.id) return NextResponse.json({ error: '...' }, { status: 400 })
```
ป้องกัน admin ลบบัญชีตัวเองโดยไม่ตั้งใจ ซึ่งจะทำให้ระบบไม่มี admin เหลือ

---

## 18. ระบบ Admin — Permissions

ไฟล์: `src/app/admin/permissions/page.tsx`

### PermissionToggle — Toggle switch
```typescript
async function toggle() {
  const next = !enabled
  setEnabled(next)  // อัปเดต UI ทันที (optimistic)
  try {
    await fetch('/api/admin/set-permission', { body: JSON.stringify({ userId, key: permKey, value: next }) })
    router.refresh()
  } catch {
    setEnabled(!next)  // ถ้า error ให้ revert กลับ
    toast.error('เกิดข้อผิดพลาด')
  }
}
```

**ทำไม setEnabled ก่อน fetch?**
Optimistic UI — อัปเดต toggle ทันทีโดยไม่รอ server ทำให้รู้สึกเร็ว ถ้าเกิด error ค่อย revert

### API set-permission — ใช้ upsert
```typescript
await prisma.userPermission.upsert({
  where: { userId },
  update: { [key]: value },   // ถ้ามีอยู่แล้ว → update
  create: { userId, [key]: value },  // ถ้ายังไม่มี → create ใหม่
})
```

**ทำไมใช้ upsert?**
ไม่รู้ว่า user คนนี้มี permission record หรือเปล่า `upsert` จัดการทั้ง 2 กรณีในคำสั่งเดียว

### ShopTypeSelect — เลือกประเภทร้านหลายอย่าง
```typescript
const current = currentType ? currentType.split(',').map(s => s.trim()).filter(Boolean) : []
// "ร้านเครื่องดื่ม,ร้านอาหาร" → ['ร้านเครื่องดื่ม', 'ร้านอาหาร']

async function toggle(type: string) {
  const next = selected.includes(type)
    ? selected.filter(s => s !== type)   // ถ้าเลือกอยู่แล้ว → เอาออก
    : [...selected, type]                // ถ้ายังไม่ได้เลือก → เพิ่ม
  await fetch('/api/admin/set-shop-type', { body: JSON.stringify({ userId, shopType: next.join(',') }) })
  // ['ร้านเครื่องดื่ม', 'ร้านอาหาร'] → "ร้านเครื่องดื่ม,ร้านอาหาร"
}
```

---

## 19. Forgot / Reset Password

### ขอ Reset Link
ไฟล์: `src/app/api/auth/forgot-password/route.ts`

```typescript
// สร้าง token แบบสุ่ม 32 bytes (64 ตัวอักษร hex)
const token = randomBytes(32).toString('hex')
const expiresAt = new Date(Date.now() + 60 * 60 * 1000)  // หมดอายุใน 1 ชั่วโมง

// เก็บ token ใน database
await prisma.passwordResetToken.create({ data: { email, token, expiresAt } })

// ส่งอีเมลผ่าน Resend (ถ้ามี API key)
// ถ้าไม่มี API key → แสดง URL ใน console (development mode)
```

**ทำไม return `{ success: true }` แม้ email ไม่มีในระบบ?**
```typescript
if (!user) return NextResponse.json({ success: true })  // ไม่บอกว่าไม่มี
```
ป้องกัน email enumeration attack — ถ้าบอกว่า "email นี้ไม่มีในระบบ" ผู้ไม่หวังดีจะใช้ทดสอบหา email ที่ใช้งานอยู่ได้

### ยืนยัน Token และเปลี่ยนรหัสผ่าน
ไฟล์: `src/app/api/auth/reset-password/route.ts`

```typescript
const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

// เช็ค 3 เงื่อนไข
if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
  return NextResponse.json({ error: 'ลิงก์หมดอายุหรือไม่ถูกต้อง...' })
}

// บันทึกรหัสใหม่ + mark token ว่าใช้แล้ว (ใน transaction เดียว)
await prisma.$transaction([
  prisma.user.update({ where: { email: resetToken.email }, data: { password: hashed } }),
  prisma.passwordResetToken.update({ where: { token }, data: { used: true } }),
])
```

**ทำไม mark `used: true` แทนการลบ token?**
เก็บ history ไว้ว่า token นี้เคยใช้ไปแล้ว ป้องกันใช้ลิงก์ซ้ำได้

**ทำไมใช้ transaction?**
ถ้าเปลี่ยน password สำเร็จแต่ mark token ล้มเหลว → token ยังใช้ได้อีกครั้ง อันตราย transaction ทำให้ทั้ง 2 ต้องสำเร็จพร้อมกัน

---

## 20. สมัครสมาชิก (Register)

ไฟล์: `src/app/api/register/route.ts`

```typescript
function slugify(text: string) {
  const latin = text.toLowerCase()
    .replace(/[^\w\s-]/g, '')   // ลบอักขระพิเศษ (รวมถึงภาษาไทย)
    .replace(/\s+/g, '-')       // แทนที่ช่องว่างด้วย -
    .trim()
  return latin.length >= 3 ? latin : `shop-${Date.now()}`  // ถ้าชื่อสั้นหรือเป็นไทยล้วน → ใช้ timestamp
}
```

**ทำไมต้องมี slug fallback เป็น `shop-${Date.now()}`?**
ถ้าชื่อร้านเป็นภาษาไทยล้วน เช่น "ร้านข้าวแกง" หลัง slugify จะได้ string ว่าง ต้องใช้ timestamp แทน

```typescript
const user = await prisma.user.create({
  data: {
    name, email, password: hashed,
    shop: {
      create: {         // สร้าง shop พร้อม user ในคำสั่งเดียว (nested create)
        slug, name: shopName, isOpen: true,
      }
    }
  }
})
```

**ทำไมใช้ nested create?**
Prisma จัดการ transaction ให้อัตโนมัติ — ถ้าสร้าง user สำเร็จแต่สร้าง shop ล้มเหลว จะ rollback ทั้งคู่

---

## สรุป Pattern ที่ใช้ทั้งระบบ

| Pattern | อธิบาย |
|---------|--------|
| `'use client'` | Component นี้รันบน browser (มี state, event handler, useEffect) |
| ไม่มี `'use client'` | Component รันบน server (อ่าน database ได้, ไม่มี useState) |
| `getServerSession` | ดึง session บน server — ใช้ใน API routes และ Server Components |
| `useRouter().refresh()` | โหลดข้อมูลใหม่จาก server โดยไม่ reload หน้า |
| `prisma.$transaction` | ทำหลาย query พร้อมกัน ถ้าอันใดล้มเหลว → rollback ทั้งหมด |
| `Promise.all` | รัน query หลายอันพร้อมกัน (เร็วกว่า await ทีละอัน) |
| `useState` optimistic | อัปเดต UI ก่อน fetch เพื่อความรู้สึกเร็ว ถ้า error ค่อย revert |
| `useRef` | เก็บข้อมูลที่ไม่ต้องการ re-render เมื่อเปลี่ยน |
| cleanup ใน `useEffect` | `return () => { ... }` ยกเลิก subscription เมื่อออกจากหน้า |

---

## วิธีแปลงเป็น PDF

1. เปิดไฟล์นี้ใน VS Code
2. กด `Ctrl+Shift+V` เพื่อดู Preview
3. คลิกขวาใน Preview → **Open in Browser**
4. กด `Ctrl+P` → **Save as PDF**

หรือเปิดด้วย browser โดยตรง แล้ว Print → Save as PDF
