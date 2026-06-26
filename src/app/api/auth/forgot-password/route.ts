// ===================================================
// POST /api/auth/forgot-password — ขอลิงก์รีเซ็ตรหัสผ่าน
// สร้าง token แบบสุ่ม → ส่งลิงก์ทาง email ผ่าน Resend
// ถ้าไม่มี RESEND_API_KEY จะแสดง URL ใน console แทน
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'กรุณาระบุอีเมล' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  // คืน success ทั้งที่ email ไม่มีในระบบ เพื่อป้องกัน email enumeration attack
  if (!user) return NextResponse.json({ success: true })

  // สร้าง token แบบสุ่ม 64 ตัวอักษร (hex) หมดอายุใน 1 ชั่วโมง
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt }
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  // ส่งอีเมลจริงเมื่อมี RESEND_API_KEY
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'dummy') {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'KhaoShop <onboarding@resend.dev>',
        to: email,
        subject: '🔐 รีเซ็ตรหัสผ่าน KhaoShop',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
            <h1 style="color:#1e293b;">KhaoShop 🍱</h1>
            <h2 style="color:#1e293b;">รีเซ็ตรหัสผ่าน</h2>
            <p style="color:#64748b;">มีการขอรีเซ็ตรหัสผ่านสำหรับบัญชี <strong>${email}</strong></p>
            <a href="${resetUrl}" style="display:block;background:#f97316;color:white;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;font-weight:bold;margin:24px 0;">
              🔐 ตั้งรหัสผ่านใหม่
            </a>
            <p style="color:#94a3b8;font-size:12px;">ลิงก์หมดอายุใน 1 ชั่วโมง</p>
            <p style="color:#cbd5e1;font-size:11px;">หรือคัดลอก: ${resetUrl}</p>
          </div>
        `
      })
    } catch (err) {
      console.error('Email error:', err)
    }
  } else {
    // Development mode — แสดง URL ใน console แทนส่งอีเมล
    console.log(`[DEV] Reset URL: ${resetUrl}`)
  }

  return NextResponse.json({ success: true })
}
