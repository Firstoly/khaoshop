'use client'

import { useState, useEffect } from 'react'
import { formatPrice, formatDate, getOrderStatusLabel, ORDER_STATUS_FLOW } from '@/lib/utils'
import { Search, ClipboardList, Phone, MapPin, ChevronRight, CheckCircle, Loader2, X, QrCode, Banknote, BadgeCheck, Wallet, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { getPusherClient, PUSHER_EVENTS, getShopChannel } from '@/lib/pusher'

function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur + 0.05)
    }
    playTone(880, 0, 0.15)
    playTone(1100, 0.18, 0.15)
    playTone(1320, 0.36, 0.25)
  } catch {}
}

const STATUS_TABS = [
  { key: 'ALL',       label: 'ทั้งหมด' },
  { key: 'PENDING',   label: 'รอรับ' },
  { key: 'CONFIRMED', label: 'รับแล้ว' },
  { key: 'READY',     label: 'เสร็จแล้ว' },
  { key: 'DELIVERED', label: 'ส่งแล้ว' },
  { key: 'CANCELLED', label: 'ยกเลิก' },
]

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED']

export function OrdersClient({ orders: initial, shopId }: { orders: any[]; shopId: string }) {
  const [orders, setOrders] = useState(initial)
  const [tab, setTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe(getShopChannel(shopId))

    channel.bind(PUSHER_EVENTS.NEW_ORDER, async (data: any) => {
      playOrderSound()
      toast.success(`🔔 ออเดอร์ใหม่! #${String(data.queueNumber).padStart(3, '0')} — ${data.customerName}`, {
        duration: 6000,
        style: { fontWeight: '600' },
      })
      try {
        const res = await fetch(`/api/orders/${data.orderId}`)
        if (res.ok) {
          const newOrder = await res.json()
          setOrders(prev => [newOrder, ...prev])
        }
      } catch {}
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(getShopChannel(shopId))
    }
  }, [shopId])

  const filtered = orders.filter(o => {
    const matchTab = tab === 'ALL' ? ACTIVE_STATUSES.includes(o.status) : o.status === tab
    const matchSearch =
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

  // ยืนยันรับเงินสด
  async function confirmCashPayment(order: any) {
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

  // ปฏิเสธสลิปปลอม
  async function rejectSlip(order: any) {
    if (!confirm(`ปฏิเสธสลิปของ "${order.customerName}" ใช่ไหม?\nระบบจะลบสลิปและรอให้ลูกค้าส่งใหม่`)) return
    setUpdating(order.id)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectSlip: true }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o))
      if (selected?.id === order.id) setSelected(updated)
      toast.error('ปฏิเสธสลิปแล้ว ❌ รอลูกค้าส่งสลิปใหม่')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    finally { setUpdating(null) }
  }

  // ยืนยัน QR สลิป
  async function verifyQrPayment(order: any) {
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

  function getNextStatus(status: string) {
    const idx = ORDER_STATUS_FLOW.indexOf(status)
    return idx >= 0 && idx < ORDER_STATUS_FLOW.length - 1 ? ORDER_STATUS_FLOW[idx + 1] : null
  }

  const countByStatus = (s: string) =>
    s === 'ALL'
      ? orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length
      : orders.filter(o => o.status === s).length

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">จัดการออเดอร์</h1>
        <p className="text-sm text-gray-400 mt-0.5">{orders.length} ออเดอร์ทั้งหมด</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="input-base pl-10" placeholder="ค้นหาชื่อ, เบอร์, เลขคิว..." />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map(t => {
          const cnt = countByStatus(t.key)
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all',
                tab === t.key ? 'bg-brand-500 text-white shadow-brand' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300')}>
              {t.label}
              {cnt > 0 && (
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  tab === t.key ? 'bg-white/20' : 'bg-gray-100')}>
                  {cnt}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Order list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="font-medium">ไม่พบออเดอร์</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const st = getOrderStatusLabel(order.status)
            const nextStatus = getNextStatus(order.status)
            const isUpdating = updating === order.id
            const isCashUnpaid = order.paymentMethod === 'CASH' && order.paymentStatus === 'PENDING'
            const isQrWaiting = order.paymentMethod === 'PROMPTPAY' && order.paymentStatus === 'PAID'

            return (
              <div key={order.id}
                className="card-base p-4 cursor-pointer hover:shadow-card-hover transition-all"
                onClick={() => setSelected(order)}>
                <div className="flex items-start gap-3">
                  {/* Queue */}
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shrink-0 shadow-brand">
                    <span className="text-white text-xs font-bold">#{String(order.queueNumber).padStart(3, '0')}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-display font-bold text-gray-900">{order.customerName}</span>
                      <span className={`status-badge ${st.bg} ${st.color} text-[10px]`}>{st.label}</span>

                      {/* Payment badge */}
                      {order.paymentMethod === 'CASH' && (
                        <span className={cn('status-badge text-[10px]',
                          order.paymentStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200')}>
                          <Banknote className="w-2.5 h-2.5" />
                          {order.paymentStatus === 'VERIFIED' ? 'รับเงินแล้ว' : 'รอรับเงิน'}
                        </span>
                      )}
                      {order.paymentMethod === 'PROMPTPAY' && (
                        <span className={cn('status-badge text-[10px]',
                          order.paymentStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : order.paymentStatus === 'PAID'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                              : order.paymentStatus === 'REJECTED'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200')}>
                          <QrCode className="w-2.5 h-2.5" />
                          {order.paymentStatus === 'VERIFIED' ? 'โอนแล้ว'
                            : order.paymentStatus === 'PAID' ? 'รอยืนยัน'
                            : order.paymentStatus === 'REJECTED' ? 'สลิปปลอม!'
                            : 'รอโอน'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-0.5">{order.customerPhone}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {order.items.map((i: any) => `${i.menuItem.name} ×${i.quantity}`).join(' · ')}
                    </p>

                    {/* Alert badges */}
                    {isCashUnpaid && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                        รอรับเงินสด
                      </div>
                    )}
                    {isQrWaiting && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-600 font-semibold">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        มีสลิปรอยืนยัน!
                      </div>
                    )}
                  </div>

                  {/* Right */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-brand-500 text-sm">{formatPrice(order.totalAmount)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {nextStatus && order.status !== 'CANCELLED' && (
                      <button
                        onClick={e => { e.stopPropagation(); updateStatus(order, nextStatus) }}
                        disabled={isUpdating}
                        className="mt-2 flex items-center gap-1 text-[10px] bg-brand-500 text-white px-2.5 py-1 rounded-lg hover:bg-brand-600 font-semibold">
                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                        {getOrderStatusLabel(nextStatus).label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-bounce-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="font-display text-lg font-bold">
                  ออเดอร์ #{String(selected.queueNumber).padStart(3, '00')}
                </h2>
                <p className="text-xs text-gray-400">{formatDate(selected.createdAt)}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Customer */}
              <div className="bg-orange-50 rounded-2xl p-4 space-y-2">
                <p className="font-display font-bold text-gray-900">{selected.customerName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-brand-400" />{selected.customerPhone}
                </div>
                {selected.customerAddress && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />{selected.customerAddress}
                  </div>
                )}
                {selected.note && (
                  <p className="text-sm text-gray-500 italic border-t border-orange-100 pt-2">📝 {selected.note}</p>
                )}
              </div>

              {/* Items — แสดงก่อน เพื่อให้เห็นทันทีว่าต้องทำอะไร */}
              <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-base">
                  🍽️ รายการอาหาร
                </h3>
                <div className="space-y-2">
                  {selected.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                      <div className="w-11 h-11 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-white font-black text-xl">{item.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-base leading-tight">{item.menuItem.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.price)} / ชิ้น</p>
                      </div>
                      <p className="font-bold text-brand-500 shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 mt-1 border-t border-brand-200 font-bold">
                    <span className="text-gray-700">รวม</span>
                    <span className="text-brand-500 text-xl">{formatPrice(selected.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* ===== CASH PAYMENT ===== */}
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
                      {selected.paymentStatus === 'VERIFIED' ? '✅ รับเงินแล้ว' : '⏳ ยังไม่ได้รับเงิน'}
                    </span>
                  </div>

                  <div className="text-center py-2">
                    <p className="text-xs text-gray-500 mb-1">ยอดที่ต้องรับ</p>
                    <p className="font-display text-3xl font-black text-amber-600">{formatPrice(selected.totalAmount)}</p>
                  </div>

                  {/* ปุ่มรับเงินสด — กดเองเมื่อรับเงินจริง */}
                  {selected.paymentStatus !== 'VERIFIED' && (
                    <button
                      onClick={() => confirmCashPayment(selected)}
                      disabled={updating === selected.id}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                      {updating === selected.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Wallet className="w-4 h-4" />}
                      รับเงินสดแล้ว {formatPrice(selected.totalAmount)}
                    </button>
                  )}
                  {selected.paymentStatus === 'VERIFIED' && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl py-2.5 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      รับเงินสดเรียบร้อยแล้ว
                    </div>
                  )}
                </div>
              )}

              {/* ===== QR PAYMENT ===== */}
              {selected.paymentMethod === 'PROMPTPAY' && (
                <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-emerald-800">PromptPay / QR</span>
                    </div>
                    <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full',
                      selected.paymentStatus === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : selected.paymentStatus === 'PAID'
                          ? 'bg-blue-100 text-blue-700'
                          : selected.paymentStatus === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600')}>
                      {selected.paymentStatus === 'VERIFIED'
                        ? '✅ ยืนยันแล้ว'
                        : selected.paymentStatus === 'PAID'
                          ? '📎 มีสลิป รอยืนยัน'
                          : selected.paymentStatus === 'REJECTED'
                            ? '❌ ปฏิเสธสลิปแล้ว'
                            : '⏳ รอโอนเงิน'}
                    </span>
                  </div>

                  {/* Slip */}
                  {selected.paymentSlipUrl ? (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-600">สลิปที่ลูกค้าส่งมา:</p>
                      <img
                        src={selected.paymentSlipUrl}
                        alt="slip"
                        className="w-full rounded-xl border-2 border-emerald-200 max-h-56 object-contain bg-white"
                      />
                      {/* ปุ่มยืนยัน QR */}
                      {selected.paymentStatus === 'PAID' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => verifyQrPayment(selected)}
                            disabled={updating === selected.id}
                            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                            {updating === selected.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <BadgeCheck className="w-4 h-4" />}
                            ยืนยันโอนแล้ว
                          </button>
                          <button
                            onClick={() => rejectSlip(selected)}
                            disabled={updating === selected.id}
                            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                            {updating === selected.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <XCircle className="w-4 h-4" />}
                            สลิปปลอม
                          </button>
                        </div>
                      )}
                      {selected.paymentStatus === 'REJECTED' && (
                        <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 rounded-xl py-2.5 text-sm font-semibold">
                          <XCircle className="w-4 h-4" />
                          ปฏิเสธสลิปแล้ว — รอลูกค้าส่งใหม่
                        </div>
                      )}
                      {selected.paymentStatus === 'VERIFIED' && (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 bg-white rounded-xl py-2.5 text-sm font-semibold">
                          <CheckCircle className="w-4 h-4" />
                          ยืนยันการโอนเงินแล้ว
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-gray-400 text-sm">
                      ยังไม่มีสลิป
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">อัปเดตสถานะออเดอร์</h3>
                <div className="grid grid-cols-2 gap-2">
                  {ORDER_STATUS_FLOW.map(status => {
                    const st = getOrderStatusLabel(status)
                    const isActive = selected.status === status
                    return (
                      <button key={status}
                        onClick={() => updateStatus(selected, status)}
                        disabled={updating === selected.id}
                        className={cn('py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-left',
                          isActive
                            ? `${st.bg} ${st.color} ${st.bg.replace('bg-', 'border-')}`
                            : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-300')}>
                        {isActive && <CheckCircle className="w-3 h-3 inline mr-1" />}
                        {st.label}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => updateStatus(selected, 'CANCELLED')}
                    disabled={updating === selected.id}
                    className={cn('py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all col-span-2',
                      selected.status === 'CANCELLED'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-red-50 hover:text-red-500 hover:border-red-200')}>
                    ยกเลิกออเดอร์
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}