// ===================================================
// GET  /api/menu — ดึงเมนูทั้งหมดของร้านตัวเอง
// POST /api/menu — เพิ่มเมนูใหม่
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ดึงเมนูของร้านที่ login อยู่ เรียงล่าสุดขึ้นก่อน
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopId = (session.user as any).shopId
  const items = await prisma.menuItem.findMany({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

// เพิ่มเมนูใหม่ — ข้ามค่าที่เป็น array/object เปล่าเพื่อเก็บ null แทน
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.menuItem.create({
    data: {
      name: body.name,
      description: body.description || null,
      price: body.price,
      dailyLimit: body.dailyLimit,
      category: body.category || null,
      imageUrl: body.imageUrl || null,
      isAvailable: body.isAvailable ?? true,
      options: body.options ?? [],
      // ถ้าไม่มีข้อมูลให้ไม่เซฟ (undefined = ไม่แตะ field นี้)
      sizes: body.sizes?.length ? body.sizes : undefined,
      toppings: body.toppings?.length ? body.toppings : undefined,
      optionPrices: body.optionPrices && Object.keys(body.optionPrices).length ? body.optionPrices : undefined,
      shopId: body.shopId,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
