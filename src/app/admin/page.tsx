import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'
import { Store, ShoppingBag, Users, TrendingUp, ExternalLink } from 'lucide-react'

async function getAdminData() {
  const today = new Date()
  const [shops, totalUsers, todayOrders, totalRevenue] = await Promise.all([
    prisma.shop.findMany({
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { orders: true, menuItems: true } },
        orders: {
          where: { createdAt: { gte: startOfDay(today), lte: endOfDay(today) } },
          select: { totalAmount: true, paymentStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfDay(today), lte: endOfDay(today) } } }),
    prisma.order.aggregate({ where: { paymentStatus: 'VERIFIED' }, _sum: { totalAmount: true } }),
  ])
  return { shops, totalUsers, todayOrders, totalRevenue: totalRevenue._sum.totalAmount ?? 0 }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') redirect('/dashboard')

  const { shops, totalUsers, todayOrders, totalRevenue } = await getAdminData()

  const stats = [
    { label: 'ร้านค้าทั้งหมด', value: shops.length, icon: Store, bg: 'bg-orange-50', text: 'text-orange-600' },
    { label: 'ผู้ใช้ทั้งหมด', value: totalUsers, icon: Users, bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'ออเดอร์วันนี้', value: todayOrders, icon: ShoppingBag, bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'รายได้รวม (ยืนยันแล้ว)', value: formatPrice(totalRevenue), icon: TrendingUp, bg: 'bg-violet-50', text: 'text-violet-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔐 Super Admin</h1>
            <p className="text-sm text-gray-400 mt-0.5">ภาพรวมระบบทั้งหมด</p>
          </div>
          <Link href="/dashboard" className="text-sm text-blue-500 hover:underline">
            ← กลับ Dashboard ร้านฉัน
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.text}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Shops table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">ร้านค้าทั้งหมดในระบบ</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-6 py-3">ชื่อร้าน</th>
                  <th className="text-left px-6 py-3">เจ้าของ</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-center px-6 py-3">เมนู</th>
                  <th className="text-center px-6 py-3">ออเดอร์วันนี้</th>
                  <th className="text-right px-6 py-3">ยอดวันนี้</th>
                  <th className="text-center px-6 py-3">สถานะ</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shops.map(shop => {
                  const todayRevenue = shop.orders
                    .filter(o => o.paymentStatus === 'VERIFIED')
                    .reduce((s, o) => s + o.totalAmount, 0)
                  return (
                    <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{shop.name}</td>
                      <td className="px-6 py-4 text-gray-600">{shop.user.name}</td>
                      <td className="px-6 py-4 text-gray-400">{shop.user.email}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{shop._count.menuItems}</td>
                      <td className="px-6 py-4 text-center font-semibold text-orange-500">{shop.orders.length}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatPrice(todayRevenue)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${shop.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {shop.isOpen ? 'เปิด' : 'ปิด'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/store/${shop.slug}`} target="_blank"
                          className="text-blue-400 hover:text-blue-600 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
