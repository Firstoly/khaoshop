'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart, Plus, Minus, X, Phone, UtensilsCrossed, ChefHat,
  CheckCircle, Loader2, Banknote, QrCode, Upload, StickyNote,
  ChevronLeft, Store,
} from 'lucide-react'
import { formatPrice, getStockStatus } from '@/lib/utils'
import { getPusherClient, PUSHER_EVENTS, getShopChannel } from '@/lib/pusher'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface SizeOption { name: string; price: number }
interface CartItem { menuItem: any; quantity: number; selectedOption?: string; price: number; cartKey: string }

const CATEGORIES_ORDER = ['ทั้งหมด', 'แกงและต้ม', 'ผัด', 'ทอดและอบ', 'ยำและสลัด', 'ข้าว', 'เครื่องดื่ม', 'อื่นๆ']
const CAT_EMOJI: Record<string, string> = {
  'ทั้งหมด': '🍽️', 'แกงและต้ม': '🍲', 'ผัด': '🥘', 'ทอดและอบ': '🍗',
  'ยำและสลัด': '🥗', 'ข้าว': '🍚', 'เครื่องดื่ม': '🧋', 'อื่นๆ': '✨',
}

export function StoreClient({ shop, menuItems }: { shop: any; menuItems: any[] }) {
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [catFilter, setCatFilter] = useState('ทั้งหมด')
  const [optionModal, setOptionModal] = useState<any | null>(null)
  const [modalSize, setModalSize] = useState<SizeOption | null>(null)
  const [modalOption, setModalOption] = useState<string>('')
  const [modalToppings, setModalToppings] = useState<SizeOption[]>([])

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe(getShopChannel(shop.id))
    channel.bind(PUSHER_EVENTS.NEW_ORDER, () => { router.refresh() })
    return () => {
      channel.unbind_all()
      pusher.unsubscribe(getShopChannel(shop.id))
    }
  }, [shop.id, router])

  const [step, setStep] = useState<'menu' | 'cart' | 'form' | 'done'>('menu')
  const [orderDone, setOrderDone] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '', paymentMethod: 'CASH' })
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState('')
  const slipRef = useRef<HTMLInputElement>(null)

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map(m => m.category ?? 'อื่นๆ'))
    return ['ทั้งหมด', ...CATEGORIES_ORDER.slice(1).filter(c => cats.has(c))]
  }, [menuItems])

  const filtered = catFilter === 'ทั้งหมด' ? menuItems : menuItems.filter(m => (m.category ?? 'อื่นๆ') === catFilter)
  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)
  const canSubmit = form.paymentMethod === 'CASH' || (form.paymentMethod === 'PROMPTPAY' && slipFile !== null)

  function addToCartWithOption(item: any, selectedOption?: string, price?: number) {
    const actualPrice = price ?? item.price
    const stock = getStockStatus(item.dailyLimit, item.soldCount)
    const totalInCart = cart.filter(c => c.menuItem.id === item.id).reduce((s, c) => s + c.quantity, 0)
    if (totalInCart >= stock.remaining) { toast.error('สินค้าหมดแล้ว'); return }
    const key = `${item.id}::${selectedOption ?? ''}`
    setCart(prev => {
      const ex = prev.find(c => c.cartKey === key)
      if (ex) return prev.map(c => c.cartKey === key ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItem: item, quantity: 1, selectedOption, price: actualPrice, cartKey: key }]
    })
    const newTotal = totalInCart + 1
    if (stock.remaining - newTotal === 0) toast('นี่คือที่สุดท้ายแล้ว! 🔥', { icon: '⚠️' })
    else if (stock.remaining - newTotal <= 2) toast(`เหลืออีกแค่ ${stock.remaining - newTotal} ที่เท่านั้น`, { icon: '⚡' })
  }

  function addToCart(item: any) {
    const hasSizes = item.sizes?.length > 0
    const hasToppings = item.toppings?.length > 0
    const hasOptions = item.options?.length > 0
    if (hasSizes || hasToppings || hasOptions) { setOptionModal(item); return }
    addToCartWithOption(item, undefined, item.price)
  }

  function closeModal() {
    setOptionModal(null)
    setModalSize(null)
    setModalOption('')
    setModalToppings([])
  }

  function removeFromCart(cartKey: string) {
    setCart(prev => {
      const ex = prev.find(c => c.cartKey === cartKey)
      if (!ex) return prev
      if (ex.quantity === 1) return prev.filter(c => c.cartKey !== cartKey)
      return prev.map(c => c.cartKey === cartKey ? { ...c, quantity: c.quantity - 1 } : c)
    })
  }

  function handleSlipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('ไฟล์ใหญ่เกิน 10MB'); return }
    setSlipFile(file)
    setSlipPreview(URL.createObjectURL(file))
  }

  function clearSlip() {
    setSlipFile(null)
    setSlipPreview('')
    if (slipRef.current) slipRef.current.value = ''
  }

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!cart.length) { toast.error('กรุณาเพิ่มอาหารก่อน'); return }
    if (form.paymentMethod === 'PROMPTPAY' && !slipFile) { toast.error('กรุณาแนบสลิปก่อนครับ'); return }
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
          items: cart.map(c => ({ menuItemId: c.menuItem.id, quantity: c.quantity, price: c.price, selectedOption: c.selectedOption ?? null })),
        }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const order = await res.json()

      if (form.paymentMethod === 'PROMPTPAY' && slipFile) {
        const fd = new FormData()
        fd.append('file', slipFile)
        await fetch(`/api/orders/${order.id}/slip`, { method: 'POST', body: fd })
      }

      setOrderDone(order)
      setCart([])
      clearSlip()
      setStep('done')
    } catch (err: any) {
      toast.error(err.message ?? 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  // ========== DONE SCREEN ==========
  if (step === 'done' && orderDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center animate-bounce-in">
          <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
          <h1 className="font-display text-3xl font-black text-gray-900 mb-2">สั่งซื้อสำเร็จ!</h1>
          <p className="text-gray-500 mb-8">ทางร้านได้รับออเดอร์ของคุณแล้ว</p>

          <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 border border-gray-100">
            <p className="text-gray-500 text-sm mb-2">หมายเลขคิวของคุณ</p>
            <p className="font-display text-8xl font-black text-brand-500 leading-none mb-4">
              {String(orderDone.queueNumber).padStart(3, '0')}
            </p>
            <div className="h-px bg-gray-100 mb-4" />
            <div className={cn(
              'flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold',
              orderDone.paymentMethod === 'CASH'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
            )}>
              {orderDone.paymentMethod === 'CASH'
                ? <><Banknote className="w-5 h-5" /> ชำระเงินสด {formatPrice(orderDone.totalAmount)}</>
                : <><QrCode className="w-5 h-5" /> ส่งสลิปแล้ว — รอร้านยืนยัน</>
              }
            </div>
            <p className="text-xs text-gray-400 mt-3">ร้านจะเตรียมอาหารให้ทันที</p>
          </div>

          <button
            onClick={() => { setOrderDone(null); setStep('menu'); setForm({ name: '', phone: '', address: '', note: '', paymentMethod: 'CASH' }) }}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-lg shadow-lg transition-colors"
          >
            กลับหน้าเมนู
          </button>
        </div>
      </div>
    )
  }

  // ========== FORM SCREEN ==========
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => setStep('cart')} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-display text-lg font-bold text-gray-900">ข้อมูลผู้สั่ง</h1>
              <p className="text-xs text-gray-400">กรอกข้อมูลเพื่อยืนยันออเดอร์</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleOrder} className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-32">
          <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-black">1</span>
              ข้อมูลผู้สั่ง
            </h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อ *</label>
              <input
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:border-brand-400 text-base"
                placeholder="กรอกชื่อจริง หรือ ชื่อเล่น" required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">เบอร์โทรศัพท์ *</label>
              <input
                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:border-brand-400 text-base"
                placeholder="08X-XXX-XXXX" type="tel" required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <StickyNote className="w-4 h-4 inline mr-1 text-gray-400" />หมายเหตุ
              </label>
              <input
                value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                className="w-full px-4 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:outline-none focus:border-brand-400 text-base"
                placeholder="ไม่ระบุก็ได้"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-black">2</span>
              วิธีชำระเงิน
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setForm({ ...form, paymentMethod: 'CASH' }); clearSlip() }}
                className={cn(
                  'flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all',
                  form.paymentMethod === 'CASH'
                    ? 'border-amber-400 bg-amber-50 shadow-md'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                )}
              >
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-3xl',
                  form.paymentMethod === 'CASH' ? 'bg-amber-100' : 'bg-white border border-gray-200')}>
                  💵
                </div>
                <div className="text-center">
                  <p className={cn('font-bold text-base', form.paymentMethod === 'CASH' ? 'text-amber-700' : 'text-gray-700')}>เงินสด</p>
                  <p className="text-xs text-gray-400 mt-0.5">ชำระเมื่อรับของ</p>
                </div>
                {form.paymentMethod === 'CASH' && (
                  <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!shop.promptpayId) { toast.error('ร้านนี้ยังไม่เปิดรับ QR'); return }
                  setForm({ ...form, paymentMethod: 'PROMPTPAY' })
                }}
                className={cn(
                  'flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all',
                  form.paymentMethod === 'PROMPTPAY'
                    ? 'border-emerald-400 bg-emerald-50 shadow-md'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300',
                  !shop.promptpayId && 'opacity-40 cursor-not-allowed'
                )}
              >
                <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-3xl',
                  form.paymentMethod === 'PROMPTPAY' ? 'bg-emerald-100' : 'bg-white border border-gray-200')}>
                  📱
                </div>
                <div className="text-center">
                  <p className={cn('font-bold text-base', form.paymentMethod === 'PROMPTPAY' ? 'text-emerald-700' : 'text-gray-700')}>สแกน QR</p>
                  <p className="text-xs text-gray-400 mt-0.5">PromptPay</p>
                </div>
                {form.paymentMethod === 'PROMPTPAY' && (
                  <div className="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            </div>

            {form.paymentMethod === 'PROMPTPAY' && (
              <div className="bg-emerald-50 rounded-2xl p-5 space-y-4 border border-emerald-100">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">ยอดที่ต้องโอน</p>
                  <p className="font-display text-4xl font-black text-emerald-600">{formatPrice(cartTotal)}</p>
                </div>

                {shop.qrCodeUrl ? (
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-gray-600">สแกน QR เพื่อโอนเงิน</p>
                    <div className="inline-block p-3 bg-white rounded-2xl border-2 border-emerald-200 shadow-sm">
                      <div className="relative w-48 h-48">
                        <Image src={shop.qrCodeUrl} alt="QR" fill className="object-contain" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">{shop.promptpayName}</p>
                    <p className="text-base font-bold text-emerald-700">{shop.promptpayId}</p>
                  </div>
                ) : (
                  <div className="text-center bg-white rounded-2xl p-5 border border-emerald-200">
                    <p className="text-xl font-black text-gray-800">{shop.promptpayId}</p>
                    <p className="text-sm text-gray-500 mt-1">{shop.promptpayName}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    📎 แนบสลิปการโอนเงิน <span className="text-red-500">*</span>
                  </p>
                  <input ref={slipRef} type="file" accept="image/*" className="hidden" onChange={handleSlipChange} />
                  {slipPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-300">
                      <img src={slipPreview} alt="slip" className="w-full max-h-56 object-contain bg-white" />
                      <button type="button" onClick={clearSlip}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        ✓ แนบสลิปแล้ว
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => slipRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-emerald-300 hover:border-emerald-400 bg-white rounded-2xl flex flex-col items-center gap-2 transition-colors">
                      <Upload className="w-8 h-8 text-emerald-400" />
                      <p className="text-base font-semibold text-gray-700">กดเพื่ออัปโหลดสลิป</p>
                      <p className="text-sm text-gray-400">JPG, PNG สูงสุด 10MB</p>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-black">3</span>
              สรุปออเดอร์
            </h2>
            <div className="space-y-3">
              {cart.map(c => (
                <div key={c.cartKey} className="flex items-center gap-3 py-2">
                  {c.menuItem.imageUrl && (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <Image src={c.menuItem.imageUrl} alt={c.menuItem.name} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{c.menuItem.name}</p>
                    {c.selectedOption && (
                      <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">{c.selectedOption}</span>
                    )}
                    <p className="text-xs text-gray-400">{formatPrice(c.price)} × {c.quantity}</p>
                  </div>
                  <p className="font-bold text-gray-900">{formatPrice(c.price * c.quantity)}</p>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="font-bold text-gray-900 text-lg">รวมทั้งหมด</span>
                <span className="font-display text-2xl font-black text-brand-500">{formatPrice(cartTotal)}</span>
              </div>
            </div>
          </div>
        </form>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 safe-area-pb">
          <div className="max-w-lg mx-auto">
            <button
              type="submit"
              form=""
              onClick={handleOrder as any}
              disabled={loading || !canSubmit || !form.name || !form.phone}
              className={cn(
                'w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg',
                canSubmit && form.name && form.phone
                  ? 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังส่งออเดอร์...</>
                : !form.name || !form.phone
                  ? 'กรอกข้อมูลให้ครบก่อนครับ'
                  : form.paymentMethod === 'PROMPTPAY' && !slipFile
                    ? '⚠️ กรุณาแนบสลิปก่อน'
                    : <><CheckCircle className="w-5 h-5" /> ยืนยันสั่งอาหาร {formatPrice(cartTotal)}</>
              }
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== CART SCREEN ==========
  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => setStep('menu')} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-lg font-bold text-gray-900">ตะกร้าของคุณ</h1>
              <p className="text-xs text-gray-400">{cartCount} รายการ</p>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-3 pb-36">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">ตะกร้าว่างเปล่า</p>
              <p className="text-sm mt-1">กลับไปเลือกอาหารก่อนนะครับ</p>
            </div>
          ) : (
            cart.map(c => {
              const stock = getStockStatus(c.menuItem.dailyLimit, c.menuItem.soldCount)
              const totalInCart = cart.filter(x => x.menuItem.id === c.menuItem.id).reduce((s, x) => s + x.quantity, 0)
              return (
                <div key={c.cartKey} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl bg-orange-50 shrink-0 overflow-hidden">
                    {c.menuItem.imageUrl
                      ? <Image src={c.menuItem.imageUrl} alt={c.menuItem.name} fill className="object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-8 h-8 text-gray-200" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-base">{c.menuItem.name}</p>
                    {c.selectedOption && (
                      <span className="inline-block mt-0.5 text-[11px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                        {c.selectedOption}
                      </span>
                    )}
                    <p className="text-brand-500 font-bold text-sm mt-1">{formatPrice(c.price)}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => removeFromCart(c.cartKey)}
                        className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="text-lg font-black text-gray-900 w-6 text-center">{c.quantity}</span>
                      <button
                        onClick={() => addToCartWithOption(c.menuItem, c.selectedOption, c.price)}
                        disabled={totalInCart >= stock.remaining}
                        className="w-9 h-9 bg-brand-500 hover:bg-brand-600 rounded-xl flex items-center justify-center text-white transition-colors disabled:opacity-40"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="font-black text-gray-900 text-base shrink-0">{formatPrice(c.price * c.quantity)}</p>
                </div>
              )
            })
          )}

          {cart.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-base">รวมทั้งหมด</span>
                <span className="font-display text-3xl font-black text-brand-500">{formatPrice(cartTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
            <div className="max-w-lg mx-auto">
              <button
                onClick={() => setStep('form')}
                className="w-full py-5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:from-brand-600 hover:to-brand-700 transition-all flex items-center justify-center gap-2"
              >
                กรอกข้อมูลและสั่งอาหาร →
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ========== MENU SCREEN ==========
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 overflow-hidden">
        {shop.coverUrl && (
          <Image src={shop.coverUrl} alt="cover" fill className="object-cover opacity-20" />
        )}
        <div className="relative px-4 pt-10 pb-8 max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg overflow-hidden shrink-0 border-2 border-white/30">
              {shop.logoUrl
                ? <Image src={shop.logoUrl} alt={shop.name} fill className="object-cover" />
                : <ChefHat className="w-10 h-10 text-white" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-black text-white leading-tight">{shop.name}</h1>
              {shop.description && (
                <p className="text-white/80 text-sm mt-1 line-clamp-2">{shop.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {shop.phone && (
                  <span className="flex items-center gap-1.5 text-white/80 text-xs bg-white/10 px-2.5 py-1 rounded-full">
                    <Phone className="w-3 h-3" />{shop.phone}
                  </span>
                )}
                <span className={cn(
                  'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold',
                  shop.isOpen ? 'bg-emerald-400/30 text-emerald-100' : 'bg-red-400/30 text-red-100'
                )}>
                  <Store className="w-3 h-3" />
                  {shop.isOpen ? 'เปิดอยู่' : 'ปิดชั่วคราว'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto pb-36">
        {categories.length > 1 && (
          <div className="px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 transition-all',
                    catFilter === cat
                      ? 'bg-brand-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <span>{CAT_EMOJI[cat] ?? '🍴'}</span>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          {filtered.map(item => {
            const stock = getStockStatus(item.dailyLimit, item.soldCount)
            const inCart = cart.filter(c => c.menuItem.id === item.id).reduce((s, c) => s + c.quantity, 0)
            const soldOut = stock.remaining === 0
            const hasSizes = item.sizes?.length > 0
            const sizeMin = hasSizes ? Math.min(...item.sizes.map((s: SizeOption) => s.price)) : item.price
            const sizeMax = hasSizes ? Math.max(...item.sizes.map((s: SizeOption) => s.price)) : item.price

            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col transition-all',
                  soldOut ? 'opacity-60' : 'hover:shadow-md'
                )}
              >
                <div className="relative aspect-square bg-orange-50">
                  {item.imageUrl
                    ? <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed className="w-10 h-10 text-gray-200" />
                      </div>
                  }
                  {soldOut && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">หมดแล้ว</span>
                    </div>
                  )}
                  {!soldOut && stock.remaining <= 3 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white text-xs font-bold py-1.5 text-center animate-pulse">
                      ⚠️ เหลือเพียง {stock.remaining} ที่เท่านั้น!
                    </div>
                  )}
                  {!soldOut && stock.remaining > 3 && stock.remaining <= 10 && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
                      เหลือ {stock.remaining}
                    </div>
                  )}
                  {inCart > 0 && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-brand-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                      {inCart}
                    </div>
                  )}
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-display font-black text-brand-500 text-base">
                      {hasSizes
                        ? sizeMin === sizeMax ? formatPrice(sizeMin) : `฿${sizeMin}–${sizeMax}`
                        : formatPrice(item.price)
                      }
                    </span>
                    {!soldOut && (
                      inCart > 0 && !item.options?.length && !hasSizes ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => removeFromCart(`${item.id}::`)}
                            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                          <span className="w-5 text-center text-sm font-black text-brand-500">{inCart}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-8 h-8 bg-brand-500 hover:bg-brand-600 rounded-xl flex items-center justify-center text-white transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-9 h-9 bg-brand-500 hover:bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-sm transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400 px-4">
            <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">ไม่มีเมนูในหมวดนี้</p>
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setStep('cart')}
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white py-5 rounded-2xl shadow-2xl flex items-center px-5 transition-all hover:from-brand-600 hover:to-brand-700 active:scale-95"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-black text-base leading-tight">ดูตะกร้า</p>
                <p className="text-white/80 text-xs">{cartCount} รายการ</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display font-black text-xl">{formatPrice(cartTotal)}</p>
            </div>
          </button>
        </div>
      )}

      {/* ── Size + Topping + Option picker modal ── */}
      {optionModal && (() => {
        const hasSizes = optionModal.sizes?.length > 0
        const hasToppings = optionModal.toppings?.length > 0
        const hasOptions = optionModal.options?.length > 0
        const needsConfirm = hasSizes || hasToppings

        const basePrice = modalSize?.price ?? optionModal.price
        const toppingsTotal = modalToppings.reduce((s, t) => s + t.price, 0)
        const totalPrice = basePrice + toppingsTotal

        function confirm() {
          if (hasSizes && !modalSize) { toast.error('กรุณาเลือกขนาดก่อน'); return }
          const parts = [
            modalSize?.name,
            modalToppings.length > 0 ? modalToppings.map(t => t.name).join(', ') : undefined,
            modalOption || undefined,
          ].filter(Boolean)
          addToCartWithOption(optionModal, parts.join(' / ') || undefined, totalPrice)
          closeModal()
        }

        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={closeModal}>
            <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-5 animate-bounce-in max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-gray-900">{optionModal.name}</h3>
                  <p className="text-sm text-gray-400">
                    {[hasSizes && 'เลือกขนาด', hasToppings && 'ท็อปปิ้ง', hasOptions && !needsConfirm && 'เลือก 1 ตัวเลือก'].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={closeModal} className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Size selection */}
              {hasSizes && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2.5">ขนาด <span className="text-red-500">*</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    {optionModal.sizes.map((s: SizeOption) => (
                      <button key={s.name} type="button" onClick={() => setModalSize(s)}
                        className={cn(
                          'py-3 px-4 rounded-2xl border-2 font-bold text-sm transition-all text-left',
                          modalSize?.name === s.name
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300'
                        )}>
                        <p className="text-base">{s.name}</p>
                        <p className={cn('font-black text-lg', modalSize?.name === s.name ? 'text-brand-500' : 'text-gray-900')}>
                          {formatPrice(s.price)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Topping selection */}
              {hasToppings && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2.5">
                    ท็อปปิ้ง <span className="text-gray-400 font-normal">(เลือกได้หลายอย่าง)</span>
                  </p>
                  <div className="space-y-2">
                    {optionModal.toppings.map((t: SizeOption) => {
                      const selected = modalToppings.some(x => x.name === t.name)
                      return (
                        <button key={t.name} type="button"
                          onClick={() => setModalToppings(prev =>
                            selected ? prev.filter(x => x.name !== t.name) : [...prev, t]
                          )}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all',
                            selected ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-brand-300'
                          )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                              selected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                            )}>
                              {selected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span className={cn('font-semibold text-sm', selected ? 'text-brand-700' : 'text-gray-700')}>{t.name}</span>
                          </div>
                          <span className={cn('font-bold text-sm', selected ? 'text-brand-500' : 'text-gray-400')}>
                            +{formatPrice(t.price)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Option selection */}
              {hasOptions && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2.5">
                    ตัวเลือก {needsConfirm && <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {optionModal.options.map((opt: string) => (
                      <button key={opt} type="button"
                        onClick={() => {
                          if (needsConfirm) {
                            setModalOption(prev => prev === opt ? '' : opt)
                          } else {
                            addToCartWithOption(optionModal, opt, optionModal.price)
                            closeModal()
                          }
                        }}
                        className={cn(
                          'py-3 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95',
                          needsConfirm
                            ? modalOption === opt
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-brand-300'
                            : 'border-brand-200 bg-brand-50 hover:border-brand-500 hover:bg-brand-100 text-brand-700'
                        )}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {!needsConfirm && <p className="text-center text-xs text-gray-400 mt-3">แตะตัวเลือกเพื่อเพิ่มลงตะกร้า</p>}
                </div>
              )}

              {/* Price breakdown (when toppings selected) */}
              {needsConfirm && modalToppings.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>ราคาฐาน{modalSize ? ` (${modalSize.name})` : ''}</span>
                    <span>{formatPrice(basePrice)}</span>
                  </div>
                  {modalToppings.map(t => (
                    <div key={t.name} className="flex justify-between text-sm text-gray-500">
                      <span>+ {t.name}</span>
                      <span className="text-brand-500 font-semibold">+{formatPrice(t.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                    <span>รวม</span>
                    <span className="text-brand-500">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              )}

              {/* Confirm button */}
              {needsConfirm && (
                <button onClick={confirm} disabled={hasSizes && !modalSize}
                  className={cn(
                    'w-full py-4 rounded-2xl font-bold text-base transition-all',
                    hasSizes && !modalSize
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-brand-500 hover:bg-brand-600 text-white active:scale-95'
                  )}>
                  {hasSizes && !modalSize ? 'กรุณาเลือกขนาดก่อน' : `เพิ่มลงตะกร้า — ${formatPrice(totalPrice)}`}
                </button>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
