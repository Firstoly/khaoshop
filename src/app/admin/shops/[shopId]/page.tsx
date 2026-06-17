import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, ShoppingBag, TrendingUp, UtensilsCrossed } from 'lucide-react'
import { AdminShopClient } from './AdminShopClient'

async function getShop(shopId: string) {
  const today = new Date()
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      user: { select: { name: true, email: true } },
      menuItems: {
        select: {
          id: true, name: true, description: true, price: true,
          imageUrl: true, dailyLimit: true, soldCount: true,
          isAvailable: true, category: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { menuItem: { select: { name: true } } } } },
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
    { label: 'ออเดอร์วันนี้',   value: todayOrders.length,              icon: ShoppingBag,    bg: 'bg-violet-50',  text: 'text-violet-500'  },
    { label: 'ยอดวันนี้',       value: formatPrice(todayRev),           icon: TrendingUp,     bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'ออเดอร์รวม',     value: shop.orders.length,               icon: ShoppingBag,    bg: 'bg-blue-50',    text: 'text-blue-500'    },
    { label: 'เมนูเปิดขาย',    value: `${available}/${shop.menuItems.length}`, icon: UtensilsCrossed, bg: 'bg-orange-50', text: 'text-orange-500' },
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

      {/* Tabbed orders + menu management */}
      <AdminShopClient
        orders={shop.orders}
        menuItems={shop.menuItems}
        shopId={shop.id}
      />
    </div>
  )
}
