'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

async function subscribeAndSave() {
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
}

export function PushManager() {
  const [status, setStatus] = useState<'unknown' | 'banner' | 'granted' | 'denied' | 'unsupported'>('unknown')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported'); return
    }
    const perm = Notification.permission
    if (perm === 'granted') {
      // Already granted — just register silently
      subscribeAndSave().catch(() => {})
      setStatus('granted')
    } else if (perm === 'denied') {
      setStatus('denied')
    } else {
      setStatus('banner')
    }
  }, [])

  async function handleEnable() {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      try { await subscribeAndSave() } catch (e) { console.error(e) }
      setStatus('granted')
    } else {
      setStatus('denied')
    }
  }

  if (status !== 'banner') return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">เปิดการแจ้งเตือนออเดอร์</p>
          <p className="text-xs text-gray-400">รับแจ้งเตือนแม้ไม่ได้อยู่หน้านี้</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleEnable}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
          >
            เปิด
          </button>
          <button onClick={() => setStatus('granted')} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
