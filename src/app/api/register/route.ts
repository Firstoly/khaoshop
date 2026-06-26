// ===================================================
// POST /api/register — สมัครสมาชิกใหม่
// สร้าง User + Shop พร้อมกันในคำสั่งเดียว (nested create)
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// แปลงชื่อร้านเป็น URL slug — ถ้าเป็นภาษาไทยล้วนใช้ timestamp แทน
function slugify(text: string) {
  const latin = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')  // ลบอักขระพิเศษและภาษาไทย
    .replace(/\s+/g, '-')       // แทนช่องว่างด้วย -
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim()
  return latin.length >= 3 ? latin : `shop-${Date.now()}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, shopName } = body

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!name || !email || !password || !shopName) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 })
    }

    // เช็คว่า email ซ้ำหรือเปล่า
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ error: 'อีเมลนี้มีในระบบแล้ว' }, { status: 400 })
    }

    // hash password ก่อนเก็บ ไม่เก็บ plain text
    const hashed = await bcrypt.hash(password, 10)

    // สร้าง slug และเช็คซ้ำ ถ้าซ้ำเติม timestamp ต่อท้าย
    let slug = slugify(shopName)
    const existing = await prisma.shop.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

    // สร้าง User และ Shop พร้อมกันในคำสั่งเดียว (Prisma nested create)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        shop: {
          create: {
            slug,
            name: shopName,
            isOpen: true,
          },
        },
      },
      include: { shop: true },
    })

    return NextResponse.json({
      success: true,
      userId: user.id,
      shopSlug: user.shop?.slug,
    }, { status: 201 })
  } catch (err: any) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 })
  }
}
