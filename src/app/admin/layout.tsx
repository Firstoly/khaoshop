import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/admin/Topbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'SUPER_ADMIN') redirect('/dashboard')
  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar session={session} />
      <main>{children}</main>
    </div>
  )
}
