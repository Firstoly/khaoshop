// ===================================================
// POST /api/menu/[id]/soldout — กดหมดแล้ว
// ตั้ง soldCount = 999 เพื่อให้เมนูแสดงว่าหมด
// เมนูยังแสดงอยู่ในหน้าร้าน แต่สั่งไม่ได้
// cron จะรีเซ็ตกลับเป็น 0 อัตโนมัติตอนเที่ยงคืน
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 999 เกิน dailyLimit ทุก item → ระบบถือว่าหมด
  const item = await prisma.menuItem.update({
    where: { id: params.id },
    data: { soldCount: { set: 999 } },
  })
  return NextResponse.json(item)
}
