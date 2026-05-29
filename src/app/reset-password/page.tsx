'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChefHat, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { toast.error('รหัสผ่านไม่ตรงกัน'); return }
    if (password.length < 8) { toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัว'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      toast.error(err.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="text-center">
      <p className="text-red-500 mb-4">ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว</p>
      <Link href="/forgot-password" className="btn-primary inline-flex">ขอลิงก์ใหม่</Link>
    </div>
  )

  if (done) return (
    <div className="text-center animate-bounce-in">
      <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="font-display font-bold text-gray-900 text-lg mb-2">เปลี่ยนรหัสผ่านสำเร็จ!</h2>
      <p className="text-gray-500 text-sm mb-4">กำลังพาไปหน้า Login...</p>
      <Link href="/login" className="btn-primary inline-flex">Login เลย</Link>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่านใหม่</label>
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)}
            className="input-base pr-12" placeholder="อย่างน้อย 8 ตัว" required minLength={8} />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          className="input-base" placeholder="••••••••" required />
        {confirm && password !== confirm && <p className="text-xs text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>}
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl shadow-brand mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">ตั้งรหัสผ่านใหม่</h1>
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <Suspense fallback={<div className="text-center text-gray-400">กำลังโหลด...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
