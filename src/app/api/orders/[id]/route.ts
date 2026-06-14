import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: { include: { menuItem: true } } },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shopId = (session.user as any).shopId

  const existing = await prisma.order.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.shopId !== shopId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const data: any = {}
  if (body.status) data.status = body.status
  if (body.paymentStatus) data.paymentStatus = body.paymentStatus
  if (body.paymentSlipUrl) data.paymentSlipUrl = body.paymentSlipUrl

  const order = await prisma.order.update({
    where: { id: params.id },
    data,
    include: { items: { include: { menuItem: true } } },
  })
  return NextResponse.json(order)
}
