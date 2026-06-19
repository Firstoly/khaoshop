'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { getPusherClient, PUSHER_EVENTS, getShopChannel } from '@/lib/pusher'

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
  // Track recent order IDs to prevent double-chime (Pusher + SW push can both fire)
  const recentOrders = useRef<Map<string, number>>(new Map())

  // AudioContext must be created during a user gesture
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
    // Deduplicate: Pusher and SW push can both fire for the same order
    const now = Date.now()
    if (recentOrders.current.has(orderId) && now - recentOrders.current.get(orderId)! < 5000) return
    recentOrders.current.set(orderId, now)
    recentOrders.current.forEach((ts, id) => {
      if (now - ts > 5000) recentOrders.current.delete(id)
    })

    // Play chime sound
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext()
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => playChime(ctx)).catch(() => {})
      } else {
        playChime(ctx)
      }
    } catch {}

    // Show toast
    const id = ++nextId
    setToasts(prev => [...prev, { id, customerName, queueNumber, items }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
  }, [])

  // Pusher: fires when user is on dashboard (any tab)
  useEffect(() => {
    if (!shopId) return
    const pusher = getPusherClient()
    const channel = pusher.subscribe(getShopChannel(shopId))

    const handleNewOrder = (data: any) => {
      handleOrder(
        data.orderId ?? '',
        data.customerName ?? 'ลูกค้า',
        data.queueNumber ?? 0,
        data.items ?? [],
      )
    }

    channel.bind(PUSHER_EVENTS.NEW_ORDER, handleNewOrder)
    return () => { channel.unbind(PUSHER_EVENTS.NEW_ORDER, handleNewOrder) }
  }, [shopId, handleOrder])

  // SW push message: fires when browser is backgrounded and push arrives
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
