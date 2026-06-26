// ===================================================
// Dashboard Layout — ครอบทุกหน้าใน /dashboard/*
// ตรวจสอบ login และ role ก่อนแสดงหน้า
// โหลด permissions จาก database เพื่อส่งให้ Sidebar
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/admin/Sidebar'
import { Topbar } from '@/components/admin/Topbar'
import { PushManager } from '@/components/PushManager'
import { OrderNotifier } from '@/components/OrderNotifier'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  // ถ้าไม่ได้ login → ไปหน้า login
  if (!session) redirect('/login')
  // ถ้าเป็น SUPER_ADMIN → ไปหน้า admin แทน
  if ((session.user as any)?.role === 'SUPER_ADMIN') redirect('/admin')

  const userId = (session.user as any)?.id
  const shopId = (session.user as any)?.shopId as string | undefined

  // โหลด permissions และ shop settings พร้อมกัน (เร็วกว่า await ทีละอัน)
  const [permission, shop] = await Promise.all([
    userId ? prisma.userPermission.findUnique({ where: { userId } }) : null,
    userId ? prisma.shop.findUnique({ where: { userId }, select: { showKitchen: true } }) : null,
  ])

  // ถ้าไม่มี permission record ให้เปิดทุกอย่าง (default = true)
  const perms = {
    canMenu:      permission?.canMenu      ?? true,
    canOrders:    permission?.canOrders    ?? true,
    canKitchen:   permission?.canKitchen   ?? true,
    canDebt:      permission?.canDebt      ?? true,
    canAnalytics: permission?.canAnalytics ?? true,
    canSettings:  permission?.canSettings  ?? true,
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar รับ permissions เพื่อซ่อนเมนูที่ไม่มีสิทธิ์ */}
      <Sidebar permissions={perms} showKitchen={shop?.showKitchen ?? true} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar session={session} />
        {/* PushManager ขอสิทธิ์แจ้งเตือน browser */}
        <PushManager />
        {/* OrderNotifier รับ event Pusher และเล่นเสียงเมื่อมีออเดอร์ใหม่ */}
        {shopId && <OrderNotifier shopId={shopId} />}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
