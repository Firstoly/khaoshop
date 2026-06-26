// ===================================================
// ResetPasswordModal — Admin ตั้งรหัสผ่านใหม่ให้ user
// กดปุ่ม key icon → เปิด modal กรอก password → บันทึก
// ไม่ต้องส่งอีเมล admin กรอกให้ตรงๆ ได้เลย
// ===================================================

'use client'

import { useState } from 'react'
import { KeyRound, X, Loader2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export function ResetPasswordModal({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  // ปิด modal และล้าง input
  function close() { setOpen(false); setPassword('') }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัว'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      })
      if (!res.ok) throw new Error()
      toast.success(`รีเซ็ตรหัสผ่านของ "${userName}" แล้ว`)
      close()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ปุ่มเปิด modal — icon กุญแจ สีเหลือง */}
      <button onClick={() => setOpen(true)} title="รีเซ็ตรหัสผ่าน"
        className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100 hover:text-amber-600 flex items-center justify-center transition-colors">
        <KeyRound className="w-3.5 h-3.5" />
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-bounce-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <h3 className="font-display font-bold text-gray-900 text-sm">รีเซ็ตรหัสผ่าน</h3>
              </div>
              <button onClick={close} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <p className="text-sm text-gray-500">ตั้งรหัสผ่านใหม่ให้ <span className="font-semibold text-gray-700">{userName}</span></p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่านใหม่</label>
                <div className="relative">
                  {/* toggle แสดง/ซ่อนรหัสผ่าน */}
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-base pr-10" placeholder="อย่างน้อย 6 ตัวอักษร" required minLength={6} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={close} className="btn-secondary flex-1 text-sm">ยกเลิก</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
