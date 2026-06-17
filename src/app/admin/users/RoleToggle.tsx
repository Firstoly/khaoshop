'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ShieldCheck, User } from 'lucide-react'

export function RoleToggle({ userId, currentRole, userName }: {
  userId: string
  currentRole: string
  userName: string
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggleRole() {
    const newRole = currentRole === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN'
    const confirm = window.confirm(
      newRole === 'SUPER_ADMIN'
        ? `ให้สิทธิ์ Super Admin แก่ "${userName}" ใช่ไหม?`
        : `ถอนสิทธิ์ Super Admin ของ "${userName}" ใช่ไหม?`
    )
    if (!confirm) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })
      if (!res.ok) throw new Error()
      toast.success(newRole === 'SUPER_ADMIN' ? 'ให้สิทธิ์ Super Admin แล้ว' : 'ถอนสิทธิ์แล้ว')
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleRole}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
        currentRole === 'SUPER_ADMIN'
          ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
          : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-600'
      } disabled:opacity-50`}
    >
      {currentRole === 'SUPER_ADMIN'
        ? <><ShieldCheck className="w-3.5 h-3.5" /> Super Admin</>
        : <><User className="w-3.5 h-3.5" /> User</>
      }
    </button>
  )
}
