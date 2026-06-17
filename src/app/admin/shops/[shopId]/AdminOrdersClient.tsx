'use client'

import { useState } from 'react'
import { formatPrice, getOrderStatusLabel, ORDER_STATUS_FLOW } from '@/lib/utils'
import { ClipboardList, ChevronRight, Loader2, X, Phone, MapPin, Banknote, QrCode, Wallet, CheckCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_TABS = [
  { key: 'ALL',       label: 'ทั้งหมด'  },
  { key: 'PENDING',   label: 'รอรับ'    },
  { key: 'CONFIRMED', label: 'รับแล้ว'  },
  { key: 'READY',     label: 'เสร็จแล้ว'},
  { key: 'DELIVERED', label: 'ส่งแล้ว'  },
  { key: 'CANCELLED', label: 'ยกเลิก'  },
]
const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED']

export function AdminOrdersClient({ orders: initial }: { orders: any[] }) {
  const [orders, setOrders] = useState(initial)
  const [tab, setTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const filtered = orders.filter(o => {
    const matchTab = tab === 'ALL' ? ACTIVE_STATUSES.includes(o.status) : o.status === tab
    const matchSearch = !search ||
      o.customerName.includes(search) ||
      o.customerPhone.includes(search) ||
      String(o.queueNumber).padStart(3, '0').includes(search)
    return matchTab && matchSearch
  })

  async function updateStatus(order: any, newStatus: string) {
    setUpdating(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
      if (selected?.id === order.id) setSelected(updated)
      toast.success('อัปเดตสถานะแล้ว')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    finally { setUpdating(null) }
  }

  async function confirmCash(order: any) {
    setUpdating(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'VERIFIED' }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
      if (selected?.id === order.id) setSelected(updated)
      toast.success('รับเงินสดแล้ว ✅')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    finally { setUpdating(null) }
  }

  async function verifyQr(order: any) {
    setUpdating(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'VERIFIED' }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
      if (selected?.id === order.id) setSelected(updated)
      toast.success('ยืนยันโอนเงินแล้ว ✅')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    finally { setUpdating(null) }
  }

  function getNext(status: string) {
    const idx = ORDER_STATUS_FLOW.indexOf(status)
    return idx >= 0 && idx < ORDER_STATUS_FLOW.length - 1 ? ORDER_STATUS_FLOW[idx + 1] : null
  }

  const countByStatus = (s: string) =>
    s === 'ALL'
      ? orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length
      : orders.filter(o => o.status === s).length

  return (
    <div className="card-base p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-gray-900">ออเดอร์ทั้งหมด</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{orders.length} รายการ</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input-base pl-9 text-sm" placeholder="ค้นหาชื่อ, เบอร์, เลขคิว..." />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_TABS.map(t => {
          const cnt = countByStatus(t.key)
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all',
                tab === t.key
                  ? 'bg-violet-500 text-white shadow-admin'
                  : 'bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-700')}>
              {t.label}
              {cnt > 0 && (
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  tab === t.key ? 'bg-white/20' : 'bg-gray-200')}>
                  {cnt}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Order list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">ไม่พบออเดอร์</p>
          </div>
        ) : filtered.map(order => {
          const st = getOrderStatusLabel(order.status)
          const next = getNext(order.status)
          const isUpdating = updating === order.id
          return (
            <div key={order.id}
              className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-violet-50 hover:border-violet-100 cursor-pointer transition-colors"
              onClick={() => setSelected(order)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center shrink-0 shadow-admin">
                  <span className="text-white text-[10px] font-bold">#{String(order.queueNumber).padStart(3, '0')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="font-semibold text-sm text-gray-900">{order.customerName}</span>
                    <span className={`status-badge text-[10px] ${st.bg} ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {order.items.map((i: any) => `${i.menuItem.name} ×${i.quantity}`).join(' · ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-violet-500 text-sm">{formatPrice(order.totalAmount)}</p>
                  {next && order.status !== 'CANCELLED' && (
                    <button
                      onClick={e => { e.stopPropagation(); updateStatus(order, next) }}
                      disabled={isUpdating}
                      className="mt-1 flex items-center gap-1 text-[10px] bg-violet-500 text-white px-2 py-1 rounded-lg hover:bg-violet-600 font-semibold">
                      {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                      {getOrderStatusLabel(next).label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-bounce-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-display text-lg font-bold">
                  ออเดอร์ #{String(selected.queueNumber).padStart(3, '00')}
                </h2>
                <p className="text-xs text-gray-400">
                  {new Date(selected.createdAt).toLocaleString('th-TH')}
                </p>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Customer */}
              <div className="bg-violet-50 rounded-2xl p-4 space-y-2">
                <p className="font-display font-bold text-gray-900">{selected.customerName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-violet-400" />{selected.customerPhone}
                </div>
                {selected.customerAddress && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />{selected.customerAddress}
                  </div>
                )}
                {selected.note && (
                  <p className="text-sm text-gray-500 italic border-t border-violet-100 pt-2">📝 {selected.note}</p>
                )}
              </div>

              {/* Items */}
              <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                <h3 className="font-bold text-gray-900 mb-3">🍽️ รายการอาหาร</h3>
                <div className="space-y-2">
                  {selected.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                      <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-white font-black text-lg">{item.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900">{item.menuItem.name}</p>
                        <p className="text-xs text-gray-400">{formatPrice(item.price)} / ชิ้น</p>
                      </div>
                      <p className="font-bold text-brand-500">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-orange-200 font-bold">
                    <span className="text-gray-700">รวม</span>
                    <span className="text-brand-500 text-xl">{formatPrice(selected.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              {selected.paymentMethod === 'CASH' && (
                <div className="rounded-2xl p-4 bg-amber-50 border border-amber-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-amber-600" />
                      <span className="font-bold text-amber-800">ชำระเงินสด</span>
                    </div>
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full',
                      selected.paymentStatus === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700')}>
                      {selected.paymentStatus === 'VERIFIED' ? '✅ รับเงินแล้ว' : '⏳ รอรับเงิน'}
                    </span>
                  </div>
                  {selected.paymentStatus !== 'VERIFIED' && (
                    <button onClick={() => confirmCash(selected)} disabled={updating === selected.id}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                      {updating === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                      รับเงินสดแล้ว {formatPrice(selected.totalAmount)}
                    </button>
                  )}
                  {selected.paymentStatus === 'VERIFIED' && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl py-2.5 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" /> รับเงินสดเรียบร้อยแล้ว
                    </div>
                  )}
                </div>
              )}

              {selected.paymentMethod === 'PROMPTPAY' && (
                <div className="rounded-2xl p-4 bg-blue-50 border border-blue-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-blue-600" />
                      <span className="font-bold text-blue-800">ชำระ PromptPay</span>
                    </div>
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full',
                      selected.paymentStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                      selected.paymentStatus === 'PAID'     ? 'bg-blue-100 text-blue-700' :
                                                              'bg-gray-100 text-gray-500')}>
                      {selected.paymentStatus === 'VERIFIED' ? '✅ ยืนยันแล้ว'
                        : selected.paymentStatus === 'PAID' ? '⏳ รอยืนยัน'
                        : 'รอโอน'}
                    </span>
                  </div>
                  {selected.paymentSlipUrl && (
                    <img src={selected.paymentSlipUrl} alt="slip" className="w-full rounded-xl object-contain max-h-48" />
                  )}
                  {selected.paymentStatus === 'PAID' && (
                    <button onClick={() => verifyQr(selected)} disabled={updating === selected.id}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                      {updating === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      ยืนยันการโอน
                    </button>
                  )}
                </div>
              )}

              {/* Status flow */}
              {(() => {
                const next = ORDER_STATUS_FLOW[ORDER_STATUS_FLOW.indexOf(selected.status) + 1]
                return next && selected.status !== 'CANCELLED' ? (
                  <button onClick={() => updateStatus(selected, next)} disabled={updating === selected.id}
                    className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                    {updating === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    เปลี่ยนเป็น: {getOrderStatusLabel(next).label}
                  </button>
                ) : null
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
