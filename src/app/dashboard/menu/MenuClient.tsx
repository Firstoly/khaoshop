'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, UtensilsCrossed, X, Loader2, PackageX, RotateCcw } from 'lucide-react'
import { formatPrice, getStockStatus } from '@/lib/utils'
import { ImageUpload } from '@/components/ui/ImageUpload'
import toast from 'react-hot-toast'

const CATEGORIES = ['แกงและต้ม', 'ผัด', 'ทอดและอบ', 'ยำและสลัด', 'ข้าว', 'เครื่องดื่ม', 'อื่นๆ']

interface MenuItem {
  id: string; name: string; description?: string | null; price: number
  imageUrl?: string | null; dailyLimit: number; soldCount: number
  isAvailable: boolean; category?: string | null
}

export function MenuClient({ menuItems: initial, shopId }: { menuItems: MenuItem[]; shopId: string }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initial)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '', dailyLimit: '20',
    category: 'แกงและต้ม', imageUrl: '', isAvailable: true,
  })

  const filtered = menuItems.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || (m.category ?? '').includes(search)
    const matchCategory = selectedCategory === 'ทั้งหมด' || m.category === selectedCategory
    return matchSearch && matchCategory
  })

  function openAdd() {
    setEditing(null)
    setForm({ name: '', description: '', price: '', dailyLimit: '20', category: 'แกงและต้ม', imageUrl: '', isAvailable: true })
    setShowModal(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    setForm({ name: item.name, description: item.description ?? '', price: String(item.price),
      dailyLimit: String(item.dailyLimit), category: item.category ?? 'อื่นๆ',
      imageUrl: item.imageUrl ?? '', isAvailable: item.isAvailable })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = { name: form.name, description: form.description, price: parseFloat(form.price),
        dailyLimit: parseInt(form.dailyLimit), category: form.category,
        imageUrl: form.imageUrl || null, isAvailable: form.isAvailable, shopId }
      const url = editing ? `/api/menu/${editing.id}` : '/api/menu'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (editing) {
        setMenuItems(prev => prev.map(m => m.id === editing.id ? data : m))
        toast.success('แก้ไขเมนูสำเร็จ')
      } else {
        setMenuItems(prev => [data, ...prev])
        toast.success('เพิ่มเมนูสำเร็จ')
      }
      setShowModal(false)
    } catch { toast.error('เกิดข้อผิดพลาด') }
    finally { setLoading(false) }
  }

  async function toggleAvailable(item: MenuItem) {
    const res = await fetch(`/api/menu/${item.id}`, { method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, isAvailable: !item.isAvailable }) })
    if (res.ok) {
      const updated = await res.json()
      setMenuItems(prev => prev.map(m => m.id === item.id ? updated : m))
      toast.success(updated.isAvailable ? 'เปิดขายแล้ว' : 'ปิดขายแล้ว')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบเมนูนี้?')) return
    const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' })
    if (res.ok) { setMenuItems(prev => prev.filter(m => m.id !== id)); toast.success('ลบเมนูแล้ว') }
  }

  async function markSoldOut(item: MenuItem) {
    const res = await fetch(`/api/menu/${item.id}/soldout`, { method: 'POST' })
    if (res.ok) {
      const updated = await res.json()
      setMenuItems(prev => prev.map(m => m.id === item.id ? updated : m))
      toast.success('ทำเครื่องหมายว่าหมดแล้ว')
    }
  }

  async function resetStock(item: MenuItem) {
    const res = await fetch(`/api/menu/${item.id}/reset`, { method: 'POST' })
    if (res.ok) {
      const updated = await res.json()
      setMenuItems(prev => prev.map(m => m.id === item.id ? updated : m))
      toast.success('รีเซ็ตสต็อกแล้ว')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">จัดการเมนู</h1>
          <p className="text-sm text-gray-400 mt-0.5">{menuItems.length} เมนู</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" />เพิ่มเมนู
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเมนู..." className="input-base pl-10" />
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {['ทั้งหมด', ...CATEGORIES].map(cat => {
          const count = cat === 'ทั้งหมด' ? menuItems.length : menuItems.filter(m => m.category === cat).length
          return (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
                selectedCategory === cat ? 'bg-brand-500 text-white shadow-brand' : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
              }`}>
              {cat}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selectedCategory === cat ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <UtensilsCrossed className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="font-medium">ไม่พบเมนู</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const stock = getStockStatus(item.dailyLimit, item.soldCount)
            return (
              <div key={item.id} className="food-card">
                <div className="relative h-44 bg-gradient-to-br from-orange-50 to-amber-50">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <UtensilsCrossed className="w-10 h-10 text-gray-200" />
                      <span className="text-xs text-gray-300">ยังไม่มีรูป</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    {!item.isAvailable ? (
                      <span className="bg-gray-800/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">ปิดขาย</span>
                    ) : stock.remaining === 0 ? (
                      <span className="bg-red-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">หมดแล้ว</span>
                    ) : stock.remaining <= 3 ? (
                      <span className="bg-amber-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">ใกล้หมด</span>
                    ) : null}
                  </div>
                  {item.category && (
                    <div className="absolute top-3 right-3">
                      <span className="bg-white/80 text-gray-600 text-[10px] font-medium px-2 py-1 rounded-full">{item.category}</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-display font-bold text-gray-900 text-base">{item.name}</h3>
                    <span className="text-brand-500 font-bold shrink-0">{formatPrice(item.price)}</span>
                  </div>
                  {item.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{item.description}</p>}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">จำนวนวันนี้</span>
                      <span className={`font-semibold ${stock.color === 'red' ? 'text-red-500' : stock.color === 'orange' ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {stock.label} / {item.dailyLimit}
                      </span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${stock.color === 'red' ? 'bg-red-400' : stock.color === 'orange' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.max((stock.remaining / item.dailyLimit) * 100, 0)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAvailable(item)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${item.isAvailable ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {item.isAvailable ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {item.isAvailable ? 'เปิดอยู่' : 'ปิดอยู่'}
                    </button>
                    {stock.remaining > 0 ? (
                      <button onClick={() => markSoldOut(item)} title="ทำเครื่องหมายหมดแล้ว"
                        className="w-9 h-9 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                        <PackageX className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button onClick={() => resetStock(item)} title="รีเซ็ตสต็อก"
                        className="w-9 h-9 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100 flex items-center justify-center transition-colors">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => openEdit(item)} className="w-9 h-9 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-bounce-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-display text-lg font-bold text-gray-900">{editing ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">รูปภาพเมนู</label>
                <ImageUpload value={form.imageUrl} onChange={url => setForm({ ...form, imageUrl: url })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อเมนู *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-base" placeholder="เช่น แกงเขียวหวาน" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">รายละเอียด</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-base resize-none" rows={2} placeholder="อธิบายสั้นๆ" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">ราคา (บาท) *</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input-base" placeholder="50" required min="0" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">จำนวนต่อวัน *</label>
                  <input type="number" value={form.dailyLimit} onChange={e => setForm({ ...form, dailyLimit: e.target.value })} className="input-base" placeholder="20" required min="1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">หมวดหมู่</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-base">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm({ ...form, isAvailable: !form.isAvailable })}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form.isAvailable ? 'bg-brand-500' : 'bg-gray-200'}`}>
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${form.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm font-medium text-gray-700">{form.isAvailable ? 'เปิดขาย' : 'ปิดขาย'}</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">ยกเลิก</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'บันทึก' : 'เพิ่มเมนู'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
