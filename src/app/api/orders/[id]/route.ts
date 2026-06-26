// ===================================================
// GET  /api/orders/[id] — ดูรายละเอียดออเดอร์
// PUT  /api/orders/[id] — อัปเดต status / การชำระเงิน
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ดึงข้อมูลออเดอร์ — ใครก็เรียกได้ (ลูกค้าใช้ tracking)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: { include: { menuItem: true } } },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

// อัปเดตสถานะออเดอร์ — ต้อง login เท่านั้น
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as any).role
  const shopId = (session.user as any).shopId

  // ดึงออเดอร์เดิมพร้อม items เพื่อใช้คืน soldCount ตอนยกเลิก
  const existing = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // SUPER_ADMIN จัดการออเดอร์ได้ทุกร้าน, USER ทำได้แค่ร้านตัวเอง
  if (userRole !== 'SUPER_ADMIN' && existing.shopId !== shopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const data: any = {}
  if (body.status) data.status = body.status
  if (body.paymentStatus) data.paymentStatus = body.paymentStatus
  if (body.paymentSlipUrl) data.paymentSlipUrl = body.paymentSlipUrl

  // ปฏิเสธสลิป → ล้างรูปสลิปและตั้งสถานะเป็น REJECTED
  if (body.rejectSlip) {
    data.paymentStatus = 'REJECTED'
    data.paymentSlipUrl = null
  }

  // ยกเลิกออเดอร์ → คืน soldCount ให้กลับแต่ละเมนู
  if (body.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
    await prisma.$transaction(
      existing.items.map(item =>
        prisma.menuItem.updateMany({
          where: { id: item.menuItemId, soldCount: { gte: item.quantity } },
          data: { soldCount: { decrement: item.quantity } },
        })
      )
    )
  }

  // กู้คืนออเดอร์ที่ยกเลิกไปแล้ว → หัก soldCount ใหม่
  if (existing.status === 'CANCELLED' && body.status && body.status !== 'CANCELLED') {
    await prisma.$transaction(
      existing.items.map(item =>
        prisma.menuItem.update({
          where: { id: item.menuItemId },
          data: { soldCount: { increment: item.quantity } },
        })
      )
    )
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data,
    include: { items: { include: { menuItem: true } } },
  })
  return NextResponse.json(order)
}
