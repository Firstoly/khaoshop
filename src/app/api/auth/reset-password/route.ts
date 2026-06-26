// ===================================================
// POST /api/auth/reset-password — ตั้งรหัสผ่านใหม่
// รับ token จาก URL และ password ใหม่จาก form
// ใช้ Transaction เพื่อให้เปลี่ยน password และ mark token พร้อมกัน
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()
  if (!token || !password) return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัว' }, { status: 400 })

  // หา token ในฐานข้อมูล
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

  // ตรวจสอบ 3 เงื่อนไข: มีอยู่จริง, ยังไม่ได้ใช้, ยังไม่หมดอายุ
  if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)

  // Transaction: เปลี่ยน password และ mark token ว่าใช้แล้วพร้อมกัน
  // ถ้าขั้นตอนใดล้มเหลว ทั้งคู่จะ rollback
  await prisma.$transaction([
    prisma.user.update({ where: { email: resetToken.email }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { token }, data: { used: true } }),
  ])

  return NextResponse.json({ success: true })
}
