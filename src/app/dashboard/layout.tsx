import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/admin/Sidebar'
import { Topbar } from '@/components/admin/Topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any)?.role === 'SUPER_ADMIN') redirect('/admin')

  const userId = (session.user as any)?.id
  const permission = userId
    ? await prisma.userPermission.findUnique({ where: { userId } })
    : null

  const perms = {
    canMenu:      permission?.canMenu      ?? true,
    canOrders:    permission?.canOrders    ?? true,
    canDebt:      permission?.canDebt      ?? true,
    canAnalytics: permission?.canAnalytics ?? true,
    canSettings:  permission?.canSettings  ?? true,
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar permissions={perms} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar session={session} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
