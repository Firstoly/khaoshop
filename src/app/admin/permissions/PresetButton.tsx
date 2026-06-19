'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const PRESETS = [
  { key: 'drink',   label: '🥤 ร้านเครื่องดื่ม' },
  { key: 'food',    label: '🍱 ร้านอาหาร' },
  { key: 'general', label: '🛍️ ร้านทั่วไป' },
]

export function PresetButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function apply(preset: string, label: string) {
    setLoading(true)
    setOpen(false)
    try {
      const res = await fetch('/api/admin/apply-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preset }),
      })
      if (!res.ok) throw new Error()
      toast.success(`ตั้ง preset "${label}" แล้ว`)
      router.refresh()
    } catch {
      toast.error('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="flex items-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors disabled:opacity-50"
      >
        {loading
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Zap className="w-3 h-3" />
        }
        Preset
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-44">
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => apply(p.key, p.label)}
                className="w-full text-left px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
