'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChefHat, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', shopName: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน'); return
    }
    if (form.password.length < 8) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'); return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, shopName: form.shopName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
    } catch (err: any) {
      toast.error(err.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 px-4">
        <div className="text-center animate-bounce-in">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">สมัครสมาชิกสำเร็จ!</h1>
          <p className="text-gray-500 mb-6">ร้าน <span className="font-semibold text-brand-500">{form.shopName}</span> พร้อมใช้งานแล้ว</p>
          <Link href="/login" className="btn-primary inline-flex">เข้าสู่ระบบเลย →</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl shadow-brand mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">สมัครใช้งาน KhaoShop</h1>
          <p className="text-gray-500 text-sm mt-1">เปิดร้านออนไลน์ฟรี ไม่มีค่าใช้จ่าย</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 animate-bounce-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อ-นามสกุลเจ้าของร้าน *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="input-base" placeholder="เช่น สมศรี ใจดี" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อร้าน *</label>
              <input value={form.shopName} onChange={e => setForm({...form, shopName: e.target.value})}
                className="input-base" placeholder="เช่น ร้านป้าแดง กับข้าวสด" required />
              <p className="text-xs text-gray-400 mt-1">ลูกค้าจะเห็นชื่อนี้หน้าร้าน</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">อีเมล *</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="input-base" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่าน * (อย่างน้อย 8 ตัว)</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="input-base pr-12" placeholder="••••••••" required minLength={8} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">ยืนยันรหัสผ่าน *</label>
              <input type="password" value={form.confirmPassword}
                onChange={e => setForm({...form, confirmPassword: e.target.value})}
                className="input-base" placeholder="••••••••" required />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>
              )}
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิกฟรี'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            มีบัญชีแล้ว?{' '}
            <Link href="/login" className="text-brand-500 hover:text-brand-600 font-semibold">เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
