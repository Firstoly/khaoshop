import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'
import { ExternalLink, Store, TrendingUp, ShoppingBag, UtensilsCrossed, ChevronRight } from 'lucide-react'

async function getShops() {
  const today = new Date()
  return prisma.shop.findMany({
    where: { user: { role: 'USER' } },
    include: {
      user: { select: { name: true, email: true } },
      menuItems: {
        select: { id: true, name: true, price: true, category: true, isAvailable: true, soldCount: true, dailyLimit: true },
        orderBy: { soldCount: 'desc' },
      },
      orders: {
        where: { createdAt: { gte: startOfDay(today), lte: endOfDay(today) } },
        select: { totalAmount: true, paymentStatus: true },
      },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function ShopsPage() {
  const shops = await getShops()
  const openCount = shops.filter(s => s.isOpen).length

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">จัดการร้านค้า</h1>
          <p className="text-sm text-gray-400 mt-0.5">ร้านค้าทั้งหมด {shops.length} ร้าน · เปิดอยู่ {openCount} ร้าน</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'ร้านทั้งหมด',  value: shops.length, icon: Store,         bg: 'bg-orange-50',  text: 'text-orange-500'  },
          { label: 'กำลังเปิด',    value: openCount,    icon: TrendingUp,    bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'ออเดอร์วันนี้', value: shops.reduce((s,sh)=>s+sh.orders.length,0), icon: ShoppingBag, bg: 'bg-violet-50', text: 'text-violet-500' },
        ].map(s => (
          <div key={s.label} className="card-base p-5">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.text}`} />
            </div>
            <p className="font-display text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Shop cards */}
      <div className="space-y-4">
        {shops.map(shop => {
          const todayRev = shop.orders
            .filter(o => o.paymentStatus === 'VERIFIED')
            .reduce((s, o) => s + o.totalAmount, 0)
          const categories = Array.from(new Set(
            shop.menuItems.map(m => m.category).filter((c): c is string => c !== null)
          ))
          const available = shop.menuItems.filter(m => m.isAvailable).length

          return (
            <div key={shop.id} className="card-base overflow-hidden animate-fade-in hover:shadow-card-hover transition-shadow duration-200">
              {/* Shop header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-gray-900">{shop.name}</h3>
                      <span className={`status-badge text-[10px] ${shop.isOpen
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                        {shop.isOpen ? 'เปิด' : 'ปิด'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{shop.user.name} · {shop.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-5 text-right">
                  <div>
                    <p className="text-xs text-gray-400">ยอดวันนี้</p>
                    <p className="font-display font-bold text-emerald-600">{formatPrice(todayRev)}</p>
                    <p className="text-xs text-violet-500 font-semibold">{shop.orders.length} ออเดอร์</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">ออเดอร์รวม</p>
                    <p className="font-display font-bold text-gray-700">{shop._count.orders}</p>
                  </div>
                  <Link href={`/admin/shops/${shop.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-xs font-semibold transition-colors">
                    <ChevronRight className="w-3.5 h-3.5" />
                    เข้าดูร้าน
                  </Link>
                  <Link href={`/store/${shop.slug}`} target="_blank"
                    className="w-9 h-9 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-400 hover:text-blue-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Menu section */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700">
                      เมนูทั้งหมด
                      <span className="text-orange-500 ml-1">{shop.menuItems.length} รายการ</span>
                      <span className="text-gray-400 font-normal ml-1">· เปิดขาย {available}</span>
                    </p>
                  </div>
                  {categories.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {categories.map(cat => (
                        <span key={cat} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{cat}</span>
                      ))}
                    </div>
                  )}
                </div>

                {shop.menuItems.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <UtensilsCrossed className="w-8 h-8 mx-auto mb-1 opacity-20" />
                    <p className="text-xs">ยังไม่มีเมนู</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {shop.menuItems.map(menu => {
                      const remaining = menu.dailyLimit - menu.soldCount
                      const lowStock = remaining <= 3
                      return (
                        <div key={menu.id}
                          className={`rounded-xl p-3 border transition-colors ${
                            !menu.isAvailable ? 'bg-gray-50 border-gray-100 opacity-40' :
                            lowStock ? 'bg-red-50 border-red-100' :
                            'bg-gray-50 border-gray-100 hover:bg-orange-50 hover:border-orange-100'
                          }`}>
                          <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{menu.name}</p>
                          {menu.category && <p className="text-[10px] text-gray-400 mt-0.5">{menu.category}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-sm font-bold text-orange-500">{formatPrice(menu.price)}</p>
                            <span className={`text-[10px] font-semibold ${
                              remaining === 0 ? 'text-red-500' :
                              lowStock ? 'text-orange-500' : 'text-gray-400'
                            }`}>
                              {remaining === 0 ? 'หมด' : `${menu.soldCount}/${menu.dailyLimit}`}
                            </span>
                          </div>
                          {/* sold bar */}
                          <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                remaining === 0 ? 'bg-red-400' :
                                lowStock ? 'bg-orange-400' : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.min((menu.soldCount / menu.dailyLimit) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
