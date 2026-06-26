// ===================================================
// Admin Layout — ครอบทุกหน้าใน /admin/*
// อนุญาตเฉพาะ SUPER_ADMIN เท่านั้น
// ถ้าไม่ใช่ → เด้งไปหน้า dashboard
// ===================================================

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Topbar } from '@/components/admin/Topbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  // ไม่ได้ login → ไปหน้า login
  if (!session) redirect('/login')
  // ไม่ใช่ admin → เด้งไป dashboard
  if ((session.user as any).role !== 'SUPER_ADMIN') redirect('/dashboard')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar session={session} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
