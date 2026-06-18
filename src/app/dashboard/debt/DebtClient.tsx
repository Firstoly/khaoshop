'use client'

import { useState, useMemo } from 'react'
import { formatPrice, formatDateWithDay } from '@/lib/utils'
import { Phone, Wallet, CheckCircle, Loader2, X, MapPin, Search, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export function DebtClient({ orders: initial, totalDebt: initialTotal }: { orders: any[]; totalDebt: number }) {
  const [orders, setOrders] = useState(initial)
  const [totalDebt, setTotalDebt] = useState(initialTotal)
  const [search, setSearch] = useState('')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  // จัดกลุ่มตามชื่อ + เบอร์
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; phone: string; orders: any[] }>()
    orders.forEach(o => {
      const key = `${o.customerName}__${o.customerPhone}`
      if (!map.has(key)) map.set(key, { key, name: o.customerName, phone: o.customerPhone, orders: [] })
      map.get(key)!.orders.push(o)
    })
    return Array.from(map.values()).sort((a, b) => {
      const aMax = Math.max(...a.orders.map(o => new Date().getTime() - new Date(o.createdAt).getTime()))
      const bMax = Math.max(...b.orders.map(o => new Date().getTime() - new Date(o.createdAt).getTime()))
      return bMax - aMax
    })
  }, [orders])

  const filtered = groups.filter(g =>
    g.name.includes(search) || g.phone.includes(search)
  )

  async function confirmPayment(order: any) {
    setUpdating(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'VERIFIED' }),
      })
      if (!res.ok) throw new Error()
      setOrders(prev => prev.filter(o => o.id !== order.id))
      setTotalDebt(prev => prev - order.totalAmount)
      if (selectedOrder?.id === order.id) setSelectedOrder(null)
      toast.success(`รับเงิน ฿${order.totalAmount} จาก ${order.customerName} แล้ว ✅`)
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setUpdating(null)
    }
  }

  async function confirmAllPayments(group: { name: string; orders: any[] }) {
    if (!confirm(`รับเงินทั้งหมดจาก "${group.name}" จำนวน ${group.orders.length} ออเดอร์ ใช่ไหม?`)) return
    setUpdating(`group__${group.name}`)
    try {
      await Promise.all(group.orders.map(o =>
        fetch(`/api/orders/${o.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentStatus: 'VERIFIED' }),
        })
      ))
      const ids = new Set(group.orders.map(o => o.id))
      const totalPaid = group.orders.reduce((s, o) => s + o.totalAmount, 0)
      setOrders(prev => prev.filter(o => !ids.has(o.id)))
      setTotalDebt(prev => prev - totalPaid)
      toast.success(`รับเงินทั้งหมดจาก ${group.name} แล้ว ✅`)
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">รายการลูกหนี้</h1>
        <p className="text-sm text-gray-400 mt-0.5">เงินสดที่ยังไม่ได้รับชำระ</p>
      </div>

      {/* Summary card */}
      <div className="card-base p-5 border-l-4 border-red-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ยอดค้างชำระทั้งหมด</p>
              <p className="font-display text-2xl font-black text-red-500">{formatPrice(totalDebt)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">จำนวนลูกค้า</p>
            <p className="font-display text-2xl font-black text-gray-700">{groups.length} คน</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-base pl-10"
          placeholder="ค้นหาชื่อ, เบอร์..."
        />
      </div>

      {/* List grouped by customer */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="w-14 h-14 mx-auto mb-3 text-emerald-300" />
          <p className="font-medium text-gray-500">ไม่มีลูกหนี้ค้างชำระ</p>
          <p className="text-sm mt-1">ลูกค้าทุกคนชำระเงินแล้ว 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(group => {
            const groupTotal = group.orders.reduce((s, o) => s + o.totalAmount, 0)
            const maxDays = Math.max(...group.orders.map(o =>
              Math.floor((new Date().getTime() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            ))
            const isExpanded = expandedKey === group.key
            const isGroupUpdating = updating === `group__${group.name}`

            return (
              <div key={group.key} className={cn('card-base overflow-hidden', maxDays >= 3 && 'border-l-4 border-red-300')}>
                {/* Customer header row */}
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedKey(isExpanded ? null : group.key)}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-red-500 font-black text-base">{group.name.charAt(0).toUpperCase()}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-gray-900">{group.name}</span>
                      {maxDays >= 3 && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                          ค้าง {maxDays} วัน!
                        </span>
                      )}
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {group.orders.length} ออเดอร์
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {group.phone}
                    </div>
                  </div>

                  {/* Right: total + buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-red-500 text-base">{formatPrice(groupTotal)}</p>
                      <button
                        onClick={e => { e.stopPropagation(); confirmAllPayments(group) }}
                        disabled={isGroupUpdating}
                        className="mt-1 flex items-center gap-1 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg font-bold transition-colors"
                      >
                        {isGroupUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
                        รับทั้งหมด
                      </button>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded: order list */}
                {isExpanded && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {group.orders.map(order => {
                      const daysDiff = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                      return (
                        <div
                          key={order.id}
                          className="px-4 py-3 flex items-center gap-3 bg-gray-50 hover:bg-orange-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <div className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-gray-600 text-[10px] font-bold">#{String(order.queueNumber).padStart(3, '0')}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 truncate">
                              {order.items.map((i: any) => `${i.menuItem.name} ×${i.quantity}`).join(' · ')}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{formatDateWithDay(order.createdAt)}{daysDiff >= 3 && ` · ค้าง ${daysDiff} วัน`}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-red-500 text-sm">{formatPrice(order.totalAmount)}</span>
                            <button
                              onClick={e => { e.stopPropagation(); confirmPayment(order) }}
                              disabled={updating === order.id}
                              className="flex items-center gap-1 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1.5 rounded-lg font-bold transition-colors"
                            >
                              {updating === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
                              รับ
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-bounce-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900">
                  ออเดอร์ #{String(selectedOrder.queueNumber).padStart(3, '0')}
                </h2>
                <p className="text-xs text-gray-400">{formatDateWithDay(selectedOrder.createdAt)}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Customer */}
              <div className="bg-red-50 rounded-2xl p-4 space-y-2">
                <p className="font-display font-bold text-gray-900">{selectedOrder.customerName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-red-400" />{selectedOrder.customerPhone}
                </div>
                {selectedOrder.customerAddress && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />{selectedOrder.customerAddress}
                  </div>
                )}
                {selectedOrder.note && (
                  <p className="text-sm text-gray-500 italic border-t border-red-100 pt-2">📝 {selectedOrder.note}</p>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">รายการที่สั่ง</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.menuItem.name}</p>
                        <p className="text-xs text-gray-400">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                      <p className="font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-bold">
                    <span className="text-gray-900">ยอดที่ต้องเก็บ</span>
                    <span className="text-red-500 text-xl">{formatPrice(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={() => confirmPayment(selectedOrder)}
                disabled={updating === selectedOrder.id}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                {updating === selectedOrder.id
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Wallet className="w-5 h-5" />}
                รับเงิน {formatPrice(selectedOrder.totalAmount)} แล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
