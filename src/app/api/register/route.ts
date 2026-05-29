import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

function slugify(text: string) {
  // Handle Thai characters by using timestamp fallback
  const latin = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim()
  return latin.length >= 3 ? latin : `shop-${Date.now()}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, shopName } = body

    if (!name || !email || !password || !shopName) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ error: 'อีเมลนี้มีในระบบแล้ว' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)

    // Generate unique slug
    let slug = slugify(shopName)
    const existing = await prisma.shop.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now()}`

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
