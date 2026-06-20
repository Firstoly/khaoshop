'use client'

import { useState } from 'react'
import { ClipboardList, UtensilsCrossed } from 'lucide-react'
import { AdminOrdersClient } from './AdminOrdersClient'
import { MenuClient } from '@/app/dashboard/menu/MenuClient'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'orders', label: 'ออเดอร์',      icon: ClipboardList   },
  { key: 'menu',   label: 'จัดการเมนู',   icon: UtensilsCrossed },
]

export function AdminShopClient({ orders, menuItems, shopId, shopType }: {
  orders: any[]
  menuItems: any[]
  shopId: string
  shopType?: string | null
}) {
  const [tab, setTab] = useState('orders')

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === t.key
                ? 'bg-violet-500 text-white shadow-admin'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'orders' && <AdminOrdersClient orders={orders} />}
      {tab === 'menu'   && <MenuClient menuItems={menuItems} shopId={shopId} shopType={shopType} showMenuOptions={true} />}
    </div>
  )
}
