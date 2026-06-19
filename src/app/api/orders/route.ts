import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pusherServer, PUSHER_EVENTS, getShopChannel } from '@/lib/pusher'
import { sendPushToUser } from '@/lib/webpush'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { shopId, customerName, customerPhone, customerAddress, note, items, paymentMethod } = body

  if (!shopId || !customerName || !customerPhone || !items?.length) {
    return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop?.isOpen) return NextResponse.json({ error: 'ร้านปิดชั่วคราว' }, { status: 400 })

  try {
    const order = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const menuItem = await tx.menuItem.findUnique({ where: { id: item.menuItemId } })
        if (!menuItem?.isAvailable) throw new Error(`เมนู "${menuItem?.name}" ไม่พร้อมจำหน่าย`)
        const remaining = menuItem.dailyLimit - menuItem.soldCount
        if (remaining < item.quantity) throw new Error(`"${menuItem.name}" เหลือเพียง ${remaining} ที่`)
      }

      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const todayCount = await tx.order.count({ where: { shopId, createdAt: { gte: todayStart } } })
      const totalAmount = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)

      const newOrder = await tx.order.create({
        data: {
          queueNumber: todayCount + 1,
          customerName, customerPhone,
          customerAddress: customerAddress || null,
          note: note || null,
          totalAmount,
          paymentMethod: paymentMethod || 'CASH',
          paymentStatus: 'PENDING',
          status: 'PENDING',
          shopId,
          items: {
            create: items.map((i: any) => ({
              menuItemId: i.menuItemId,
              quantity: i.quantity,
              price: i.price,
              selectedOption: i.selectedOption ?? null,
            })),
          },
        },
        include: { items: { include: { menuItem: true } } },
      })

      for (const item of items) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { soldCount: { increment: item.quantity } },
        })
      }

      return newOrder
    })

    // 🔔 Trigger Pusher notification
    try {
      await pusherServer.trigger(
        getShopChannel(shopId),
        PUSHER_EVENTS.NEW_ORDER,
        {
          orderId: order.id,
          queueNumber: order.queueNumber,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          itemCount: order.items.length,
          items: order.items.map((i: any) => ({
            name: i.menuItem.name,
            quantity: i.quantity,
          })),
          createdAt: order.createdAt,
        }
      )
    } catch (pusherErr) {
      console.error('Pusher error:', pusherErr)
    }

    // 🔔 Web Push notification
    try {
      const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { userId: true, name: true } })
      if (shop) {
        const subs = await prisma.pushSubscription.findMany({ where: { userId: shop.userId } })
        if (subs.length > 0) {
          const itemNames = order.items.map((i: any) => `${i.menuItem.name} ×${i.quantity}`).join(', ')
          await sendPushToUser(subs, {
            title: `🛎️ ออเดอร์ใหม่ #${String(order.queueNumber).padStart(3, '0')} — ${order.customerName}`,
            body: itemNames,
            url: '/dashboard/orders',
            tag: `order-${order.id}`,
            orderId: order.id,
            customerName: order.customerName,
            queueNumber: order.queueNumber,
            items: order.items.map((i: any) => ({ name: i.menuItem.name, quantity: i.quantity })),
          })
        }
      }
    } catch (pushErr) {
      console.error('Push error:', pushErr)
    }

    return NextResponse.json(order, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
