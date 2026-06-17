import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'
import { Store, ShoppingBag, Users, TrendingUp, CheckCircle2, Clock, Package, ExternalLink, ArrowRight } from 'lucide-react'

async function getAdminData() {
  const today = new Date()
  const [shops, totalUsers, totalRevenue, recentOrders] = await Promise.all([
    prisma.shop.findMany({
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { menuItems: true, orders: true } },
        orders: {
          where: { createdAt: { gte: startOfDay(today), lte: endOfDay(today) } },
          select: { totalAmount: true, paymentStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
    prisma.order.aggregate({ where: { paymentStatus: 'VERIFIED' }, _sum: { totalAmount: true } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        shop: { select: { name: true, slug: true } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
    }),
  ])
  return { shops, totalUsers, totalRevenue: totalRevenue._sum.totalAmount ?? 0, recentOrders }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') redirect('/dashboard')

  const { shops, totalUsers, totalRevenue, recentOrders } = await getAdminData()

  const todayOrdersAll = shops.reduce((s, sh) => s + sh.orders.length, 0)
  const todayRevAll = shops.reduce((s, sh) =>
    s + sh.orders.filter(o => o.paymentStatus === 'VERIFIED').reduce((r, o) => r + o.totalAmount, 0), 0)

  const stats = [
    { label: 'ร้านค้าในระบบ',        value: shops.length,         icon: Store,     bg: 'bg-orange-50',  text: 'text-orange-600' },
    { label: 'ผู้ใช้ทั้งหมด',         value: totalUsers,           icon: Users,     bg: 'bg-blue-50',    text: 'text-blue-600'   },
    { label: 'ออเดอร์วันนี้ทุกร้าน', value: todayOrdersAll,       icon: ShoppingBag, bg: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'รายได้รวม (ยืนยันแล้ว)', value: formatPrice(totalRevenue), icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-600' },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
        <p className="text-sm text-gray-400 mt-0.5">ภาพรวมแพลตฟอร์มทั้งหมด</p>
      </div>

      {/* Today banner */}
      <div className="bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-violet-200">
        <div>
          <p className="text-violet-200 text-sm">ยอดรวมวันนี้ทุกร้าน</p>
          <p className="font-display text-3xl font-bold mt-1">{formatPrice(todayRevAll)}</p>
        </div>
        <div className="text-right">
          <p className="text-violet-200 text-sm">ออเดอร์วันนี้</p>
          <p className="font-display text-3xl font-bold mt-1">{todayOrdersAll} รายการ</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card-base p-5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.text}`} />
            </div>
            <p className="font-display text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/admin/users"
          className="card-base p-4 flex items-center gap-4 hover:shadow-card-hover transition-all group">
          <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center transition-colors shrink-0">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800">จัดการผู้ใช้</p>
            <p className="text-xs text-gray-400">{totalUsers} บัญชีในระบบ</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
        </Link>

        <Link href="/admin/shops"
          className="card-base p-4 flex items-center gap-4 hover:shadow-card-hover transition-all group">
          <div className="w-12 h-12 bg-orange-50 group-hover:bg-orange-100 rounded-xl flex items-center justify-center transition-colors shrink-0">
            <Store className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800">จัดการร้านค้า</p>
            <p className="text-xs text-gray-400">{shops.length} ร้านในระบบ</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-gray-900">ออเดอร์ล่าสุด (ทุกร้าน)</h2>
          </div>
          <div className="space-y-2">
            {recentOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">ยังไม่มีออเดอร์</p>
              </div>
            ) : recentOrders.map(order => (
              <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-violet-50 transition-colors">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet-500">#{order.queueNumber.toString().padStart(3, '0')}</span>
                    <span className="text-sm font-semibold text-gray-800 truncate">{order.shop.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {order.items.map(i => i.menuItem.name).join(', ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-800">{formatPrice(order.totalAmount)}</p>
                  {order.paymentStatus === 'VERIFIED' ? (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 justify-end"><CheckCircle2 className="w-3 h-3" />ยืนยันแล้ว</span>
                  ) : order.paymentStatus === 'PAID' ? (
                    <span className="text-[10px] text-blue-500 flex items-center gap-0.5 justify-end"><Clock className="w-3 h-3" />รอตรวจสอบ</span>
                  ) : (
                    <span className="text-[10px] text-gray-400">รอชำระ</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shops summary */}
        <div className="card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-gray-900">ร้านค้า</h2>
            <Link href="/admin/shops" className="text-xs text-violet-500 hover:text-violet-600 font-medium">ดูทั้งหมด →</Link>
          </div>
          <div className="space-y-3">
            {shops.slice(0, 6).map(shop => (
              <div key={shop.id} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{shop.name}</p>
                  <p className="text-xs text-gray-400">{shop._count.menuItems} เมนู · {shop.orders.length} ออเดอร์วันนี้</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${shop.isOpen ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  <Link href={`/store/${shop.slug}`} target="_blank" className="text-gray-300 hover:text-blue-400 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
