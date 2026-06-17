'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Square, ClipboardList, ChefHat, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { cn, getOrderStatusLabel } from '@/lib/utils'
import { getPusherClient, PUSHER_EVENTS, getShopChannel } from '@/lib/pusher'

type OrderItem = {
  id: string
  quantity: number
  price: number
  menuItem: { name: string; category: string | null }
}

type Order = {
  id: string
  queueNumber: number
  customerName: string
  status: string
  totalAmount: number
  items: OrderItem[]
  createdAt: Date | string
}

export function KitchenClient({ orders: initial, shopId }: { orders: Order[]; shopId: string }) {
  const [orders, setOrders] = useState<Order[]>(initial)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [hideCompleted, setHideCompleted] = useState(false)

  useEffect(() => {
    const pusher = getPusherClient()
    const channel = pusher.subscribe(getShopChannel(shopId))
    channel.bind(PUSHER_EVENTS.NEW_ORDER, async (data: any) => {
      try {
        const res = await fetch(`/api/orders/${data.orderId}`)
        if (res.ok) {
          const newOrder = await res.json()
          if (['PENDING', 'CONFIRMED'].includes(newOrder.status)) {
            setOrders(prev => [...prev, newOrder])
          }
        }
      } catch {}
    })
    return () => {
      channel.unbind_all()
      pusher.unsubscribe(getShopChannel(shopId))
    }
  }, [shopId])

  function toggleCheck(key: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function isOrderDone(order: Order) {
    return order.items.every(item => checked.has(`${order.id}-${item.id}`))
  }

  function checkAllOrder(order: Order) {
    setChecked(prev => {
      const next = new Set(prev)
      if (isOrderDone(order)) {
        order.items.forEach(item => next.delete(`${order.id}-${item.id}`))
      } else {
        order.items.forEach(item => next.add(`${order.id}-${item.id}`))
      }
      return next
    })
  }

  const doneOrders = orders.filter(isOrderDone).length
  const totalItems = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0)
  const checkedItems = checked.size
  const progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  // build menu → order slots map
  const menuMap = new Map<string, Array<{ key: string; queueNumber: number; customerName: string; quantity: number }>>()
  const activeOrders = hideCompleted ? orders.filter(o => !isOrderDone(o)) : orders
  for (const order of activeOrders) {
    for (const item of order.items) {
      const name = item.menuItem.name
      if (!menuMap.has(name)) menuMap.set(name, [])
      menuMap.get(name)!.push({
        key: `${order.id}-${item.id}`,
        queueNumber: order.queueNumber,
        customerName: order.customerName,
        quantity: item.quantity,
      })
    }
  }

  // sort: incomplete menus first
  const menuRows = Array.from(menuMap.entries())
    .map(([name, slots]) => ({ name, slots }))
    .sort((a, b) => {
      const aDone = a.slots.every(s => checked.has(s.key))
      const bDone = b.slots.every(s => checked.has(s.key))
      return Number(aDone) - Number(bDone)
    })

  const maxSlots = menuRows.reduce((m, r) => Math.max(m, r.slots.length), 0)
  const totalMenuItems = menuRows.reduce((s, r) => s + r.slots.reduce((ss, sl) => ss + sl.quantity, 0), 0)

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">เตรียมอาหาร</h1>
          <p className="text-sm text-gray-400 mt-0.5">{orders.length} ออเดอร์ · {totalMenuItems} รายการทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
          {checkedItems > 0 && (
            <button
              onClick={() => setChecked(new Set())}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              รีเซ็ต
            </button>
          )}
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
              hideCompleted ? 'bg-brand-500 text-white shadow-brand' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {hideCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {hideCompleted ? 'แสดงทั้งหมด' : 'ซ่อนที่เสร็จแล้ว'}
          </button>
        </div>
      </div>

      {/* Stats + Progress */}
      <div className="card-base p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-amber-500">{orders.length - doneOrders}</p>
            <p className="text-xs text-gray-400">ออเดอร์ค้างอยู่</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-brand-500">{checkedItems}</p>
            <p className="text-xs text-gray-400">รายการที่ทำแล้ว</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-emerald-600">{doneOrders}</p>
            <p className="text-xs text-gray-400">ออเดอร์พร้อมเสิร์ฟ</p>
          </div>
        </div>
        {totalMenuItems > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">ความคืบหน้า</span>
              <span className="font-bold text-brand-500">{checkedItems}/{totalMenuItems} ({progressPct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500',
                  progressPct === 100 ? 'bg-emerald-500' : 'bg-brand-500')}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {progressPct === 100 && (
              <p className="text-xs text-emerald-600 font-semibold mt-1.5 text-center">✅ เสร็จทุกรายการแล้ว!</p>
            )}
          </div>
        )}
      </div>

      {/* ══════════ ตาราง checklist ══════════ */}
      {menuRows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="font-medium">ไม่มีออเดอร์ที่ต้องเตรียม</p>
          <p className="text-sm mt-1">เมื่อมีออเดอร์ใหม่จะแสดงที่นี่อัตโนมัติ</p>
        </div>
      ) : (
        <div className="card-base overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {/* Menu name column header */}
                <th className="px-5 py-3.5 text-left font-semibold text-gray-500 bg-gray-50 border-b border-gray-100 sticky left-0 z-10 min-w-[160px]">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-brand-400" />
                    ชื่อเมนู
                  </div>
                </th>
                {/* คนที่สั่ง columns */}
                {Array.from({ length: maxSlots }).map((_, i) => (
                  <th key={i} className="px-4 py-3.5 text-center font-semibold text-gray-400 bg-gray-50 border-b border-gray-100 min-w-[150px]">
                    คนที่สั่ง {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {menuRows.map(row => {
                const allDone = row.slots.every(s => checked.has(s.key))
                const doneCnt = row.slots.filter(s => checked.has(s.key)).length
                const rowTotal = row.slots.reduce((s, sl) => s + sl.quantity, 0)
                return (
                  <tr key={row.name} className={cn('transition-colors', allDone ? 'bg-emerald-50/60' : 'hover:bg-gray-50/50')}>
                    {/* Menu name cell */}
                    <td className={cn(
                      'px-5 py-4 sticky left-0 z-10 border-r border-gray-100',
                      allDone ? 'bg-emerald-50' : 'bg-white'
                    )}>
                      <div className={cn('font-display font-bold text-base leading-tight', allDone && 'line-through text-emerald-600')}>
                        {row.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn('text-xs font-semibold',
                          allDone ? 'text-emerald-500' : 'text-brand-500')}>
                          รวม {rowTotal} จาน
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{doneCnt}/{row.slots.length}</span>
                      </div>
                    </td>
                    {/* Order cells */}
                    {Array.from({ length: maxSlots }).map((_, i) => {
                      const slot = row.slots[i]
                      if (!slot) {
                        return (
                          <td key={i} className="px-4 py-4">
                            <div className="w-full h-full min-h-[2rem]" />
                          </td>
                        )
                      }
                      const done = checked.has(slot.key)
                      return (
                        <td key={i} className="px-4 py-4">
                          <button
                            onClick={() => toggleCheck(slot.key)}
                            className={cn(
                              'w-full flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all group',
                              done
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-gray-50 border-gray-200 hover:bg-brand-50 hover:border-brand-300'
                            )}
                          >
                            {done
                              ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                              : <Square className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-brand-400" />
                            }
                            <div className={cn('min-w-0', done && 'opacity-50')}>
                              <p className={cn('text-xs font-bold leading-tight',
                                done ? 'text-emerald-600 line-through' : 'text-gray-800')}>
                                #{String(slot.queueNumber).padStart(3, '0')} {slot.customerName}
                              </p>
                              <p className={cn('text-xs mt-0.5 font-semibold',
                                done ? 'text-emerald-400' : 'text-brand-500')}>
                                ×{slot.quantity} จาน
                              </p>
                            </div>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════ แยกตามออเดอร์ (collapsed section) ══════════ */}
      {orders.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer flex items-center gap-2 px-1 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 select-none list-none">
            <ClipboardList className="w-4 h-4" />
            ดูแยกตามออเดอร์
            <span className="text-xs text-gray-300 font-normal ml-1">({orders.length} ออเดอร์)</span>
            <span className="ml-auto text-xs text-gray-300 group-open:hidden">▼ 展开</span>
            <span className="ml-auto text-xs text-gray-300 hidden group-open:inline">▲ 收起</span>
          </summary>
          <div className="mt-3 space-y-3">
            {(hideCompleted ? orders.filter(o => !isOrderDone(o)) : orders).map(order => {
              const done = isOrderDone(order)
              const st = getOrderStatusLabel(order.status)
              return (
                <div key={order.id} className={cn('card-base overflow-hidden', done && 'opacity-55')}>
                  <div className={cn('px-5 py-3.5 flex items-center justify-between border-b border-gray-50', done ? 'bg-emerald-50' : 'bg-gray-50/50')}>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-black',
                        done ? 'bg-emerald-500' : 'bg-gradient-to-br from-brand-500 to-brand-600')}>
                        {done ? '✓' : `#${String(order.queueNumber).padStart(3, '0')}`}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-gray-900">{order.customerName}</span>
                          <span className={`status-badge text-[10px] ${st.bg} ${st.color}`}>{st.label}</span>
                          {done && <span className="status-badge text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">พร้อมเสิร์ฟ!</span>}
                        </div>
                        <p className="text-xs text-gray-400">{order.items.length} รายการ</p>
                      </div>
                    </div>
                    <button
                      onClick={() => checkAllOrder(order)}
                      className={cn('text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                        done ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                      )}
                    >
                      {done ? 'ยกเลิก' : 'เสร็จทั้งหมด'}
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {order.items.map(item => {
                      const key = `${order.id}-${item.id}`
                      const itemDone = checked.has(key)
                      return (
                        <button key={item.id} onClick={() => toggleCheck(key)}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left group">
                          {itemDone
                            ? <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                            : <Square className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-brand-300" />
                          }
                          <span className={cn('text-sm flex-1', itemDone ? 'line-through text-gray-300' : 'text-gray-800')}>
                            {item.menuItem.name}
                          </span>
                          <span className={cn('text-sm font-bold', itemDone ? 'text-gray-300' : 'text-brand-500')}>
                            ×{item.quantity}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
