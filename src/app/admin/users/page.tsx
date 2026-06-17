import { prisma } from '@/lib/prisma'
import { Users, ShieldCheck, Store, User } from 'lucide-react'
import { RoleToggle } from './RoleToggle'

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
  const admins  = users.filter(u => (u as any).role === 'SUPER_ADMIN').length
  const sellers = users.filter(u => (u as any).role === 'USER' && u.shop).length
  const regular = users.filter(u => (u as any).role === 'USER' && !u.shop).length

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
        <p className="text-sm text-gray-400 mt-0.5">ผู้ใช้ทั้งหมด {users.length} บัญชี</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-base p-5">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5 text-violet-600" />
          </div>
          <p className="font-display text-2xl font-bold text-gray-900">{admins}</p>
          <p className="text-xs text-gray-400 mt-1">Super Admin</p>
        </div>
        <div className="card-base p-5">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
            <Store className="w-5 h-5 text-orange-500" />
          </div>
          <p className="font-display text-2xl font-bold text-gray-900">{sellers}</p>
          <p className="text-xs text-gray-400 mt-1">เจ้าของร้าน</p>
        </div>
        <div className="card-base p-5">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <User className="w-5 h-5 text-blue-500" />
          </div>
          <p className="font-display text-2xl font-bold text-gray-900">{regular}</p>
          <p className="text-xs text-gray-400 mt-1">ผู้ใช้ทั่วไป</p>
        </div>
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <h2 className="font-display font-bold text-gray-900">รายชื่อผู้ใช้ทั้งหมด</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
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
              {users.map(user => (
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
                    <RoleToggle userId={user.id} currentRole={(user as any).role} userName={user.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
