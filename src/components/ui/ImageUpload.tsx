'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, Link } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState(value?.startsWith('http') ? value : '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChange(data.url)
      toast.success('อัปโหลดรูปสำเร็จ')
    } catch (err: any) {
      toast.error(err.message ?? 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) uploadFile(file)
    else toast.error('กรุณาเลือกไฟล์รูปภาพ')
  }, [])

  function handleUrlConfirm() {
    if (!urlInput.trim()) return
    onChange(urlInput.trim())
    toast.success('บันทึก URL แล้ว')
  }

  function clearImage() {
    onChange('')
    setUrlInput('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      {value && (
        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video w-full">
          <img src={value} alt="preview" className="w-full h-full object-cover"
            onError={() => { onChange(''); toast.error('โหลดรูปไม่ได้') }} />
          <button type="button" onClick={clearImage}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center">
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">✓ มีรูปแล้ว</div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {(['upload', 'url'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
            {t === 'upload' ? <><Upload className="w-3.5 h-3.5" />อัปโหลดไฟล์</> : <><Link className="w-3.5 h-3.5" />ใส่ URL</>}
          </button>
        ))}
      </div>

      {tab === 'upload' && (
        <>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={cn('border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all',
              dragging ? 'border-brand-400 bg-orange-50' : 'border-gray-200 hover:border-brand-300 hover:bg-orange-50/50',
              uploading && 'pointer-events-none opacity-60')}>
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                <p className="text-sm text-gray-500">กำลังอัปโหลด...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-brand-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  {dragging ? 'วางรูปที่นี่!' : 'คลิกเลือกรูป หรือลากมาวาง'}
                </p>
                <p className="text-xs text-gray-400">JPG, PNG, WEBP • สูงสุด 5MB</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'url' && (
        <div className="flex gap-2">
          <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg" className="input-base flex-1"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleUrlConfirm())} />
          <button type="button" onClick={handleUrlConfirm} disabled={!urlInput.trim()}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors">
            ใช้
          </button>
        </div>
      )}
    </div>
  )
}
