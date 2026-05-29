import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const shopId = (session.user as any).shopId

  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop) redirect('/login')

  return <SettingsClient shop={shop} />
}
