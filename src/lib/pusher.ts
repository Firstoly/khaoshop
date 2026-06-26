// ===================================================
// pusher.ts — ระบบแจ้งเตือน Real-time ด้วย Pusher
// แยกเป็น server-side (trigger) และ client-side (subscribe)
// ===================================================

import Pusher from 'pusher'
import PusherClient from 'pusher-js'

// Server-side: ใช้ trigger event ออกไปหา client
// เรียกใช้ใน API routes เท่านั้น
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

// Client-side: singleton — สร้างครั้งเดียวเพื่อป้องกัน connection ซ้ำ
let pusherClientInstance: PusherClient | null = null

// คืน Pusher client instance เดิมถ้ามีอยู่แล้ว
export function getPusherClient(): PusherClient {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
  }
  return pusherClientInstance
}

// ชื่อ event ที่ใช้ส่งระหว่าง server กับ client
export const PUSHER_EVENTS = {
  NEW_ORDER: 'new-order',
  ORDER_UPDATED: 'order-updated',
}

// channel แยกตามร้าน เพื่อให้แต่ละร้านรับ event ของตัวเองเท่านั้น
export function getShopChannel(shopId: string) {
  return `shop-${shopId}`
}
