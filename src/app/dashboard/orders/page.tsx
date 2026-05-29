import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { OrdersClient } from './OrdersClient'

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const shopId = (session.user as any).shopId

  const orders = await prisma.order.findMany({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { items: { include: { menuItem: true } } },
  })

  return <OrdersClient orders={orders} />
}
