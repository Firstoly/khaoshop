// ===================================================
// POST /api/admin/set-permission — เปิด/ปิดสิทธิ์แต่ละเมนู
// เรียกจาก PermissionToggle ในหน้า admin/permissions
// ใช้ upsert เพราะ user อาจยังไม่มี permission record
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// key ที่อนุญาตให้เปลี่ยนได้ ป้องกัน key แปลกปลอม
const ALLOWED_KEYS = ['canMenu', 'canOrders', 'canKitchen', 'canDebt', 'canAnalytics', 'canSettings', 'showMenuOptions']

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, key, value } = await req.json()
  if (!userId || !ALLOWED_KEYS.includes(key) || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  // upsert = update ถ้ามีอยู่แล้ว, create ถ้ายังไม่มี
  await prisma.userPermission.upsert({
    where: { userId },
    update: { [key]: value },
    create: { userId, [key]: value },
  })

  return NextResponse.json({ ok: true })
}
