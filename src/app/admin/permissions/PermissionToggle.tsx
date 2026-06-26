// ===================================================
// PermissionToggle — Toggle switch เปิด/ปิดสิทธิ์แต่ละหัวข้อ
// ใช้ Optimistic UI: อัปเดต UI ก่อน แล้วค่อย fetch API
// ถ้า fetch ล้มเหลว ให้ revert กลับค่าเดิม
// ===================================================

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
    // Optimistic update: เปลี่ยน UI ทันทีโดยไม่รอ server
    setEnabled(next)
    try {
      const res = await fetch('/api/admin/set-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, key: permKey, value: next }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${label}: ${next ? 'เปิด' : 'ปิด'}แล้ว`)
      // refresh เพื่อให้ server component โหลดข้อมูลใหม่
      router.refresh()
    } catch {
      // ถ้าเกิด error ให้ revert UI กลับ
      setEnabled(!next)
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Toggle switch — เลื่อนขวา = เปิด (violet), เลื่อนซ้าย = ปิด (gray)
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
