import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'
import { Store, ShoppingBag, Users, TrendingUp, ExternalLink, ChefHat, CheckCircle2, Clock, Package } from 'lucide-react'

async function getAdminData() {
  const today = new Date()
  const [shops, totalUsers, totalOrders, totalRevenue, recentOrders] = await Promise.all([
    prisma.shop.findMany({
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        menuItems: {
          select: { id: true, name: true, price: true, category: true, isAvailable: true, soldCount: true, dailyLimit: true },
          orderBy: { soldCount: 'desc' },
        },
        orders: {
          where: { createdAt: { gte: startOfDay(today), lte: endOfDay(today) } },
          select: { totalAmount: true, paymentStatus: true, status: true },
        },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.aggregate({ where: { paymentStatus: 'VERIFIED' }, _sum: { totalAmount: true } }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        shop: { select: { name: true, slug: true } },
        items: { include: { menuItem: { select: { name: true } } } },
      },
    }),
  ])
  return { shops, totalUsers, totalOrders, totalRevenue: totalRevenue._sum.totalAmount ?? 0, recentOrders }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') redirect('/dashboard')

  const { shops, totalUsers, totalRevenue, recentOrders } = await getAdminData()

  const todayOrdersAll = shops.reduce((s, sh) => s + sh.orders.length, 0)
  const todayRevAll = shops.reduce((s, sh) =>
    s + sh.orders.filter(o => o.paymentStatus === 'VERIFIED').reduce((r, o) => r + o.totalAmount, 0), 0)

  const stats = [
    { label: 'ร้านค้าในระบบ', value: shops.length, icon: Store, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    { label: 'ผู้ใช้ทั้งหมด', value: totalUsers, icon: Users, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { label: 'ออเดอร์วันนี้ (ทุกร้าน)', value: todayOrdersAll, icon: ShoppingBag, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { label: 'รายได้รวม (ยืนยันแล้ว)', value: formatPrice(totalRevenue), icon: TrendingUp, bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Super Admin — KhaoShop</h1>
              <p className="text-xs text-gray-400">ภาพรวมแพลตฟอร์มทั้งหมด</p>
            </div>
          </div>
          <Link href="/dashboard" className="text-sm text-blue-500 hover:underline">
            ← กลับ Dashboard ร้านฉัน
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className={`bg-white rounded-2xl p-5 shadow-sm border ${s.border}`}>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.text}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Today summary bar */}
        <div className="bg-gradient-to-r from-violet-600 to-violet-500 rounded-2xl p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-violet-200 text-sm">ยอดรวมวันนี้ทุกร้าน</p>
            <p className="text-3xl font-bold mt-1">{formatPrice(todayRevAll)}</p>
          </div>
          <div className="text-right">
            <p className="text-violet-200 text-sm">ออเดอร์วันนี้</p>
            <p className="text-3xl font-bold mt-1">{todayOrdersAll} รายการ</p>
          </div>
        </div>

        {/* Shops */}
        <div>
          <h2 className="font-bold text-gray-900 text-lg mb-3">ร้านค้าทั้งหมด ({shops.length} ร้าน)</h2>
          <div className="space-y-4">
            {shops.map(shop => {
              const todayRev = shop.orders
                .filter(o => o.paymentStatus === 'VERIFIED')
                .reduce((s, o) => s + o.totalAmount, 0)
              const todayOrderCount = shop.orders.length
              const categories = [...new Set(shop.menuItems.map(m => m.category).filter(Boolean))]
              const availableMenus = shop.menuItems.filter(m => m.isAvailable).length

              return (
                <div key={shop.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Shop header */}
                  <div className="px-6 py-4 flex items-start justify-between border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Store className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{shop.name}</h3>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${shop.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {shop.isOpen ? 'เปิด' : 'ปิด'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{shop.user.name} · {shop.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-xs text-gray-400">ยอดวันนี้</p>
                        <p className="font-bold text-emerald-600">{formatPrice(todayRev)}</p>
                        <p className="text-xs text-orange-500">{todayOrderCount} ออเดอร์</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">ออเดอร์รวม</p>
                        <p className="font-bold text-gray-700">{shop._count.orders}</p>
                      </div>
                      <Link href={`/store/${shop.slug}`} target="_blank"
                        className="w-9 h-9 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-500 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Menu list */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-700">
                        เมนูทั้งหมด <span className="text-orange-500">{shop.menuItems.length} รายการ</span>
                        <span className="text-gray-400 font-normal ml-2">· เปิดขาย {availableMenus} รายการ</span>
                      </p>
                      {categories.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {categories.map(cat => (
                            <span key={cat} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{cat}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {shop.menuItems.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">ยังไม่มีเมนู</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {shop.menuItems.map(menu => (
                          <div key={menu.id} className={`rounded-xl p-3 border ${menu.isAvailable ? 'bg-gray-50 border-gray-100' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-sm font-medium text-gray-800 leading-tight">{menu.name}</p>
                              {!menu.isAvailable && (
                                <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">ปิด</span>
                              )}
                            </div>
                            {menu.category && (
                              <p className="text-xs text-gray-400 mt-0.5">{menu.category}</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-sm font-bold text-orange-600">{formatPrice(menu.price)}</p>
                              <p className="text-xs text-gray-400">ขาย {menu.soldCount}/{menu.dailyLimit}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent orders across all shops */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">ออเดอร์ล่าสุด (ทุกร้าน)</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.map(order => (
              <div key={order.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      <span className="text-orange-500">#{order.queueNumber.toString().padStart(3, '0')}</span>
                      {' '}· {order.shop.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.items.map(i => i.menuItem.name).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{formatPrice(order.totalAmount)}</p>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    {order.paymentStatus === 'VERIFIED' ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> ยืนยันแล้ว</span>
                    ) : order.paymentStatus === 'PAID' ? (
                      <span className="text-xs text-blue-500 flex items-center gap-0.5"><Clock className="w-3 h-3" /> รอตรวจสอบ</span>
                    ) : (
                      <span className="text-xs text-gray-400">รอชำระ</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
