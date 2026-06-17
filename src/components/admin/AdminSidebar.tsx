'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Store, Menu, X, ShieldCheck, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/admin',       icon: LayoutDashboard, label: 'แดชบอร์ด' },
  { href: '/admin/users', icon: Users,           label: 'จัดการผู้ใช้' },
  { href: '/admin/shops', icon: Store,           label: 'จัดการร้านค้า' },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      {/* Logo — same structure as seller sidebar */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-admin">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-gray-900 text-base leading-tight">KhaoShop</h1>
            <p className="text-[11px] text-violet-500 font-semibold">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'sidebar-item',
                active ? 'admin-sidebar-active' : 'admin-sidebar-inactive'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 bg-white/60 rounded-full" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-medium text-sm transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile toggle */}
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
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </div>

      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
