import { prisma } from '@/lib/prisma'
import { Users, ShieldCheck, Store, User } from 'lucide-react'
import { RoleToggle } from './RoleToggle'
import { CreateUserModal } from './CreateUserModal'
import { SuspendButton } from './SuspendButton'
import { ResetPasswordModal } from './ResetPasswordModal'
import { DeleteUserButton } from './DeleteUserButton'

async function getUsers() {
  return prisma.user.findMany({
    include: {
      shop: { select: { name: true, isOpen: true, _count: { select: { orders: true, menuItems: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function UsersPage() {
  const users = await getUsers()
  const adminUsers  = users.filter(u => (u as any).role === 'SUPER_ADMIN')
  const shopUsers   = users.filter(u => (u as any).role !== 'SUPER_ADMIN' && u.shop)
  const regularUsers = users.filter(u => (u as any).role !== 'SUPER_ADMIN' && !u.shop)

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
          <p className="text-sm text-gray-400 mt-0.5">ผู้ใช้ทั้งหมด {users.length} บัญชี</p>
        </div>
        <CreateUserModal />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Super Admin', value: adminUsers.length,   icon: ShieldCheck, bg: 'bg-violet-50', text: 'text-violet-600' },
          { label: 'เจ้าของร้าน', value: shopUsers.length,   icon: Store,       bg: 'bg-orange-50', text: 'text-orange-500' },
          { label: 'ผู้ใช้ทั่วไป', value: regularUsers.length, icon: User,      bg: 'bg-blue-50',   text: 'text-blue-500'  },
        ].map(s => (
          <div key={s.label} className="card-base p-5 animate-fade-in">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.text}`} />
            </div>
            <p className="font-display text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Admin section */}
      <div className="card-base animate-fade-in">
        <div className="px-6 py-4 border-b border-violet-100 flex items-center gap-2 bg-violet-50 rounded-t-2xl">
          <ShieldCheck className="w-5 h-5 text-violet-500" />
          <h2 className="font-display font-bold text-violet-700">ผู้ดูแลระบบ (Super Admin)</h2>
          <span className="ml-auto text-xs text-violet-400 bg-violet-100 px-2 py-1 rounded-full">{adminUsers.length} บัญชี</span>
        </div>
        <div className="overflow-x-auto rounded-b-2xl">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {adminUsers.map(user => (
                <tr key={user.id} className="hover:bg-violet-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    สมัครเมื่อ {new Date(user.createdAt).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <RoleToggle userId={user.id} currentRole="SUPER_ADMIN" userName={user.name} />
                  </td>
                </tr>
              ))}
              {adminUsers.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 text-sm">ไม่มีผู้ดูแลระบบ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shop owners section */}
      <div className="card-base overflow-hidden animate-fade-in">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <h2 className="font-display font-bold text-gray-900">เจ้าของร้านค้า</h2>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{shopUsers.length + regularUsers.length} บัญชี</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">ชื่อ / Email</th>
                <th className="text-left px-6 py-3 font-semibold">ร้านค้า</th>
                <th className="text-center px-6 py-3 font-semibold">เมนู</th>
                <th className="text-center px-6 py-3 font-semibold">ออเดอร์รวม</th>
                <th className="text-center px-6 py-3 font-semibold">สมัครเมื่อ</th>
                <th className="text-center px-6 py-3 font-semibold">สิทธิ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...shopUsers, ...regularUsers].map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    {user.shop ? (
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.shop.isOpen ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                        <span className="font-medium text-gray-700">{user.shop.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">{user.shop?._count.menuItems ?? '—'}</td>
                  <td className="px-6 py-4 text-center font-semibold text-violet-500">{user.shop?._count.orders ?? '—'}</td>
                  <td className="px-6 py-4 text-center text-xs text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RoleToggle userId={user.id} currentRole={(user as any).role ?? 'USER'} userName={user.name} />
                      <SuspendButton userId={user.id} isSuspended={(user as any).isSuspended ?? false} userName={user.name} />
                      <ResetPasswordModal userId={user.id} userName={user.name} />
                      <DeleteUserButton userId={user.id} userName={user.name} />
                    </div>
                  </td>
                </tr>
              ))}
              {shopUsers.length === 0 && regularUsers.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">ยังไม่มีร้านค้าในระบบ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
