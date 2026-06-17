import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, role } = await req.json()
  if (!userId || !['USER', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  await prisma.user.update({ where: { id: userId }, data: { role } })
  return NextResponse.json({ ok: true })
}
