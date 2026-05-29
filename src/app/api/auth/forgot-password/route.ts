import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'กรุณาระบุอีเมล' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ success: true })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt }
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'dummy') {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'KhaoShop <noreply@khaoshop.com>',
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
    console.log(`[DEV] Reset URL: ${resetUrl}`)
  }

  return NextResponse.json({ success: true })
}