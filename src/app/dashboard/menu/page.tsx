import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { MenuClient } from './MenuClient'

export default async function MenuPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const shopId = (session.user as any).shopId

  const menuItems = await prisma.menuItem.findMany({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
  })

  return <MenuClient menuItems={menuItems} shopId={shopId} />
}
