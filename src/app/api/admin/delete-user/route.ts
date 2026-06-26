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

  // ลบตามลำดับ foreign key
  const shop = await prisma.shop.findUnique({ where: { userId }, select: { id: true } })
  if (shop) {
    const orders = await prisma.order.findMany({ where: { shopId: shop.id }, select: { id: true } })
    const orderIds = orders.map(o => o.id)
    if (orderIds.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
      await prisma.order.deleteMany({ where: { shopId: shop.id } })
    }
    await prisma.menuItem.deleteMany({ where: { shopId: shop.id } })
    await prisma.shop.delete({ where: { id: shop.id } })
  }

  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ ok: true })
}
