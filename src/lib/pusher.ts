import Pusher from 'pusher'
import PusherClient from 'pusher-js'

// Server-side Pusher
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

// Client-side Pusher (singleton)
let pusherClientInstance: PusherClient | null = null

export function getPusherClient(): PusherClient {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
  }
  return pusherClientInstance
}

export const PUSHER_EVENTS = {
  NEW_ORDER: 'new-order',
  ORDER_UPDATED: 'order-updated',
}

export function getShopChannel(shopId: string) {
  return `shop-${shopId}`
}
