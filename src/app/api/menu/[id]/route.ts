import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.menuItem.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description || null,
      price: body.price,
      dailyLimit: body.dailyLimit,
      category: body.category || null,
      imageUrl: body.imageUrl || null,
      isAvailable: body.isAvailable,
      options: body.options ?? [],
      sizes: body.sizes?.length ? body.sizes : null,
    },
  })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.menuItem.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
