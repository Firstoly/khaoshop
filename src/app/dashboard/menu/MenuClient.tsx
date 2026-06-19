'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, UtensilsCrossed, X, Loader2, PackageX, RotateCcw, Tag, Layers } from 'lucide-react'

const OPTION_STORAGE_KEY = 'khaoshop_option_history'
const CATEGORY_STORAGE_KEY = 'khaoshop_category_history'

function loadCategoryHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(CATEGORY_STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveCategoryToHistory(cat: string) {
  const prev = loadCategoryHistory()
  if (!prev.includes(cat)) localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify([cat, ...prev].slice(0, 20)))
}
const DEFAULT_OPTIONS = ['ปั่น', 'ไม่ปั่น', 'เย็น', 'ร้อน']

function loadOptionHistory(): string[] {
  try {
    const saved: string[] = JSON.parse(localStorage.getItem(OPTION_STORAGE_KEY) ?? '[]')
    return [...DEFAULT_OPTIONS, ...saved.filter(s => !DEFAULT_OPTIONS.includes(s))]
  } catch { return DEFAULT_OPTIONS }
}
function saveOptionToHistory(opt: string) {
  if (DEFAULT_OPTIONS.includes(opt)) return
  const prev: string[] = (() => { try { return JSON.parse(localStorage.getItem(OPTION_STORAGE_KEY) ?? '[]') } catch { return [] } })()
  if (!prev.includes(opt)) localStorage.setItem(OPTION_STORAGE_KEY, JSON.stringify([opt, ...prev].slice(0, 30)))
}
import { formatPrice, getStockStatus } from '@/lib/utils'
import { ImageUpload } from '@/components/ui/ImageUpload'
import toast from 'react-hot-toast'

const CATEGORIES = ['แกงและต้ม', 'ผัด', 'ทอดและอบ', 'ยำและสลัด', 'ข้าว', 'เครื่องดื่ม', 'อื่นๆ']

interface SizeOption { name: string; price: number }
interface MenuItem {
  id: string; name: string; description?: string | null; price: number
  imageUrl?: string | null; dailyLimit: number; soldCount: number
  isAvailable: boolean; category?: string | null; options: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sizes?: any
}

