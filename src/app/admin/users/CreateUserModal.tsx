'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { X, UserPlus, Loader2, Eye, EyeOff, Store } from 'lucide-react'

const SHOP_TYPE_OPTIONS = [
  'ร้านเครื่องดื่ม',
  'ร้านอาหาร/กับข้าว',
  'ร้านเบเกอรี่',
  'ร้านทั่วไป',
  'อื่นๆ',
]

export function CreateUserModal() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [shopName, setShopName] = useState('')
  const [shopTypeSelect, setShopTypeSelect] = useState('')
  const [shopTypeCustom, setShopTypeCustom] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function close() {
    setOpen(false)
    setName('')
    setEmail('')
    setPassword('')
    setShopName('')
    setShopTypeSelect('')
    setShopTypeCustom('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const shopType = shopTypeSelect === 'อื่นๆ' ? shopTypeCustom : shopTypeSelect
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, shopName: shopName || undefined, shopType: shopType || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'เกิดข้อผิดพลาด'); return }
      toast.success('สร้างบัญชีสำเร็จ!')
      close()
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2 text-sm">
        <UserPlus className="w-4 h-4" />
        สร้างบัญชีใหม่
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />

          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-bounce-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-violet-600" />
                </div>
                <h2 className="font-display font-bold text-gray-900">สร้างบัญชีใหม่</h2>
              </div>
              <button onClick={close} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Account info */}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ข้อมูลบัญชี</p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อเจ้าของ</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="input-base" placeholder="ชื่อผู้ใช้" required />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">อีเมล</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input-base" placeholder="example@email.com" required />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่าน</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-base pr-12" placeholder="อย่างน้อย 6 ตัวอักษร" minLength={6} required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Shop info */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-4 h-4 text-brand-500" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ข้อมูลร้าน (ไม่บังคับ)</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อร้าน</label>
                    <input type="text" value={shopName} onChange={e => setShopName(e.target.value)}
                      className="input-base" placeholder="เช่น ร้านวิไลวรรณ" />
                    <p className="text-xs text-gray-400 mt-1">ถ้าใส่ชื่อร้าน ระบบจะสร้างร้านให้ทันที</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">ประเภทร้าน</label>
                    <select value={shopTypeSelect} onChange={e => setShopTypeSelect(e.target.value)}
                      className="input-base">
                      <option value="">-- เลือกประเภทร้าน --</option>
                      {SHOP_TYPE_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {shopTypeSelect === 'อื่นๆ' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">ระบุประเภทร้าน</label>
                      <input type="text" value={shopTypeCustom} onChange={e => setShopTypeCustom(e.target.value)}
                        className="input-base" placeholder="เช่น ร้านก๋วยเตี๋ยว" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={close} className="btn-secondary flex-1">ยกเลิก</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />กำลังสร้าง...</> : 'สร้างบัญชี'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
