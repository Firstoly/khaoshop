import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { MenuClient } from './MenuClient'

export default async function MenuPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const shopId = (session.user as any).shopId

  const [menuItems, shop] = await Promise.all([
    prisma.menuItem.findMany({ where: { shopId }, orderBy: { createdAt: 'desc' } }),
    prisma.shop.findUnique({ where: { id: shopId }, select: { showMenuOptions: true } }),
  ])

  return <MenuClient menuItems={menuItems} shopId={shopId} showMenuOptions={shop?.showMenuOptions ?? true} />
}
