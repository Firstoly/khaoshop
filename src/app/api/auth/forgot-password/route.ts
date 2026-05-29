import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'กรุณาระบุอีเมล' }, { status: 400 })

  // Always return success (don't reveal if email exists)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ success: true })

  // Generate token
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt }
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

  try {
    await resend.emails.send({
      from: 'KhaoShop <noreply@khaoshop.com>',
      to: email,
      subject: '🔐 รีเซ็ตรหัสผ่าน KhaoShop',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); padding: 16px; border-radius: 16px;">
              <span style="font-size: 32px;">🍱</span>
            </div>
            <h1 style="font-size: 24px; font-weight: bold; color: #1e293b; margin-top: 16px;">KhaoShop</h1>
          </div>
          <h2 style="font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">รีเซ็ตรหัสผ่าน</h2>
          <p style="color: #64748b; margin-bottom: 24px;">มีการขอรีเซ็ตรหัสผ่านสำหรับบัญชี <strong>${email}</strong> กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่</p>
          <a href="${resetUrl}" style="display: block; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 12px; font-weight: bold; font-size: 16px; margin-bottom: 24px;">
            🔐 ตั้งรหัสผ่านใหม่
          </a>
          <p style="color: #94a3b8; font-size: 12px;">ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง ถ้าไม่ได้ขอรีเซ็ต ไม่ต้องดำเนินการใดๆ</p>
          <p style="color: #cbd5e1; font-size: 11px; margin-top: 16px;">หรือคัดลอกลิงก์นี้: ${resetUrl}</p>
        </div>
      `
    })
  } catch (err) {
    console.error('Email send error:', err)
    // Don't fail if email fails - for dev environment
  }

  return NextResponse.json({ success: true })
}
