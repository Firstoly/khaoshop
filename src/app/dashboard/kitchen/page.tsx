import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { KitchenClient } from './KitchenClient'

export default async function KitchenPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const shopId = (session.user as any).shopId

  const orders = await prisma.order.findMany({
    where: {
      shopId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    orderBy: { queueNumber: 'asc' },
    include: {
      items: {
        include: { menuItem: { select: { name: true, category: true } } },
      },
    },
  })

  return <KitchenClient orders={orders} shopId={shopId} />
}
