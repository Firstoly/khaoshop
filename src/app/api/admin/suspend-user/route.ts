// ===================================================
// POST /api/admin/suspend-user — ระงับ/ปลดระงับบัญชี
// เรียกจาก SuspendButton ในหน้า admin/users
// ถ้า isSuspended = true → user login ไม่ได้
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

  const { userId, suspended } = await req.json()
  if (!userId || typeof suspended !== 'boolean') {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  // toggle ค่า isSuspended ตาม suspended ที่ส่งมา
  await prisma.user.update({
    where: { id: userId },
    data: { isSuspended: suspended },
  })

  return NextResponse.json({ ok: true })
}
