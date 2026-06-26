// ===================================================
// POST /api/admin/set-shop-type — ตั้งประเภทร้าน
// เรียกจาก ShopTypeSelect ในหน้า admin/permissions
// shopType เก็บเป็น comma-separated เช่น "ร้านเครื่องดื่ม,ร้านอาหาร"
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, shopType } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  // ถ้าไม่เลือกประเภทเลย ให้เซฟเป็น null
  await prisma.shop.update({
    where: { userId },
    data: { shopType: shopType || null },
  })

  return NextResponse.json({ ok: true })
}
