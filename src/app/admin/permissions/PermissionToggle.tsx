'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export function PermissionToggle({ userId, permKey, value, label }: {
  userId: string
  permKey: string
  value: boolean
  label: string
}) {
  const [enabled, setEnabled] = useState(value)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    const next = !enabled
    setEnabled(next)
    try {
      const res = await fetch('/api/admin/set-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, key: permKey, value: next }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${label}: ${next ? 'เปิด' : 'ปิด'}แล้ว`)
      router.refresh()
    } catch {
      setEnabled(!next)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={label}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        enabled ? 'bg-violet-500' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}
