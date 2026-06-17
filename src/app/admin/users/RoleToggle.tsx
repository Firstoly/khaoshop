'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShieldCheck, User, Loader2 } from 'lucide-react'

export function RoleToggle({ userId, currentRole, userName }: {
  userId: string
  currentRole: string
  userName: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggleRole() {
    const newRole = currentRole === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN'
    const ok = window.confirm(
      newRole === 'SUPER_ADMIN'
        ? `ให้สิทธิ์ Super Admin แก่ "${userName}" ใช่ไหม?`
        : `ถอนสิทธิ์ Super Admin ของ "${userName}" ใช่ไหม?`
    )
    if (!ok) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (!res.ok) throw new Error()
      toast.success(newRole === 'SUPER_ADMIN' ? '✅ ให้สิทธิ์ Super Admin แล้ว' : 'ถอนสิทธิ์แล้ว')
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        กำลังอัพเดต
      </div>
    )
  }

  return (
    <button
      onClick={toggleRole}
      className={`status-badge text-xs transition-all hover:scale-105 active:scale-95 ${
        currentRole === 'SUPER_ADMIN'
          ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200'
      }`}
    >
      {currentRole === 'SUPER_ADMIN'
        ? <><ShieldCheck className="w-3 h-3" /> Super Admin</>
        : <><User className="w-3 h-3" /> User</>
      }
    </button>
  )
}
