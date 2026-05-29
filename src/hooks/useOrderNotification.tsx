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

// Generate notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    const playTone = (freq: number, startTime: number, duration: number, vol = 0.3) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(vol, startTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const now = ctx.currentTime
    // ding-dong sound: 3 tones
    playTone(880, now, 0.3, 0.4)
    playTone(1100, now + 0.2, 0.3, 0.4)
    playTone(880, now + 0.4, 0.5, 0.35)
    playTone(1320, now + 0.6, 0.6, 0.3)
  } catch (err) {
    console.warn('Audio not supported:', err)
  }
}

export function useOrderNotification({ shopId, onNewOrder, enabled = true }: UseOrderNotificationOptions) {
  const channelRef = useRef<any>(null)
  const audioUnlockedRef = useRef(false)

  // Unlock audio context on first user interaction
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
      // Play sound
      playNotificationSound()

      // Show toast notification
      toast.custom(
        (t) => (
          <div
            className={`${t.visible ? 'animate-bounce-in' : 'opacity-0'} 
              bg-white border-2 border-brand-400 rounded-2xl shadow-xl p-4 max-w-sm w-full`}
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
                  <span className="text-brand-500 font-bold text-sm">
                    ฿{data.totalAmount.toLocaleString()}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    data.paymentMethod === 'PROMPTPAY'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {data.paymentMethod === 'PROMPTPAY' ? '💳 QR' : '💵 เงินสด'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ),
        {
          duration: 8000,
          position: 'top-right',
        }
      )

      // Callback
      if (onNewOrder) onNewOrder(data)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(getShopChannel(shopId))
    }
  }, [shopId, enabled, onNewOrder])
}
