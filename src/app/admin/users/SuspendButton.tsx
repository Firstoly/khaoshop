// ===================================================
// SuspendButton — ปุ่มระงับ/ปลดระงับบัญชี user
// สีแดง = ปกติ (กดเพื่อระงับ)
// สีเหลือง = ถูกระงับอยู่ (กดเพื่อปลดระงับ)
// ===================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldOff, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export function SuspendButton({ userId, isSuspended, userName }: { userId: string; isSuspended: boolean; userName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    const action = isSuspended ? 'ปลดระงับ' : 'ระงับ'
    // ยืนยันก่อนดำเนินการ
    if (!confirm(`${action}บัญชีของ "${userName}" ใช่ไหม?`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/suspend-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ส่งค่าตรงข้ามกับ isSuspended ปัจจุบัน (toggle)
        body: JSON.stringify({ userId, suspended: !isSuspended }),
      })
      if (!res.ok) throw new Error()
      toast.success(isSuspended ? 'ปลดระงับบัญชีแล้ว' : 'ระงับบัญชีแล้ว')
      // refresh เพื่อให้ server component โหลดข้อมูลใหม่
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isSuspended ? 'ปลดระงับบัญชี' : 'ระงับบัญชี'}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 ${
        isSuspended
          ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'   // ถูกระงับ → สีเหลือง
          : 'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600'  // ปกติ → สีแดง
      }`}
    >
      {isSuspended ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
    </button>
  )
}
