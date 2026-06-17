import { prisma } from '@/lib/prisma'
import { Users } from 'lucide-react'
import { RoleToggle } from './RoleToggle'

async function getUsers() {
  return prisma.user.findMany({
    include: { shop: { select: { name: true, slug: true, isOpen: true, _count: { select: { orders: true, menuItems: true } } } } },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function UsersPage() {
  const users = await getUsers()
  const admins = users.filter(u => u.role === 'SUPER_ADMIN')
  const sellers = users.filter(u => u.role === 'USER' && u.shop)
  const regular = users.filter(u => u.role === 'USER' && !u.shop)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
        <p className="text-sm text-gray-400 mt-1">ผู้ใช้ทั้งหมด {users.length} บัญชี</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Super Admin', count: admins.length, color: 'bg-violet-50 border-violet-100 text-violet-700' },
          { label: 'เจ้าของร้าน', count: sellers.length, color: 'bg-orange-50 border-orange-100 text-orange-700' },
          { label: 'ผู้ใช้ทั่วไป', count: regular.length, color: 'bg-gray-50 border-gray-200 text-gray-600' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-gray-900">รายชื่อผู้ใช้ทั้งหมด</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-6 py-3">ชื่อ / Email</th>
                <th className="text-left px-6 py-3">ร้านค้า</th>
                <th className="text-center px-6 py-3">เมนู</th>
                <th className="text-center px-6 py-3">ออเดอร์รวม</th>
                <th className="text-center px-6 py-3">สมัครเมื่อ</th>
                <th className="text-center px-6 py-3">สิทธิ์</th>
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
                      <div>
                        <p className="font-medium text-gray-700">{user.shop.name}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user.shop.isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {user.shop.isOpen ? 'เปิด' : 'ปิด'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">{user.shop?._count.menuItems ?? '—'}</td>
                  <td className="px-6 py-4 text-center font-semibold text-orange-500">{user.shop?._count.orders ?? '—'}</td>
                  <td className="px-6 py-4 text-center text-xs text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <RoleToggle userId={user.id} currentRole={user.role} userName={user.name} />
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
