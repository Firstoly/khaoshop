'use client'

import { useState, useCallback } from 'react'
import { formatPrice, formatDate, getOrderStatusLabel } from '@/lib/utils'
import { ShoppingBag, TrendingUp, Clock, UtensilsCrossed, AlertTriangle, RefreshCw, ChefHat } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOrderNotification } from '@/hooks/useOrderNotification'

export function DashboardClient({ data, shopId }: { data: any; shopId: string }) {
  const router = useRouter()
  const [newOrderCount, setNewOrderCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Realtime: refresh dashboard when new order arrives
  const handleNewOrder = useCallback(() => {
    setNewOrderCount(prev => prev + 1)
    router.refresh()
  }, [router])

  useOrderNotification({ shopId, onNewOrder: handleNewOrder })

  async function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  const stats = [
    { label: 'ออเดอร์วันนี้', value: data.todayOrderCount + newOrderCount, unit: 'ออเดอร์', icon: ShoppingBag, bg: 'bg-orange-50', text: 'text-brand-600' },
    { label: 'ยอดขายวันนี้', value: formatPrice(data.todayRevenue), unit: '', icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'รอรับออเดอร์', value: data.pendingCount, unit: 'รายการ', icon: Clock, bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'เมนูทั้งหมด', value: data.totalMenuItems, unit: 'เมนู', icon: UtensilsCrossed, bg: 'bg-violet-50', text: 'text-violet-600' },
  ]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">แดชบอร์ด</h1>
          <p className="text-sm text-gray-400 mt-0.5">ภาพรวมร้านวันนี้</p>
        </div>
        <button onClick={handleRefresh}
          className={`flex items-center gap-2 text-sm text-gray-500 hover:text-brand-500 bg-white border border-gray-200 px-4 py-2 rounded-xl transition-colors`}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          รีเฟรช
        </button>
      </div>

      {/* New order banner */}
      {newOrderCount > 0 && (
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl p-4 flex items-center justify-between animate-bounce-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛎️</span>
            <div>
              <p className="font-bold">มีออเดอร์ใหม่ {newOrderCount} รายการ!</p>
              <p className="text-white/70 text-sm">คลิกดูออเดอร์</p>
            </div>
          </div>
          <Link href="/dashboard/orders"
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            ดูเลย →
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card-base p-5 animate-fade-in">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.text}`} />
            </div>
            <p className="text-2xl font-display font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label} {s.unit}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-gray-900">ออเดอร์ล่าสุด</h2>
            <Link href="/dashboard/orders" className="text-xs text-brand-500 hover:text-brand-600 font-medium">ดูทั้งหมด →</Link>
          </div>
          <div className="space-y-3">
            {data.recentOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">ยังไม่มีออเดอร์</p>
              </div>
            ) : data.recentOrders.map((order: any) => {
              const st = getOrderStatusLabel(order.status)
              return (
                <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand-500">#{String(order.queueNumber).padStart(3,'0')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{order.customerName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {order.items.map((i: any) => `${i.menuItem.name} ×${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`status-badge ${st.bg} ${st.color} text-[10px] mb-1 block`}>{st.label}</span>
                    <p className="text-xs text-gray-500">{formatPrice(order.totalAmount)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {data.lowStock.length > 0 && (
            <div className="card-base p-5 border-l-4 border-amber-400">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="font-display font-bold text-gray-900 text-sm">ใกล้หมด</h2>
              </div>
              <div className="space-y-2">
                {data.lowStock.map((item: any) => {
                  const remaining = item.dailyLimit - item.soldCount
                  return (
                    <div key={item.id} className="flex items-center justify-between">
                      <p className="text-sm text-gray-700 truncate flex-1">{item.name}</p>
                      <span className={`text-xs font-bold ml-2 ${remaining === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                        {remaining === 0 ? 'หมด!' : `เหลือ ${remaining}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="card-base p-5">
            <h2 className="font-display font-bold text-gray-900 mb-4">เมนูขายดีวันนี้</h2>
            {data.topSelling.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <ChefHat className="w-8 h-8 mx-auto mb-1 opacity-30" />
                <p className="text-xs">ยังไม่มีข้อมูล</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topSelling.map((ts: any, i: number) => (
                  <div key={ts.item.id} className="flex items-center gap-3">
                    <span className="text-lg font-display font-bold text-gray-200 w-6">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ts.item.name}</p>
                      <div className="mt-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-brand-400 to-brand-500 h-full rounded-full"
                          style={{ width: `${Math.min((ts.count / (data.topSelling[0]?.count||1))*100,100)}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-brand-500 shrink-0">{ts.count} ถุง</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
