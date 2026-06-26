// ===================================================
// PushManager — ขอสิทธิ์แจ้งเตือน Browser (Web Push)
// แสดง banner ถามครั้งแรก ถ้ากด dismiss จะไม่ถามอีก
// ต้อง register Service Worker ก่อนถึงจะ subscribe ได้
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { Bell, X, BellOff } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const DISMISSED_KEY = 'push_banner_dismissed'

// แปลง VAPID key จาก base64 → Uint8Array ที่ browser ต้องการ
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

// ลงทะเบียน Service Worker และบันทึก subscription ไว้ใน database
async function subscribeAndSave() {
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  // ใช้ subscription เดิมถ้ามีอยู่แล้ว ไม่ต้องสร้างใหม่
  const existing = await reg.pushManager.getSubscription()
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  // ส่ง subscription endpoint ไปเก็บใน database
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
}

export function PushManager() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    // ถ้าเคย dismiss หรือ granted แล้ว ไม่ต้องแสดง banner
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      subscribeAndSave().catch(() => {})
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return
    setShow(true)
  }, [])

  async function handleEnable() {
    setLoading(true)
    setMsg('')
    try {
      // iOS ต้องเพิ่มเป็น icon บนหน้าจอก่อนถึงจะใช้ Push ได้
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setMsg('กรุณากด "เพิ่มไปยังหน้าจอโฮม" ก่อนแล้วเปิดเว็บจาก icon นั้น')
        setLoading(false)
        return
      }
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        await subscribeAndSave()
        localStorage.setItem(DISMISSED_KEY, '1')
        setShow(false)
      } else {
        setMsg('กรุณาอนุญาตการแจ้งเตือนใน settings ของ browser')
      }
    } catch {
      setMsg('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง')
    }
    setLoading(false)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">เปิดการแจ้งเตือนออเดอร์</p>
            <p className="text-xs text-gray-400">รับแจ้งเตือนแม้ไม่ได้อยู่หน้านี้</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleEnable} disabled={loading}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
              {loading ? '...' : 'เปิด'}
            </button>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {msg && (
          <div className="flex items-start gap-2 bg-amber-500/20 rounded-xl px-3 py-2">
            <BellOff className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">{msg}</p>
          </div>
        )}
      </div>
    </div>
  )
}
