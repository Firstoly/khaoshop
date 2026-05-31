import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'
import { startOfDay, endOfDay } from 'date-fns'

async function getDashboardData(shopId: string) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  const [todayOrders, allMenuItems, recentOrders, pendingCount, debtCount, debtAmount] = await Promise.all([
    prisma.order.findMany({
      where: { shopId, createdAt: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELLED' } },
      include: { items: { include: { menuItem: true } } },
    }),
    prisma.menuItem.findMany({ where: { shopId } }),
    prisma.order.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { items: { include: { menuItem: true } } },
    }),
    prisma.order.count({ where: { shopId, status: 'PENDING' } }),
    // ลูกหนี้: เงินสดที่ยังไม่จ่าย (ไม่ว่าวันไหน)
    prisma.order.count({
      where: { shopId, paymentMethod: 'CASH', paymentStatus: 'PENDING', status: { not: 'CANCELLED' } }
    }),
    prisma.order.aggregate({
      where: { shopId, paymentMethod: 'CASH', paymentStatus: 'PENDING', status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true }
    }),
  ])

  // ยอดขายวันนี้ → นับเฉพาะที่ชำระแล้ว (VERIFIED) เท่านั้น
  const todayRevenue = todayOrders
    .filter(o => o.paymentStatus === 'VERIFIED')
    .reduce((sum, o) => sum + o.totalAmount, 0)

  // ยอดรอรับวันนี้ (สั่งแล้วแต่ยังไม่จ่าย)
  const todayPending = todayOrders
    .filter(o => o.paymentStatus === 'PENDING')
    .reduce((sum, o) => sum + o.totalAmount, 0)

  const lowStock = allMenuItems.filter(m => (m.dailyLimit - m.soldCount) <= 3 && m.isAvailable)

  const soldMap: Record<string, { item: any; count: number }> = {}
  todayOrders.forEach(order => {
    order.items.forEach(oi => {
      if (!soldMap[oi.menuItemId]) soldMap[oi.menuItemId] = { item: oi.menuItem, count: 0 }
      soldMap[oi.menuItemId].count += oi.quantity
    })
  })
  const topSelling = Object.values(soldMap).sort((a, b) => b.count - a.count).slice(0, 4)

  return {
    todayOrderCount: todayOrders.length,
    todayRevenue,
    todayPending,
    pendingCount,
    totalMenuItems: allMenuItems.length,
    lowStock,
    recentOrders,
    topSelling,
    debtCount,
    debtAmount: debtAmount._sum.totalAmount ?? 0,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const shopId = (session.user as any).shopId
  if (!shopId) redirect('/login')
  const data = await getDashboardData(shopId)
  return <DashboardClient data={data} shopId={shopId} />
}
