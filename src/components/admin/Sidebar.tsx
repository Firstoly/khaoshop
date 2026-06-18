'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LayoutDashboard, UtensilsCrossed, ClipboardList, Settings, ChefHat, ExternalLink, Menu, X, BarChart2, AlertCircle, ShieldCheck, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

type Permissions = {
  canMenu: boolean
  canOrders: boolean
  canDebt: boolean
  canAnalytics: boolean
  canSettings: boolean
  showKitchen?: boolean
}

const ALL_NAV = [
  { href: '/dashboard',           icon: LayoutDashboard, label: 'แดชบอร์ด',        permKey: null          },
  { href: '/dashboard/menu',      icon: UtensilsCrossed, label: 'จัดการเมนู',       permKey: 'canMenu'     },
  { href: '/dashboard/orders',    icon: ClipboardList,   label: 'จัดการออเดอร์',    permKey: 'canOrders'   },
  { href: '/dashboard/kitchen',   icon: ListChecks,      label: 'เตรียมอาหาร',       permKey: 'canOrders'   },
  { href: '/dashboard/debt',      icon: AlertCircle,     label: 'ลูกหนี้ค้างชำระ', permKey: 'canDebt'     },
  { href: '/dashboard/analytics', icon: BarChart2,       label: 'รายงานยอดขาย',    permKey: 'canAnalytics'},
  { href: '/dashboard/settings',  icon: Settings,        label: 'ตั้งค่าร้าน',     permKey: 'canSettings' },
]

export function Sidebar({ permissions, showKitchen = true }: { permissions: Permissions; showKitchen?: boolean }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()

  const navItems = ALL_NAV.filter(item => {
    if (item.href === '/dashboard/kitchen' && !showKitchen) return false
    return item.permKey === null || permissions[item.permKey as keyof Permissions]
  })

  function SidebarContent() {
    const shopSlug = (session?.user as any)?.shopSlug as string | undefined
    return (
      <div className="flex flex-col h-full">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-brand">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-gray-900 text-base leading-tight">KhaoShop</h1>
              <p className="text-[11px] text-gray-400">จัดการร้านออนไลน์</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'sidebar-item',
                  active ? 'sidebar-item-active' : 'sidebar-item-inactive',
                  item.href === '/dashboard/debt' && !active && 'text-red-500 hover:bg-red-50 hover:text-red-600'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 bg-white/60 rounded-full" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          {(session?.user as any)?.role === 'SUPER_ADMIN' && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 font-medium text-sm transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Super Admin</span>
            </Link>
          )}
          <Link
            href={shopSlug ? `/store/${shopSlug}` : '#'}
            target="_blank"
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-brand-600 font-medium text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>ดูหน้าร้านของฉัน</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-700"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <div className={cn(
        'md:hidden fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </div>

      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
