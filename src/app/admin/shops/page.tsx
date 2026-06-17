import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'
import { ExternalLink, Store } from 'lucide-react'

async function getShops() {
  const today = new Date()
  return prisma.shop.findMany({
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">จัดการร้านค้า</h1>
        <p className="text-sm text-gray-400 mt-1">ร้านค้าทั้งหมด {shops.length} ร้าน</p>
      </div>

      <div className="space-y-4">
        {shops.map(shop => {
          const todayRev = shop.orders
            .filter(o => o.paymentStatus === 'VERIFIED')
            .reduce((s, o) => s + o.totalAmount, 0)
          const categories = Array.from(new Set(shop.menuItems.map(m => m.category).filter((c): c is string => c !== null)))
          const availableMenus = shop.menuItems.filter(m => m.isAvailable).length

          return (
            <div key={shop.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs text-gray-400">ยอดวันนี้</p>
                    <p className="font-bold text-emerald-600">{formatPrice(todayRev)}</p>
                    <p className="text-xs text-orange-500">{shop.orders.length} ออเดอร์วันนี้</p>
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

              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    เมนู <span className="text-orange-500">{shop.menuItems.length} รายการ</span>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {shop.menuItems.map(menu => (
                      <div key={menu.id} className={`rounded-xl p-3 border ${menu.isAvailable ? 'bg-gray-50 border-gray-100' : 'bg-gray-50 border-gray-100 opacity-40'}`}>
                        <p className="text-sm font-medium text-gray-800 leading-tight truncate">{menu.name}</p>
                        {menu.category && <p className="text-xs text-gray-400 mt-0.5">{menu.category}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-bold text-orange-600">{formatPrice(menu.price)}</p>
                          <p className="text-xs text-gray-400">{menu.soldCount}/{menu.dailyLimit}</p>
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
  )
}
