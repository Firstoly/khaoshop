import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DebtClient } from './DebtClient'

export default async function DebtPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const shopId = (session.user as any).shopId

  const debtOrders = await prisma.order.findMany({
    where: {
      shopId,
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      status: { not: 'CANCELLED' },
    },
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { menuItem: true } } },
  })

  const totalDebt = debtOrders.reduce((sum, o) => sum + o.totalAmount, 0)

  return <DebtClient orders={debtOrders} totalDebt={totalDebt} />
}
