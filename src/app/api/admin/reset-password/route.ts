// ===================================================
// POST /api/admin/reset-password — Admin รีเซ็ตรหัสผ่าน user
// เรียกจาก ResetPasswordModal ในหน้า admin/users
// Admin กรอก password ใหม่โดยตรง ไม่ต้องส่งอีเมล
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, password } = await req.json()
  if (!userId || !password || password.length < 6) {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }

  // hash password ก่อนบันทึก cost=10 สมดุลระหว่างความปลอดภัยและความเร็ว
  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
