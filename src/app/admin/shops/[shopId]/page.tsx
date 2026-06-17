import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'
import {
  ArrowLeft, Store, ExternalLink, ShoppingBag, TrendingUp,
  UtensilsCrossed, Phone, MapPin, QrCode, Banknote, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'
import { AdminOrdersClient } from './AdminOrdersClient'

async function getShop(shopId: string) {
  const today = new Date()
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      user: { select: { name: true, email: true } },
      menuItems: {
        select: { id: true, name: true, price: true, category: true, isAvailable: true, soldCount: true, dailyLimit: true, imageUrl: true },
        orderBy: { soldCount: 'desc' },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { menuItem: { select: { name: true } } } },
        },
      },
    },
  })
  if (!shop) return null

  const todayOrders = shop.orders.filter(o =>
    new Date(o.createdAt) >= startOfDay(today) && new Date(o.createdAt) <= endOfDay(today)
  )
  const todayRev = todayOrders
    .filter(o => o.paymentStatus === 'VERIFIED')
    .reduce((s, o) => s + o.totalAmount, 0)

  return { shop, todayOrders, todayRev }
}

export default async function AdminShopDetailPage({ params }: { params: { shopId: string } }) {
  const result = await getShop(params.shopId)
  if (!result) notFound()

  const { shop, todayOrders, todayRev } = result
  const available = shop.menuItems.filter(m => m.isAvailable).length

  const stats = [
    { label: 'ออเดอร์วันนี้',    value: todayOrders.length,      icon: ShoppingBag,    bg: 'bg-violet-50',  text: 'text-violet-500'  },
    { label: 'ยอดวันนี้',        value: formatPrice(todayRev),   icon: TrendingUp,     bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'ออเดอร์รวม',      value: shop.orders.length,       icon: ShoppingBag,    bg: 'bg-blue-50',    text: 'text-blue-500'    },
    { label: 'เมนูเปิดขาย',     value: `${available}/${shop.menuItems.length}`, icon: UtensilsCrossed, bg: 'bg-orange-50', text: 'text-orange-500' },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/shops"
            className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-gray-900">{shop.name}</h1>
              <span className={`status-badge text-[10px] ${shop.isOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                {shop.isOpen ? 'เปิด' : 'ปิด'}
              </span>
            </div>
            <p className="text-sm text-gray-400">{shop.user.name} · {shop.user.email}</p>
          </div>
        </div>
        <Link href={`/store/${shop.slug}`} target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-medium transition-colors">
          <ExternalLink className="w-4 h-4" />
          ดูหน้าร้าน
        </Link>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders — ใช้ client component เหมือน seller */}
        <div className="lg:col-span-2">
          <AdminOrdersClient orders={shop.orders} />
        </div>

        {/* Menu items */}
        <div className="card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-gray-900">เมนูทั้งหมด</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{shop.menuItems.length} รายการ</span>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {shop.menuItems.map(menu => {
              const remaining = menu.dailyLimit - menu.soldCount
              const low = remaining <= 3
              return (
                <div key={menu.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  !menu.isAvailable ? 'bg-gray-50 border-gray-100 opacity-50' :
                  low ? 'bg-red-50 border-red-100' :
                  'bg-gray-50 border-gray-100 hover:bg-orange-50 hover:border-orange-100'
                }`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{menu.name}</p>
                    {menu.category && <p className="text-[10px] text-gray-400">{menu.category}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-orange-500">{formatPrice(menu.price)}</p>
                    <p className={`text-[10px] font-semibold ${
                      remaining === 0 ? 'text-red-500' : low ? 'text-orange-500' : 'text-gray-400'
                    }`}>
                      {remaining === 0 ? 'หมด' : `เหลือ ${remaining}`}
                    </p>
                  </div>
                </div>
              )
            })}
            {shop.menuItems.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <UtensilsCrossed className="w-8 h-8 mx-auto mb-1 opacity-20" />
                <p className="text-xs">ยังไม่มีเมนู</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
