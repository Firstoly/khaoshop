'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const SHOP_TYPE_OPTIONS = [
  'ร้านเครื่องดื่ม',
  'ร้านอาหาร/กับข้าว',
  'ร้านเบเกอรี่',
  'ร้านทั่วไป',
]

export function ShopTypeSelect({ userId, currentType }: { userId: string; currentType?: string | null }) {
  const current = currentType ? currentType.split(',').map(s => s.trim()).filter(Boolean) : []
  const [selected, setSelected] = useState<string[]>(current)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function toggle(type: string) {
    const next = selected.includes(type)
      ? selected.filter(s => s !== type)
      : [...selected, type]
    setSelected(next)
    setSaving(true)
    try {
      const res = await fetch('/api/admin/set-shop-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, shopType: next.join(',') }),
      })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`flex flex-wrap gap-1 ${saving ? 'opacity-60 pointer-events-none' : ''}`}>
      {SHOP_TYPE_OPTIONS.map(t => {
        const active = selected.includes(t)
        return (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
              active
                ? 'bg-violet-500 text-white border-violet-500'
                : 'bg-white text-gray-400 border-gray-200 hover:border-violet-300 hover:text-violet-500'
            }`}
          >
            {t}
          </button>
        )
      })}
    </div>
  )
}
