// ===================================================
// POST /api/admin/delete-user — ลบบัญชี user และข้อมูลร้านทั้งหมด
// ต้องลบตามลำดับ foreign key: OrderItem → Order → MenuItem → Shop → User
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  // ป้องกันลบตัวเอง
  if (userId === (session.user as any).id) {
    return NextResponse.json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' }, { status: 400 })
  }

  // ลบตามลำดับ foreign key เพื่อป้องกัน constraint error
  const shop = await prisma.shop.findUnique({ where: { userId }, select: { id: true } })
  if (shop) {
    const orders = await prisma.order.findMany({ where: { shopId: shop.id }, select: { id: true } })
    const orderIds = orders.map(o => o.id)
    if (orderIds.length > 0) {
      // 1. ลบ OrderItem ก่อน (อ้างอิง Order)
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
      // 2. ลบ Order (อ้างอิง Shop)
      await prisma.order.deleteMany({ where: { shopId: shop.id } })
    }
    // 3. ลบ MenuItem (อ้างอิง Shop)
    await prisma.menuItem.deleteMany({ where: { shopId: shop.id } })
    // 4. ลบ Shop (อ้างอิง User)
    await prisma.shop.delete({ where: { id: shop.id } })
  }

  // 5. ลบ User สุดท้าย
  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ ok: true })
}
