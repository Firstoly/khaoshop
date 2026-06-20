import { prisma } from '@/lib/prisma'
import { ShieldCheck, UtensilsCrossed, ClipboardList, ListChecks, AlertCircle, BarChart2, Settings, Tag } from 'lucide-react'
import { PermissionToggle } from './PermissionToggle'
import { PresetButton } from './PresetButton'
import { ShopTypeSelect } from './ShopTypeSelect'

const PERM_DEFS = [
  { key: 'canMenu',         label: 'จัดการเมนู',          icon: UtensilsCrossed, color: 'text-orange-500' },
  { key: 'canOrders',       label: 'จัดการออเดอร์',        icon: ClipboardList,   color: 'text-blue-500'   },
  { key: 'canKitchen',      label: 'เตรียมอาหาร',          icon: ListChecks,      color: 'text-purple-500' },
  { key: 'showMenuOptions', label: 'ตัวเลือกเครื่องดื่ม', icon: Tag,      color: 'text-amber-500'  },
  { key: 'canDebt',         label: 'ลูกหนี้ค้างชำระ',     icon: AlertCircle,     color: 'text-red-500'    },
  { key: 'canAnalytics',    label: 'รายงานยอดขาย',        icon: BarChart2,       color: 'text-emerald-500'},
  { key: 'canSettings',     label: 'ตั้งค่าร้าน',         icon: Settings,        color: 'text-gray-500'   },
]

async function getShopUsers() {
  return prisma.user.findMany({
    where: { shop: { isNot: null }, role: 'USER' },
    include: {
      shop: { select: { name: true, shopType: true } },
      permission: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

function getPermValue(perm: any, key: string): boolean {
  if (!perm) return true
  return perm[key] ?? true
}

export default async function PermissionsPage() {
  const users = await getShopUsers()

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">กำหนดสิทธิ์</h1>
        <p className="text-sm text-gray-400 mt-0.5">ควบคุมว่าแต่ละร้านมองเห็นเมนูใดได้บ้างในระบบ</p>
      </div>

      {/* Legend */}
      <div className="card-base p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3">เมนูที่ควบคุมได้</p>
        <div className="flex flex-wrap gap-3">
          {PERM_DEFS.map(p => (
            <div key={p.key} className="flex items-center gap-1.5">
              <p.icon className={`w-4 h-4 ${p.color}`} />
              <span className="text-sm text-gray-600">{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Permission table */}
      <div className="card-base overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-500" />
          <h2 className="font-display font-bold text-gray-900">สิทธิ์การเข้าถึงแต่ละร้าน</h2>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{users.length} ร้าน</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-6 py-3 font-semibold min-w-[200px]">ร้าน / เจ้าของ</th>
                <th className="text-center px-4 py-3 font-semibold min-w-[90px]">Preset</th>
                {PERM_DEFS.map(p => (
                  <th key={p.key} className="text-center px-4 py-3 font-semibold min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <p.icon className={`w-4 h-4 ${p.color}`} />
                      <span>{p.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{user.shop?.name}</p>
                    <p className="text-xs text-gray-400">{user.name} · {user.email}</p>
                    {user.shop && (
                      <div className="mt-1">
                        <ShopTypeSelect userId={user.id} currentType={user.shop.shopType} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <PresetButton userId={user.id} />
                    </div>
                  </td>
                  {PERM_DEFS.map(p => (
                    <td key={p.key} className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        <PermissionToggle
                          userId={user.id}
                          permKey={p.key}
                          value={getPermValue(user.permission, p.key)}
                          label={p.label}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400 text-sm">
                    ยังไม่มีร้านค้าในระบบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
