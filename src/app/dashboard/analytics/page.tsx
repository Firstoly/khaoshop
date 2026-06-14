import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './AnalyticsClient'
import { startOfDay, subDays, format } from 'date-fns'

async function getAnalyticsData(shopId: string) {
  const today = startOfDay(new Date())

  // เงื่อนไขหลัก: ได้รับเงินแล้ว (VERIFIED) เท่านั้น
  const paidWhere = { shopId, status: { not: 'CANCELLED' as const }, paymentStatus: 'VERIFIED' as const }

  // Last 30 days daily revenue (เฉพาะที่รับเงินแล้ว)
  const dailyData = await Promise.all(
    Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i)
      const nextDate = subDays(today, 28 - i)
      return prisma.order.aggregate({
        where: { ...paidWhere, createdAt: { gte: date, lt: nextDate } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }).then(r => ({
        date: format(date, 'dd/MM'),
        revenue: r._sum.totalAmount ?? 0,
        orders: r._count.id,
      }))
    })
  )

  // Weekly summary (last 8 weeks, เฉพาะที่รับเงินแล้ว)
  const weeklyData = await Promise.all(
    Array.from({ length: 8 }, (_, i) => {
      const weekStart = subDays(today, (7 - i) * 7)
      const weekEnd = subDays(today, (6 - i) * 7)
      return prisma.order.aggregate({
        where: { ...paidWhere, createdAt: { gte: weekStart, lt: weekEnd } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }).then(r => ({
        week: `สัปดาห์ที่ ${i + 1}`,
        revenue: r._sum.totalAmount ?? 0,
        orders: r._count.id,
      }))
    })
  )

  // Top menu items (all time, เฉพาะที่รับเงินแล้ว)
  const topMenus = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: { order: paidWhere },
    _sum: { quantity: true },
    _count: { id: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  })

  const topMenusWithNames = await Promise.all(
    topMenus.map(async (tm) => {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: tm.menuItemId } })
      return {
        name: menuItem?.name ?? 'เมนูที่ถูกลบ',
        quantity: tm._sum.quantity ?? 0,
        orders: tm._count.id,
      }
    })
  )

  // Payment method breakdown (30 วันล่าสุด, เฉพาะที่รับเงินแล้ว)
  const monthStart = subDays(today, 30)
  const [cashCount, qrCount] = await Promise.all([
    prisma.order.count({ where: { ...paidWhere, paymentMethod: 'CASH', createdAt: { gte: monthStart } } }),
    prisma.order.count({ where: { ...paidWhere, paymentMethod: 'PROMPTPAY', createdAt: { gte: monthStart } } }),
  ])

  // Summary stats (เฉพาะที่รับเงินแล้ว)
  const [totalOrders, totalRevenue, thisMonthOrders, thisMonthRevenue] = await Promise.all([
    prisma.order.count({ where: paidWhere }),
    prisma.order.aggregate({ where: paidWhere, _sum: { totalAmount: true } }),
    prisma.order.count({ where: { ...paidWhere, createdAt: { gte: monthStart } } }),
    prisma.order.aggregate({ where: { ...paidWhere, createdAt: { gte: monthStart } }, _sum: { totalAmount: true } }),
  ])

  // ยอดค้างชำระ (ไม่ถูก CANCELLED และยังไม่ VERIFIED)
  const unpaidResult = await prisma.order.aggregate({
    where: { shopId, status: { not: 'CANCELLED' }, paymentStatus: { not: 'VERIFIED' } },
    _sum: { totalAmount: true },
    _count: { id: true },
  })

  return {
    dailyData,
    weeklyData,
    topMenus: topMenusWithNames,
    paymentBreakdown: { cash: cashCount, qr: qrCount },
    summary: {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      thisMonthOrders,
      thisMonthRevenue: thisMonthRevenue._sum.totalAmount ?? 0,
    },
    unpaid: {
      amount: unpaidResult._sum.totalAmount ?? 0,
      count: unpaidResult._count.id,
    },
  }
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const shopId = (session.user as any).shopId
  const data = await getAnalyticsData(shopId)
  return <AnalyticsClient data={data} />
}
