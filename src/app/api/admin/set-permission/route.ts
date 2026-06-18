import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_KEYS = ['canMenu', 'canOrders', 'canKitchen', 'canDebt', 'canAnalytics', 'canSettings', 'showMenuOptions']

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, key, value } = await req.json()
  if (!userId || !ALLOWED_KEYS.includes(key) || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  await prisma.userPermission.upsert({
    where: { userId },
    update: { [key]: value },
    create: { userId, [key]: value },
  })

  return NextResponse.json({ ok: true })
}
