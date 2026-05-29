'use client'

import { useState, useMemo, useRef } from 'react'
import { ShoppingCart, Plus, Minus, X, Phone, MapPin, UtensilsCrossed, ChefHat, CheckCircle, Loader2, Banknote, QrCode, Upload, Image as ImageIcon } from 'lucide-react'
import { formatPrice, getStockStatus } from '@/lib/utils'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface CartItem { menuItem: any; quantity: number }
const CATEGORIES_ORDER = ['ทั้งหมด','แกงและต้ม','ผัด','ทอดและอบ','ยำและสลัด','ข้าว','เครื่องดื่ม','อื่นๆ']

export function StoreClient({ shop, menuItems }: { shop: any; menuItems: any[] }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [catFilter, setCatFilter] = useState('ทั้งหมด')
  const [showCart, setShowCart] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [orderDone, setOrderDone] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<any>(null)
  const [form, setForm] = useState({ name:'', phone:'', address:'', note:'', paymentMethod:'CASH' })
  const [slipFile, setSlipFile] = useState<File|null>(null)
  const [slipPreview, setSlipPreview] = useState('')
  const [uploadingSlip, setUploadingSlip] = useState(false)
  const slipRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map(m => m.category ?? 'อื่นๆ'))
    return ['ทั้งหมด', ...CATEGORIES_ORDER.slice(1).filter(c => cats.has(c))]
  }, [menuItems])

  const filtered = catFilter === 'ทั้งหมด' ? menuItems : menuItems.filter(m => (m.category ?? 'อื่นๆ') === catFilter)
  const cartTotal = cart.reduce((s,c) => s + c.menuItem.price * c.quantity, 0)
  const cartCount = cart.reduce((s,c) => s + c.quantity, 0)

  function addToCart(item: any) {
    const stock = getStockStatus(item.dailyLimit, item.soldCount)
    const inCart = cart.find(c => c.menuItem.id === item.id)?.quantity ?? 0
    if (inCart >= stock.remaining) { toast.error('จำนวนไม่พอ'); return }
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === item.id)
      if (ex) return prev.map(c => c.menuItem.id === item.id ? {...c, quantity: c.quantity+1} : c)
      return [...prev, { menuItem: item, quantity: 1 }]
    })
  }

  function removeFromCart(id: string) {
    setCart(prev => {
      const ex = prev.find(c => c.menuItem.id === id)
      if (!ex) return prev
      if (ex.quantity === 1) return prev.filter(c => c.menuItem.id !== id)
      return prev.map(c => c.menuItem.id === id ? {...c, quantity: c.quantity-1} : c)
    })
  }

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!cart.length) { toast.error('เพิ่มอาหารก่อนนะคะ'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shop.id,
          customerName: form.name,
          customerPhone: form.phone,
          customerAddress: form.address,
          note: form.note,
          paymentMethod: form.paymentMethod,
          items: cart.map(c => ({ menuItemId: c.menuItem.id, quantity: c.quantity, price: c.menuItem.price })),
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const order = await res.json()
      setCreatedOrder(order)
      setCart([])
      setShowForm(false)
      if (form.paymentMethod === 'PROMPTPAY') {
        setShowPayment(true)
      } else {
        setOrderDone(order)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  function handleSlipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSlipFile(file)
    setSlipPreview(URL.createObjectURL(file))
  }

  async function handleUploadSlip() {
    if (!slipFile || !createdOrder) return
    setUploadingSlip(true)
    try {
      const formData = new FormData()
      formData.append('file', slipFile)
      const res = await fetch(`/api/orders/${createdOrder.id}/slip`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('อัปโหลดไม่สำเร็จ')
      toast.success('ส่งสลิปแล้ว! รอร้านยืนยันครับ')
      setShowPayment(false)
      setOrderDone(createdOrder)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploadingSlip(false)
    }
  }

  // Order success screen
  if (orderDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
        <div className="text-center animate-bounce-in max-w-sm w-full">
          <div className="w-24 h-24 bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-brand">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">สั่งซื้อสำเร็จ!</h1>
          <p className="text-gray-500 mb-6">ขอบคุณที่สั่งอาหารกับเรา 🙏</p>
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
            <p className="text-sm text-gray-500 mb-2">เลขคิวของคุณ</p>
            <p className="font-display text-7xl font-black text-brand-500">
              #{String(orderDone.queueNumber).padStart(3,'0')}
            </p>
            <div className="mt-4 pt-4 border-t border-gray-100">
              {orderDone.paymentMethod === 'CASH' ? (
                <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl">
                  <Banknote className="w-4 h-4" />
                  <span className="text-sm font-semibold">ชำระเงินสด {formatPrice(orderDone.totalAmount)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
                  <QrCode className="w-4 h-4" />
                  <span className="text-sm font-semibold">รอร้านยืนยันการชำระเงิน</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3">ทางร้านจะติดต่อกลับเมื่อพร้อม</p>
          </div>
          <button onClick={() => setOrderDone(null)} className="btn-primary">กลับหน้าเมนู</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-4 pt-10 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 bg-white rounded-full" />
          <div className="absolute bottom-0 left-8 w-24 h-24 bg-white rounded-full" />
        </div>
        <div className="relative max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              {shop.logoUrl ? <img src={shop.logoUrl} alt={shop.name} className="w-14 h-14 rounded-xl object-cover" />
                : <ChefHat className="w-8 h-8 text-white" />}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">{shop.name}</h1>
              {shop.description && <p className="text-white/70 text-sm mt-0.5 line-clamp-2">{shop.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-white/80 text-xs">
            {shop.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{shop.phone}</span>}
            {!shop.isOpen && <span className="bg-red-500/80 px-2.5 py-1 rounded-full font-bold text-white">ปิดชั่วคราว</span>}
          </div>
        </div>
      </div>

      {/* เพิ่ม relative z-10 ตรงนี้เพื่อให้ส่วนเมนูลอยเหนือบ็อกซ์ Header สีส้ม */}
      <div className="relative z-10 max-w-lg mx-auto px-4 -mt-8 pb-32">
        {/* Category tabs */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={cn('px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 shadow-sm transition-all',
                  catFilter === cat ? 'bg-brand-500 text-white shadow-brand' : 'bg-white text-gray-600 border border-gray-200')}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Menu items */}
        <div className="space-y-3">
          {filtered.map(item => {
            const stock = getStockStatus(item.dailyLimit, item.soldCount)
            const inCart = cart.find(c => c.menuItem.id === item.id)?.quantity ?? 0
            const soldOut = stock.remaining === 0
            return (
              <div key={item.id} className={cn('bg-white rounded-2xl shadow-card overflow-hidden flex', soldOut && 'opacity-60')}>
                <div className="w-28 h-28 shrink-0 bg-orange-50 relative">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-8 h-8 text-gray-200" /></div>}
                  {soldOut && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-xs font-bold">หมดแล้ว</span></div>}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display font-bold text-gray-900 text-sm">{item.name}</h3>
                    {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>}
                    <p className={cn('text-xs mt-1 font-medium', soldOut ? 'text-red-400' : stock.remaining <= 3 ? 'text-amber-500' : 'text-gray-400')}>
                      {soldOut ? 'หมดแล้ว' : `เหลือ ${stock.remaining}`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-brand-500">{formatPrice(item.price)}</span>
                    {!soldOut && (
                      <div className="flex items-center gap-2">
                        {inCart > 0 && <>
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                          <span className="text-sm font-bold text-brand-500 w-4 text-center">{inCart}</span>
                        </>}
                        <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-full bg-brand-500 hover:bg-brand-600 flex items-center justify-center text-white shadow-brand"><Plus className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cart button */}
      {cartCount > 0 && !showCart && !showForm && !showPayment && (
        <div className="fixed bottom-6 left-0 right-0 px-4 max-w-lg mx-auto">
          <button onClick={() => setShowCart(true)}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white py-4 rounded-2xl shadow-brand flex items-center justify-between px-5 font-semibold">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">{cartCount}</span>
              <span>ดูตะกร้า</span>
            </div>
            <span>{formatPrice(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Cart modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-display text-lg font-bold">ตะกร้า ({cartCount})</h2>
              <button onClick={() => setShowCart(false)} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {cart.map(c => (
                <div key={c.menuItem.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.menuItem.name}</p>
                    <p className="text-xs text-gray-400">{formatPrice(c.menuItem.price)} × {c.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(c.menuItem.id)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm font-bold w-4 text-center">{c.quantity}</span>
                    <button onClick={() => addToCart(c.menuItem)} className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="font-bold text-sm w-16 text-right">{formatPrice(c.menuItem.price * c.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold">รวม</span>
                <span className="font-bold text-brand-500 text-lg">{formatPrice(cartTotal)}</span>
              </div>
              <button onClick={() => { setShowCart(false); setShowForm(true) }} className="btn-primary w-full mt-2">ดำเนินการสั่งซื้อ</button>
            </div>
          </div>
        </div>
      )}

      {/* Order form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-display text-lg font-bold">ข้อมูลและการชำระเงิน</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleOrder} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อ *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-base" placeholder="ชื่อ-นามสกุล" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">เบอร์โทร *</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-base" placeholder="08X-XXX-XXXX" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ที่อยู่จัดส่ง (ถ้ามี)</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-base resize-none" rows={2} placeholder="บ้านเลขที่, ซอย, ถนน..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">หมายเหตุ</label>
                <input value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="input-base" placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย" />
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">วิธีชำระเงิน *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setForm({...form, paymentMethod:'CASH'})}
                    className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                      form.paymentMethod === 'CASH' ? 'border-brand-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', form.paymentMethod === 'CASH' ? 'bg-brand-500' : 'bg-gray-100')}>
                      <Banknote className={cn('w-5 h-5', form.paymentMethod === 'CASH' ? 'text-white' : 'text-gray-500')} />
                    </div>
                    <span className={cn('text-sm font-bold', form.paymentMethod === 'CASH' ? 'text-brand-600' : 'text-gray-600')}>เงินสด</span>
                    <span className="text-[10px] text-gray-400 text-center">ชำระเมื่อรับของ</span>
                  </button>

                  <button type="button"
                    onClick={() => {
                      if (!shop.promptpayId) { toast.error('ร้านนี้ยังไม่เปิดรับ QR'); return }
                      setForm({...form, paymentMethod:'PROMPTPAY'})
                    }}
                    className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
                      form.paymentMethod === 'PROMPTPAY' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300',
                      !shop.promptpayId && 'opacity-40 cursor-not-allowed')}>
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', form.paymentMethod === 'PROMPTPAY' ? 'bg-emerald-500' : 'bg-gray-100')}>
                      <QrCode className={cn('w-5 h-5', form.paymentMethod === 'PROMPTPAY' ? 'text-white' : 'text-gray-500')} />
                    </div>
                    <span className={cn('text-sm font-bold', form.paymentMethod === 'PROMPTPAY' ? 'text-emerald-600' : 'text-gray-600')}>สแกน QR</span>
                    <span className="text-[10px] text-gray-400 text-center">PromptPay</span>
                  </button>
                </div>
              </div>

              {/* Order summary */}
              <div className="bg-orange-50 rounded-2xl p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">สรุปออเดอร์</p>
                {cart.map(c => (
                  <div key={c.menuItem.id} className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{c.menuItem.name} × {c.quantity}</span>
                    <span>{formatPrice(c.menuItem.price * c.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-gray-900 border-t border-orange-100 pt-2 mt-2">
                  <span>รวม</span>
                  <span className="text-brand-500">{formatPrice(cartTotal)}</span>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {form.paymentMethod === 'PROMPTPAY' ? 'ถัดไป → สแกน QR' : 'ยืนยันการสั่งซื้อ'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PromptPay payment modal */}
      {showPayment && createdOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-display text-lg font-bold">สแกนชำระเงิน</h2>
              <button onClick={() => { setShowPayment(false); setOrderDone(createdOrder) }} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Amount */}
              <div className="text-center bg-emerald-50 rounded-2xl p-4">
                <p className="text-sm text-gray-500">ยอดที่ต้องชำระ</p>
                <p className="font-display text-4xl font-black text-emerald-600">{formatPrice(createdOrder.totalAmount)}</p>
              </div>

              {/* QR Code */}
              <div className="text-center">
                {shop.qrCodeUrl ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">สแกน QR Code ชำระเงิน</p>
                    <div className="inline-block p-3 bg-white border-2 border-gray-200 rounded-2xl">
                      <img src={shop.qrCodeUrl} alt="QR Code" className="w-52 h-52 object-contain" />
                    </div>
                    <p className="text-xs text-gray-400">{shop.promptpayName}</p>
                    <p className="text-sm font-bold text-gray-700">{shop.promptpayId}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-6 space-y-2">
                    <QrCode className="w-16 h-16 text-gray-300 mx-auto" />
                    <p className="font-bold text-gray-700">PromptPay</p>
                    <p className="text-xl font-black text-gray-900">{shop.promptpayId}</p>
                    <p className="text-sm text-gray-500">{shop.promptpayName}</p>
                    <p className="text-xs text-gray-400">โอนพร้อมเพย์ไปที่เบอร์นี้</p>
                  </div>
                )}
              </div>

              {/* Upload slip */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">📎 แนบสลิปการโอน</p>
                <input ref={slipRef} type="file" accept="image/*" className="hidden" onChange={handleSlipChange} />

                {slipPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-200">
                    <img src={slipPreview} alt="slip" className="w-full max-h-64 object-contain bg-gray-50" />
                    <button onClick={() => { setSlipFile(null); setSlipPreview('') }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => slipRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 hover:border-emerald-300 rounded-2xl p-6 flex flex-col items-center gap-2 transition-colors">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">คลิกเพื่อแนบสลิป</p>
                    <p className="text-xs text-gray-400">JPG, PNG ขนาดสูงสุด 10MB</p>
                  </button>
                )}

                {slipFile && (
                  <button onClick={handleUploadSlip} disabled={uploadingSlip}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                    {uploadingSlip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingSlip ? 'กำลังส่ง...' : 'ส่งสลิป'}
                  </button>
                )}

                <button onClick={() => { setShowPayment(false); setOrderDone(createdOrder) }}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
                  ส่งสลิปทีหลัง / ข้ามขั้นตอนนี้
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}