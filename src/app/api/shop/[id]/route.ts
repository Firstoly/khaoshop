import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const shop = await prisma.shop.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description || null,
      phone: body.phone || null,
      address: body.address || null,
      isOpen: body.isOpen,
      showKitchen: body.showKitchen ?? true,
      showMenuOptions: body.showMenuOptions ?? true,
      logoUrl: body.logoUrl || null,
      promptpayId: body.promptpayId || null,
      promptpayName: body.promptpayName || null,
      qrCodeUrl: body.qrCodeUrl || null,
    },
  })
  return NextResponse.json(shop)
}
