import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

function makeSlug(email: string): string {
  const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12) || 'shop'
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, email, password, shopName, shopType } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบ' }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return NextResponse.json({ error: 'อีเมลนี้มีในระบบแล้ว' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      ...(shopName && {
        shop: {
          create: {
            name: shopName,
            slug: makeSlug(email),
            shopType: shopType || null,
          },
        },
      }),
    },
  })

  return NextResponse.json({ ok: true, userId: user.id })
}
