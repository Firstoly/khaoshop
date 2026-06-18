'use client'

import { useState, useRef } from 'react'
import { Link2, Loader2, Copy, Check, QrCode, Upload, X, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export function SettingsClient({ shop }: { shop: any }) {
  const [form, setForm] = useState({
    name: shop.name, description: shop.description ?? '', phone: shop.phone ?? '',
    address: shop.address ?? '', isOpen: shop.isOpen, showKitchen: shop.showKitchen ?? true,
    showMenuOptions: shop.showMenuOptions ?? true,
    logoUrl: shop.logoUrl ?? '',
    promptpayId: shop.promptpayId ?? '', promptpayName: shop.promptpayName ?? '',
    qrCodeUrl: shop.qrCodeUrl ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const qrRef = useRef<HTMLInputElement>(null)

  const shopUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${shop.slug}` : `/store/${shop.slug}`

  async function uploadFile(file: File, folder: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data.url
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingLogo(true)
    try { const url = await uploadFile(file, 'khaoshop/logos'); setForm(f => ({...f, logoUrl: url})); toast.success('อัปโหลดโลโก้แล้ว') }
    catch (err: any) { toast.error(err.message) }
    finally { setUploadingLogo(false) }
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingQr(true)
    try { const url = await uploadFile(file, 'khaoshop/qrcodes'); setForm(f => ({...f, qrCodeUrl: url})); toast.success('อัปโหลด QR Code แล้ว') }
    catch (err: any) { toast.error(err.message) }
    finally { setUploadingQr(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      const res = await fetch(`/api/shop/${shop.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      toast.success('บันทึกแล้ว ✅')
    } catch { toast.error('เกิดข้อผิดพลาด') }
    finally { setLoading(false) }
  }

  function copyLink() {
    navigator.clipboard.writeText(shopUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
    toast.success('คัดลอกลิงก์แล้ว')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">ตั้งค่าร้าน</h1>
        <p className="text-sm text-gray-400 mt-0.5">จัดการข้อมูลร้านและการรับเงิน</p>
      </div>

      {/* Shop link */}
      <div className="card-base p-5 border-l-4 border-brand-400">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-brand-500" />
          <h2 className="font-display font-bold text-gray-900">ลิงก์ร้านของคุณ</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">แชร์ให้ลูกค้าสั่งอาหารได้เลย ไม่ต้อง login</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-orange-50 rounded-xl px-4 py-2.5 text-sm text-brand-700 font-medium truncate">/store/{shop.slug}</div>
          <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop info */}
        <div className="card-base p-6 space-y-4">
          <h2 className="font-display font-bold text-gray-900">ข้อมูลร้าน</h2>

          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-800">สถานะร้าน</p>
              <p className="text-xs text-gray-400 mt-0.5">{form.isOpen ? 'เปิดรับออเดอร์' : 'ปิดชั่วคราว'}</p>
            </div>
            <button type="button" onClick={() => setForm({...form, isOpen: !form.isOpen})}
              className={`relative inline-flex h-7 w-14 rounded-full transition-colors ${form.isOpen ? 'bg-brand-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-1 ${form.isOpen ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-800">แสดงเมนูเตรียมอาหาร</p>
              <p className="text-xs text-gray-400 mt-0.5">ปิดได้ถ้าร้านไม่ต้องการหน้าครัว เช่น ร้านน้ำดื่ม</p>
            </div>
            <button type="button" onClick={() => setForm({...form, showKitchen: !form.showKitchen})}
              className={`relative inline-flex h-7 w-14 rounded-full transition-colors ${form.showKitchen ? 'bg-brand-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-1 ${form.showKitchen ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">เปิดใช้ตัวเลือกเมนู (ปั่น/ไม่ปั่น ฯลฯ)</p>
              <p className="text-xs text-gray-400 mt-0.5">ให้ลูกค้าเลือกตัวเลือกก่อนสั่ง เหมาะสำหรับร้านน้ำ</p>
            </div>
            <button type="button" onClick={() => setForm({...form, showMenuOptions: !form.showMenuOptions})}
              className={`relative inline-flex h-7 w-14 rounded-full transition-colors ${form.showMenuOptions ? 'bg-brand-500' : 'bg-gray-200'}`}>
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-1 ${form.showMenuOptions ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">โลโก้ร้าน</label>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-orange-50 border-2 border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                {form.logoUrl ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-cover" />
                  : <ImageIcon className="w-6 h-6 text-gray-300" />}
              </div>
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60">
                {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingLogo ? 'กำลังอัปโหลด...' : 'เปลี่ยนโลโก้'}
              </button>
              {form.logoUrl && <button type="button" onClick={() => setForm({...form, logoUrl:''})} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อร้าน *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-base" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">คำอธิบายร้าน</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-base resize-none" rows={3} placeholder="เล่าเรื่องร้านของคุณ..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">เบอร์โทรศัพท์</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-base" placeholder="08X-XXX-XXXX" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">ที่อยู่ร้าน</label>
            <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-base resize-none" rows={2} />
          </div>
        </div>

        {/* Payment settings */}
        <div className="card-base p-6 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-500" />
            <h2 className="font-display font-bold text-gray-900">ตั้งค่าการรับเงิน</h2>
          </div>
          <p className="text-xs text-gray-500 -mt-2">ลูกค้าจะเห็นตัวเลือกนี้เมื่อสั่งอาหาร</p>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">เบอร์ / เลข PromptPay</label>
            <input value={form.promptpayId} onChange={e => setForm({...form, promptpayId: e.target.value})} className="input-base" placeholder="เช่น 0812345678 หรือ เลขบัตรประชาชน" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อบัญชี</label>
            <input value={form.promptpayName} onChange={e => setForm({...form, promptpayName: e.target.value})} className="input-base" placeholder="ชื่อ-นามสกุล" />
          </div>

          {/* QR Code upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">QR Code PromptPay (ถ้ามี)</label>
            <p className="text-xs text-gray-400 mb-2">ลูกค้าจะเห็น QR Code นี้เพื่อสแกนจ่าย</p>
            <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
            {form.qrCodeUrl ? (
              <div className="flex items-start gap-3">
                <img src={form.qrCodeUrl} alt="qr" className="w-24 h-24 rounded-xl border border-gray-200 object-contain bg-white" />
                <div className="space-y-2">
                  <button type="button" onClick={() => qrRef.current?.click()} disabled={uploadingQr}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    {uploadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    เปลี่ยน QR
                  </button>
                  <button type="button" onClick={() => setForm({...form, qrCodeUrl:''})} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                    <X className="w-3 h-3" />ลบ QR
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => qrRef.current?.click()} disabled={uploadingQr}
                className="w-full border-2 border-dashed border-gray-200 hover:border-emerald-300 rounded-2xl p-5 flex flex-col items-center gap-2 transition-colors">
                {uploadingQr ? <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /> : <QrCode className="w-8 h-8 text-gray-300" />}
                <p className="text-sm font-medium text-gray-500">{uploadingQr ? 'กำลังอัปโหลด...' : 'อัปโหลด QR Code'}</p>
              </button>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          บันทึกการตั้งค่า
        </button>
      </form>
    </div>
  )
}