export function MenuClient({ menuItems: initial, shopId, showMenuOptions = true }: { menuItems: MenuItem[]; shopId: string; showMenuOptions?: boolean }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initial)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '', dailyLimit: '20',
    category: 'แกงและต้ม', customCategory: '', imageUrl: '', isAvailable: true,
    options: [] as string[],
  })
  const [sizes, setSizes] = useState<{name: string; price: string}[]>([])
  const [optionInput, setOptionInput] = useState('')
  const [optionHistory, setOptionHistory] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const optionInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const [categoryHistory, setCategoryHistory] = useState<string[]>([])
  const [showCatSuggestions, setShowCatSuggestions] = useState(false)

  useEffect(() => {
    setOptionHistory(loadOptionHistory())
    setCategoryHistory(loadCategoryHistory())
  }, [showModal])

  const filtered = menuItems.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || (m.category ?? '').includes(search)
    const matchCategory = selectedCategory === 'ทั้งหมด' || m.category === selectedCategory
    return matchSearch && matchCategory
  })

  function openAdd() {
    setEditing(null)
    setForm({ name: '', description: '', price: '', dailyLimit: '20', category: 'แกงและต้ม', customCategory: '', imageUrl: '', isAvailable: true, options: [] })
    setSizes([])
    setOptionInput('')
    setShowModal(true)
  }

  function openEdit(item: MenuItem) {
    setEditing(item)
    const cat = item.category ?? 'อื่นๆ'
    const isKnown = CATEGORIES.includes(cat)
    setForm({ name: item.name, description: item.description ?? '', price: String(item.price),
      dailyLimit: String(item.dailyLimit),
      category: isKnown ? cat : 'อื่นๆ',
      customCategory: isKnown ? '' : cat,
      imageUrl: item.imageUrl ?? '', isAvailable: item.isAvailable, options: item.options ?? [] })
    setSizes((item.sizes ?? []).map((s: SizeOption) => ({ name: s.name, price: String(s.price) })))
    setOptionInput('')
    setShowModal(true)
  }

  function addOption(val?: string) {
    const v = (val ?? optionInput).trim()
    if (!v || form.options.includes(v)) return
    setForm(f => ({ ...f, options: [...f.options, v] }))
    saveOptionToHistory(v)
    setOptionHistory(loadOptionHistory())
    setOptionInput('')
    setShowSuggestions(false)
  }

  function removeOption(opt: string) {
    setForm(f => ({ ...f, options: f.options.filter(o => o !== opt) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const finalCategory = form.category === 'อื่นๆ' ? (form.customCategory.trim() || 'อื่นๆ') : form.category
      if (form.category === 'อื่นๆ' && form.customCategory.trim()) {
        saveCategoryToHistory(form.customCategory.trim())
        setCategoryHistory(loadCategoryHistory())
      }
      const sizesData = sizes.filter(s => s.name.trim() && s.price).map(s => ({ name: s.name.trim(), price: parseFloat(s.price) }))
      const body = { name: form.name, description: form.description, price: parseFloat(form.price),
        dailyLimit: parseInt(form.dailyLimit), category: finalCategory,
        imageUrl: form.imageUrl || null, isAvailable: form.isAvailable, options: form.options, sizes: sizesData, shopId }
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
                    {item.sizes && item.sizes.length > 0 ? (
                      <span className="text-brand-500 font-bold shrink-0">
                        ฿{Math.min(...(item.sizes as SizeOption[]).map(s => s.price))}–{Math.max(...(item.sizes as SizeOption[]).map(s => s.price))}
                      </span>
                    ) : (
                      <span className="text-brand-500 font-bold shrink-0">{formatPrice(item.price)}</span>
                    )}
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
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, customCategory: '' })} className="input-base">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {form.category === 'อื่นๆ' && (
                  <div className="relative mt-2">
                    <input
                      value={form.customCategory}
                      onChange={e => { setForm({ ...form, customCategory: e.target.value }); setShowCatSuggestions(true) }}
                      onFocus={() => setShowCatSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCatSuggestions(false), 150)}
                      className="input-base w-full"
                      placeholder="ระบุหมวดหมู่ของคุณ..."
                      autoFocus
                    />
                    {showCatSuggestions && (() => {
                      const q = form.customCategory.trim().toLowerCase()
                      const hits = categoryHistory.filter(h => q === '' || h.toLowerCase().includes(q))
                      return hits.length > 0 ? (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                          {hits.map(h => (
                            <button key={h} type="button"
                              onMouseDown={() => { setForm(f => ({ ...f, customCategory: h })); setShowCatSuggestions(false) }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                              {h}
                            </button>
                          ))}
                        </div>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
              {/* Sizes (แก้วเล็ก / แก้วกลาง / แก้วใหญ่ ฯลฯ) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    <Layers className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    ขนาด/ไซส์ <span className="text-gray-400 font-normal">(ราคาต่างกัน)</span>
                  </label>
                  <button type="button"
                    onClick={() => setSizes(prev => [...prev, { name: '', price: '' }])}
                    className="text-xs text-brand-600 font-bold hover:underline">
                    + เพิ่มขนาด
                  </button>
                </div>
                {sizes.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={s.name}
                      onChange={e => setSizes(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="input-base flex-1 text-sm" placeholder="เช่น แก้วเล็ก, กลาง, ใหญ่" />
                    <input type="number" value={s.price} min="0"
                      onChange={e => setSizes(prev => prev.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                      className="input-base w-24 text-sm" placeholder="ราคา" />
                    <button type="button"
                      onClick={() => setSizes(prev => prev.filter((_, j) => j !== i))}
                      className="w-9 h-9 bg-red-50 text-red-400 rounded-xl flex items-center justify-center shrink-0 hover:bg-red-100">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {sizes.length > 0 && (
                  <p className="text-[11px] text-gray-400">ราคาที่ลูกค้าจ่ายจะใช้ราคาตามขนาดที่เลือก ไม่ใช่ราคาหลัก</p>
                )}
              </div>

              {/* Options (ปั่น / ไม่ปั่น / เย็น / ร้อน ฯลฯ) */}
              {showMenuOptions && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <Tag className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  ตัวเลือกให้ลูกค้าเลือก <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                </label>
                <div className="flex gap-2 relative">
                  <div className="flex-1 relative">
                    <input
                      ref={optionInputRef}
                      value={optionInput}
                      onChange={e => { setOptionInput(e.target.value); setShowSuggestions(true) }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                      className="input-base w-full text-sm"
                      placeholder="เช่น ปั่น, ไม่ปั่น, เย็น, ร้อน..."
                    />
                    {showSuggestions && (() => {
                      const q = optionInput.trim().toLowerCase()
                      const hits = optionHistory.filter(h =>
                        !form.options.includes(h) && (q === '' || h.toLowerCase().includes(q))
                      )
                      return hits.length > 0 ? (
                        <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                          {hits.map(h => (
                            <button key={h} type="button"
                              onMouseDown={() => addOption(h)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors">
                              {h}
                            </button>
                          ))}
                        </div>
                      ) : null
                    })()}
                  </div>
                  <button type="button" onClick={() => addOption()}
                    className="px-3 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold hover:bg-brand-600 shrink-0">
                    + เพิ่ม
                  </button>
                </div>
                {form.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.options.map(opt => (
                      <span key={opt} className="flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                        {opt}
                        <button type="button" onClick={() => removeOption(opt)} className="ml-0.5 text-brand-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-1">ลูกค้าจะต้องเลือก 1 ตัวเลือกก่อนสั่ง</p>
              </div>
              )}

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
