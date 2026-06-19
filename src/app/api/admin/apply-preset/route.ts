import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const PRESETS: Record<string, {
  permissions: Record<string, boolean>
  showKitchen: boolean
}> = {
  drink: {
    permissions: {
      canMenu: true, canOrders: true, canKitchen: true,
      canDebt: true, canAnalytics: true, canSettings: true,
      showMenuOptions: true,
    },
    showKitchen: true,
  },
  food: {
    permissions: {
      canMenu: true, canOrders: true, canKitchen: true,
      canDebt: true, canAnalytics: true, canSettings: true,
      showMenuOptions: false,
    },
    showKitchen: true,
  },
  general: {
    permissions: {
      canMenu: true, canOrders: true, canKitchen: false,
      canDebt: true, canAnalytics: true, canSettings: true,
      showMenuOptions: false,
    },
    showKitchen: false,
  },
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, preset } = await req.json()
  if (!userId || !PRESETS[preset]) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  const { permissions, showKitchen } = PRESETS[preset]

  await Promise.all([
    prisma.userPermission.upsert({
      where: { userId },
      update: permissions,
      create: { userId, ...permissions },
    }),
    prisma.shop.updateMany({
      where: { userId },
      data: { showKitchen },
    }),
  ])

  return NextResponse.json({ ok: true })
}
