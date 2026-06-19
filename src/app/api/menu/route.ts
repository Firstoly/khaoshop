import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopId = (session.user as any).shopId
  const items = await prisma.menuItem.findMany({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.menuItem.create({
    data: {
      name: body.name,
      description: body.description || null,
      price: body.price,
      dailyLimit: body.dailyLimit,
      category: body.category || null,
      imageUrl: body.imageUrl || null,
      isAvailable: body.isAvailable ?? true,
      options: body.options ?? [],
      sizes: body.sizes?.length ? body.sizes : undefined,
      toppings: body.toppings?.length ? body.toppings : undefined,
      shopId: body.shopId,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
