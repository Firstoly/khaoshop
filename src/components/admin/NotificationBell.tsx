'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, ShoppingBag, Volume2, VolumeX } from 'lucide-react'
import { useOrderNotification, stopAlertSound } from '@/hooks/useOrderNotification'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  queueNumber: number
  customerName: string
  totalAmount: number
  paymentMethod: string
  items: { name: string; quantity: number }[]
  createdAt: string
  read: boolean
}

export function NotificationBell({ shopId }: { shopId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [pulse, setPulse] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const handleNewOrder = useCallback((order: any) => {
    const notif: Notification = {
      id: order.orderId,
      queueNumber: order.queueNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      items: order.items,
      createdAt: order.createdAt,
      read: false,
    }
    setNotifications(prev => [notif, ...prev].slice(0, 20))
    setPulse(true)
    setTimeout(() => setPulse(false), 1000)

    // Browser notification (if permitted)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🛎️ ออเดอร์ใหม่!', {
        body: `${order.customerName} - ฿${order.totalAmount.toLocaleString()}`,
        icon: '/favicon.ico',
      })
    }
  }, [])

  useOrderNotification({
    shopId,
    onNewOrder: handleNewOrder,
    enabled: soundEnabled,
  })

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function clearAll() {
    setNotifications([])
    setOpen(false)
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) { markAllRead(); stopAlertSound() } }}
        className={cn(
          'relative w-9 h-9 rounded-xl flex items-center justify-center transition-all',
          pulse ? 'bg-brand-500 text-white scale-110' : 'bg-gray-50 hover:bg-orange-50 text-gray-500 hover:text-brand-500'
        )}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 bg-white border border-gray-100 rounded-2xl shadow-2xl w-80 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-gray-900 text-sm">การแจ้งเตือน</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount} ใหม่
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Sound toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-xs',
                    soundEnabled ? 'bg-brand-50 text-brand-500' : 'bg-gray-100 text-gray-400')}
                  title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">ยังไม่มีการแจ้งเตือน</p>
                  <p className="text-[10px] mt-1 text-gray-300">จะแจ้งทันทีเมื่อมีออเดอร์ใหม่</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      'px-4 py-3 border-b border-gray-50 transition-colors',
                      !notif.read ? 'bg-orange-50/60' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm',
                        notif.paymentMethod === 'PROMPTPAY' ? 'bg-emerald-100' : 'bg-amber-100'
                      )}>
                        {notif.paymentMethod === 'PROMPTPAY' ? '💳' : '💵'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-brand-500">
                            #{String(notif.queueNumber).padStart(3, '0')}
                          </span>
                          <span className="font-semibold text-sm text-gray-900 truncate">{notif.customerName}</span>
                          {!notif.read && <span className="w-1.5 h-1.5 bg-brand-500 rounded-full shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {notif.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-brand-500">{formatPrice(notif.totalAmount)}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(notif.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 text-center">
                  {notifications.length} รายการล่าสุด • {soundEnabled ? '🔔 เสียงเปิด' : '🔕 เสียงปิด'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
