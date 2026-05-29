'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChefHat, Loader2, CheckCircle, ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSent(true)
    } catch (err: any) {
      toast.error(err.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl shadow-brand mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">ลืมรหัสผ่าน</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          {sent ? (
            <div className="text-center animate-bounce-in">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="font-display font-bold text-gray-900 text-lg mb-2">ส่งอีเมลแล้ว!</h2>
              <p className="text-gray-500 text-sm mb-2">เราส่งลิงก์รีเซ็ตรหัสผ่านไปที่</p>
              <p className="font-bold text-brand-500 mb-6">{email}</p>
              <p className="text-xs text-gray-400 mb-6">ลิงก์จะหมดอายุใน 1 ชั่วโมง กรุณาตรวจสอบกล่อง Spam ด้วย</p>
              <Link href="/login" className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> กลับหน้า Login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-6">กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">อีเมล</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="input-base pl-10" placeholder="your@email.com" required />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต'}
                </button>
              </form>
              <Link href="/login" className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4" /> กลับหน้า Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
