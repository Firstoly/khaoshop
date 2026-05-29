'use client'

import { signOut } from 'next-auth/react'
import { LogOut, ChevronDown, User } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'

export function Topbar({ session }: { session: any }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const shopId = session?.user?.shopId

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
      <div className="pl-12 md:pl-0">
        <p className="text-xs text-gray-400">สวัสดี,</p>
        <p className="font-display font-bold text-gray-900 text-sm">{session?.user?.name}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell with Realtime */}
        {shopId && <NotificationBell shopId={shopId} />}

        {/* Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-12 z-20 bg-white border border-gray-100 rounded-2xl shadow-xl w-52 py-2 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-sm text-gray-900">{session?.user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  ออกจากระบบ
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
