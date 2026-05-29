'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getPusherClient, PUSHER_EVENTS, getShopChannel } from '@/lib/pusher'
import toast from 'react-hot-toast'

interface NewOrderPayload {
  orderId: string
  queueNumber: number
  customerName: string
  totalAmount: number
  paymentMethod: string
  itemCount: number
  items: { name: string; quantity: number }[]
  createdAt: string
}

interface UseOrderNotificationOptions {
  shopId: string
  onNewOrder?: (order: NewOrderPayload) => void
  enabled?: boolean
}

let audio: HTMLAudioElement | null = null
let soundInterval: ReturnType<typeof setInterval> | null = null
let isPlaying = false

export function startAlertSound() {
  if (isPlaying) return
  isPlaying = true

  const playOnce = () => {
    audio = new Audio('/sounds/order-sound.mp3')
    audio.volume = 0.8
    audio.play().catch(err => console.warn('Audio play failed:', err))
  }

  playOnce()
  soundInterval = setInterval(playOnce, 3000)
}

export function stopAlertSound() {
  if (soundInterval) { clearInterval(soundInterval); soundInterval = null }
  if (audio) { audio.pause(); audio.currentTime = 0; audio = null }
  isPlaying = false
}

export function useOrderNotification({ shopId, onNewOrder, enabled = true }: UseOrderNotificationOptions) {
  const channelRef = useRef<any>(null)
  const audioUnlockedRef = useRef(false)

  const unlockAudio = useCallback(() => {
    if (!audioUnlockedRef.current) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        ctx.resume()
        audioUnlockedRef.current = true
      } catch {}
    }
  }, [])

  useEffect(() => {
    document.addEventListener('click', unlockAudio, { once: true })
    document.addEventListener('touchstart', unlockAudio, { once: true })
    return () => {
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }
  }, [unlockAudio])

  useEffect(() => {
    if (!enabled || !shopId) return
    const pusher = getPusherClient()
    const channel = pusher.subscribe(getShopChannel(shopId))
    channelRef.current = channel

    channel.bind(PUSHER_EVENTS.NEW_ORDER, (data: NewOrderPayload) => {
      startAlertSound()

      toast.custom(
        (t) => (
          <div
            className={`${t.visible ? 'animate-bounce-in' : 'opacity-0'} bg-white border-2 border-brand-400 rounded-2xl shadow-xl p-4 max-w-sm w-full`}
            style={{ fontFamily: 'var(--font-sarabun)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-white text-lg">🛎️</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-gray-900 text-sm">ออเดอร์ใหม่!</p>
                  <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    #{String(data.queueNumber).padStart(3, '0')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 font-medium">{data.customerName}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {data.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-brand-500 font-bold text-sm">฿{data.totalAmount.toLocaleString()}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    data.paymentMethod === 'PROMPTPAY' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {data.paymentMethod === 'PROMPTPAY' ? '💳 QR' : '💵 เงินสด'}
                  </span>
                </div>
                <button
                  onClick={() => { stopAlertSound(); toast.dismiss(t.id) }}
                  className="mt-2 w-full py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  ✓ รับทราบ — หยุดเสียง
                </button>
              </div>
            </div>
          </div>
        ),
        { duration: Infinity, position: 'top-right' }
      )

      if (onNewOrder) onNewOrder(data)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(getShopChannel(shopId))
      stopAlertSound()
    }
  }, [shopId, enabled, onNewOrder])
}