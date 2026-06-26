// ===================================================
// PUT    /api/menu/[id] — แก้ไขข้อมูลเมนู
// DELETE /api/menu/[id] — ลบเมนู
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// แก้ไขเมนู — อัปเดตทุก field รวมถึง sizes, toppings, options
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.menuItem.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description || null,
      price: body.price,
      dailyLimit: body.dailyLimit,
      category: body.category || null,
      imageUrl: body.imageUrl || null,
      isAvailable: body.isAvailable,
      options: body.options ?? [],
      // ถ้าส่งมาเป็น array เปล่า ให้เซฟเป็น null แทน
      sizes: body.sizes?.length ? body.sizes : null,
      toppings: body.toppings?.length ? body.toppings : null,
      optionPrices: body.optionPrices && Object.keys(body.optionPrices).length ? body.optionPrices : null,
    },
  })
  return NextResponse.json(item)
}

// ลบเมนู — Prisma จะลบ OrderItem ที่เกี่ยวข้องด้วยอัตโนมัติ (onDelete: Cascade)
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.menuItem.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
