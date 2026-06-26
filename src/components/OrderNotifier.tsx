// ===================================================
// OrderNotifier — แสดง toast และเล่นเสียงเมื่อมีออเดอร์ใหม่
// รับ event จากทั้ง Pusher (เมื่ออยู่หน้าเว็บ) และ Service Worker (เมื่อ browser อยู่ background)
// มีระบบ deduplicate ป้องกัน event เดียวกันถูกแสดงซ้ำ
// ===================================================

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { getPusherClient, PUSHER_EVENTS, getShopChannel } from '@/lib/pusher'

// สร้างเสียง chime 3 โน้ต ด้วย Web Audio API (ไม่ต้องโหลดไฟล์เสียง)
function playChime(ctx: AudioContext) {
  const notes = [880, 1108, 1320]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = ctx.currentTime + i * 0.18
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
    osc.start(t)
    osc.stop(t + 0.8)
  })
}

type Toast = {
  id: number
  customerName: string
  queueNumber: number
  items: { name: string; quantity: number }[]
}

let nextId = 0

export function OrderNotifier({ shopId }: { shopId: string }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const ctxRef = useRef<AudioContext | null>(null)
  // เก็บ orderId ล่าสุดเพื่อป้องกัน Pusher และ SW push ส่ง event ซ้ำ
  const recentOrders = useRef<Map<string, number>>(new Map())

  // AudioContext ต้องสร้างหลัง user interaction เท่านั้น (browser policy)
  useEffect(() => {
    const init = () => {
      if (!ctxRef.current) {
        try { ctxRef.current = new AudioContext() } catch {}
      }
    }
    document.addEventListener('click', init, { passive: true })
    document.addEventListener('touchstart', init, { passive: true })
    return () => {
      document.removeEventListener('click', init)
      document.removeEventListener('touchstart', init)
    }
  }, [])

  const handleOrder = useCallback((
    orderId: string,
    customerName: string,
    queueNumber: number,
    items: { name: string; quantity: number }[],
  ) => {
    // Deduplicate: ถ้ารับ orderId เดิมภายใน 5 วินาที ให้ข้ามไป
    const now = Date.now()
    if (recentOrders.current.has(orderId) && now - recentOrders.current.get(orderId)! < 5000) return
    recentOrders.current.set(orderId, now)
    // ลบ entry เก่าที่เกิน 5 วินาทีออกเพื่อไม่ให้ Map ใหญ่เกิน
    recentOrders.current.forEach((ts, id) => {
      if (now - ts > 5000) recentOrders.current.delete(id)
    })

    // เล่นเสียง chime
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext()
      const ctx = ctxRef.current
      // ถ้า context ถูก suspend (browser policy) ให้ resume ก่อน
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => playChime(ctx)).catch(() => {})
      } else {
        playChime(ctx)
      }
    } catch {}

    // แสดง toast 6 วินาที แล้วซ่อนอัตโนมัติ
    const id = ++nextId
    setToasts(prev => [...prev, { id, customerName, queueNumber, items }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
  }, [])

  // รับ event จาก Pusher — ใช้เมื่ออยู่หน้าเว็บ
  useEffect(() => {
    if (!shopId) return
    const pusher = getPusherClient()
    const channel = pusher.subscribe(getShopChannel(shopId))

    const handleNewOrder = (data: any) => {
      handleOrder(data.orderId ?? '', data.customerName ?? 'ลูกค้า', data.queueNumber ?? 0, data.items ?? [])
    }

    channel.bind(PUSHER_EVENTS.NEW_ORDER, handleNewOrder)
    // cleanup: ยกเลิก binding เมื่อ unmount
    return () => { channel.unbind(PUSHER_EVENTS.NEW_ORDER, handleNewOrder) }
  }, [shopId, handleOrder])

  // รับ message จาก Service Worker — ใช้เมื่อ browser อยู่ background
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'NEW_ORDER_PUSH') return
      const d = event.data.payload ?? {}
      handleOrder(
        d.orderId ?? (d.tag as string | undefined)?.replace('order-', '') ?? '',
        d.customerName ?? 'ลูกค้า',
        d.queueNumber ?? 0,
        d.items ?? [],
      )
    }

    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage)
  }, [handleOrder])

  if (toasts.length === 0) return null

  return (
    // Toast stack — แสดงมุมขวาบน, pointer-events-none ให้คลิกผ่านได้
    <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id}
          className="bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-start gap-3 pointer-events-auto max-w-[320px] w-full">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">
              ออเดอร์ใหม่! #{String(toast.queueNumber).padStart(3, '0')} {toast.customerName}
            </p>
            {toast.items.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                {toast.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
