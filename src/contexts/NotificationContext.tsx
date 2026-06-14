'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useOrderNotification } from '@/hooks/useOrderNotification'

export interface OrderNotification {
  id: string
  queueNumber: number
  customerName: string
  totalAmount: number
  paymentMethod: string
  items: { name: string; quantity: number }[]
  createdAt: string
  read: boolean
}

interface NotificationContextValue {
  notifications: OrderNotification[]
  unreadCount: number
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  markAllRead: () => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  soundEnabled: true,
  setSoundEnabled: () => {},
  markAllRead: () => {},
  clearAll: () => {},
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const shopId = (session?.user as any)?.shopId as string | undefined

  const [notifications, setNotifications] = useState<OrderNotification[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)

  const handleNewOrder = useCallback((order: any) => {
    setNotifications(prev =>
      [{ ...order, id: order.orderId, read: false }, ...prev].slice(0, 20)
    )

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🛎️ ออเดอร์ใหม่!', {
        body: `${order.customerName} - ฿${order.totalAmount.toLocaleString()}`,
        icon: '/favicon.ico',
      })
    }
  }, [])

  useOrderNotification({
    shopId: shopId ?? '',
    onNewOrder: handleNewOrder,
    enabled: soundEnabled && !!shopId,
  })

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
      soundEnabled,
      setSoundEnabled,
      markAllRead,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
