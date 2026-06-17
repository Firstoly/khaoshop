'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Square, ClipboardList, ChefHat, RefreshCw, Eye, EyeOff, MessageSquare } from 'lucide-react'
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
  note?: string | null
  items: OrderItem[]
  createdAt: Date | string
}

function hasNote(note?: string | null): boolean {
  if (!note) return false
  const t = note.trim()
  return t.length > 0 && !/^[-–—]+$/.test(t) && t !== 'null' && t !== 'undefined'
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

  // column headers = menu names (incomplete first)
  const menuNames = Array.from(menuMap.keys()).sort((a, b) => {
    const aDone = (menuMap.get(a) ?? []).every(s => checked.has(s.key))
    const bDone = (menuMap.get(b) ?? []).every(s => checked.has(s.key))
    return Number(aDone) - Number(bDone)
  })

  // rows = orders, each cell = slot for that order+menu combo
  const orderRows = activeOrders.map(order => ({
    order,
    itemsByMenu: new Map(
      order.items.map(item => [
        item.menuItem.name,
        { key: `${order.id}-${item.id}`, quantity: item.quantity },
      ])
    ),
  }))

  const totalMenuItems = Array.from(menuMap.values()).reduce(
    (s, slots) => s + slots.reduce((ss, sl) => ss + sl.quantity, 0), 0
  )

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">เตรียมอาหาร</h1>
          <p className="text-sm text-gray-400 mt-0.5">{orders.length} ออเดอร์ · {totalMenuItems} รายการทั้งหมด</p>
        </div>
        <div className="flex items-center gap-2">
          {checkedItems > 0 && (
            <button
              onClick={() => setChecked(new Set())}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              รีเซ็ต
            </button>
          )}
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              hideCompleted
                ? 'bg-brand-500 text-white shadow-brand'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {hideCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {hideCompleted ? 'แสดงทั้งหมด' : 'ซ่อนที่เสร็จแล้ว'}
          </button>
        </div>
      </div>

      {/* ── Stats + Progress ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-base p-4 text-center">
          <p className="font-display text-3xl font-black text-amber-500">{orders.length - doneOrders}</p>
          <p className="text-xs text-gray-400 mt-1">ออเดอร์ค้างอยู่</p>
        </div>
        <div className="card-base p-4 text-center">
          <p className="font-display text-3xl font-black text-brand-500">{checkedItems}</p>
          <p className="text-xs text-gray-400 mt-1">รายการทำแล้ว</p>
        </div>
        <div className="card-base p-4 text-center">
          <p className="font-display text-3xl font-black text-emerald-600">{doneOrders}</p>
          <p className="text-xs text-gray-400 mt-1">ออเดอร์พร้อมเสิร์ฟ</p>
        </div>
      </div>

      {/* Progress bar */}
      {totalMenuItems > 0 && (
        <div className="card-base px-5 py-3">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-500 font-medium">ความคืบหน้า</span>
            <span className="font-bold text-brand-500">{checkedItems}/{totalMenuItems} ({progressPct}%)</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500',
                progressPct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-400 to-brand-500')}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {progressPct === 100 && (
            <p className="text-xs text-emerald-600 font-bold mt-2 text-center">✅ เสร็จทุกรายการแล้ว!</p>
          )}
        </div>
      )}

      {/* ── ตาราง checklist ── */}
      {menuNames.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ClipboardList className="w-14 h-14 mx-auto mb-3 opacity-20" />
          <p className="font-medium">ไม่มีออเดอร์ที่ต้องเตรียม</p>
          <p className="text-sm mt-1 text-gray-300">เมื่อมีออเดอร์ใหม่จะแสดงที่นี่อัตโนมัติ</p>
        </div>
      ) : (
        <div className="card-base overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {/* Left header: ลูกค้า */}
                <th className="px-4 py-4 text-left font-semibold text-gray-500 border-b-2 border-gray-100 sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-brand-400" />
                    <span>ลูกค้า</span>
                  </div>
                </th>
                {/* Menu name column headers */}
                {menuNames.map(name => {
                  const slots = menuMap.get(name) ?? []
                  const allDone = slots.every(s => checked.has(s.key))
                  const total = slots.reduce((s, sl) => s + sl.quantity, 0)
                  return (
                    <th key={name} className="px-3 py-4 border-b-2 border-gray-100 min-w-[140px] bg-gray-50">
                      <div className={cn(
                        'font-display font-bold text-sm leading-tight text-center',
                        allDone ? 'text-emerald-400 line-through' : 'text-gray-800'
                      )}>
                        {name}
                      </div>
                      <div className="flex justify-center mt-1.5">
                        <span className={cn(
                          'text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                          allDone
                            ? 'bg-emerald-50 text-emerald-500'
                            : 'bg-brand-50 text-brand-500'
                        )}>
                          รวม {total} จาน
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {orderRows.map(({ order, itemsByMenu }, rowIdx) => {
                const orderDone = isOrderDone(order)
                const note = hasNote(order.note) ? order.note!.trim() : null
                return (
                  <tr
                    key={order.id}
                    className={cn(
                      'transition-colors border-b border-gray-50 last:border-0',
                      rowIdx % 2 === 0 ? '' : 'bg-gray-50/30',
                      orderDone && 'bg-emerald-50/40'
                    )}
                  >
                    {/* Customer row header */}
                    <td className={cn(
                      'px-4 py-3 sticky left-0 z-10 border-r-2 border-gray-100',
                      orderDone ? 'bg-emerald-50' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs leading-tight text-center',
                          orderDone
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-brand'
                        )}>
                          {orderDone ? '✓' : `#${String(order.queueNumber).padStart(3, '0')}`}
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            'font-bold text-sm leading-tight',
                            orderDone ? 'line-through text-emerald-600' : 'text-gray-900'
                          )}>
                            {order.customerName}
                          </p>
                          {note && (
                            <div className="flex items-start gap-1 mt-1 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 max-w-[140px]">
                              <MessageSquare className="w-3 h-3 text-amber-500 shrink-0 mt-px" />
                              <span className="text-[10px] text-amber-700 leading-tight break-words">{note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Menu cells */}
                    {menuNames.map(name => {
                      const slot = itemsByMenu.get(name)
                      if (!slot) {
                        return (
                          <td key={name} className="px-3 py-3">
                            <div className="w-full h-14 rounded-xl bg-gray-50/50 border border-dashed border-gray-100" />
                          </td>
                        )
                      }
                      const done = checked.has(slot.key)
                      return (
                        <td key={name} className="px-3 py-3">
                          <button
                            onClick={() => toggleCheck(slot.key)}
                            className={cn(
                              'w-full h-14 rounded-xl border-2 transition-all flex items-center gap-2.5 px-3 group',
                              done
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-white border-gray-200 hover:border-brand-400 hover:bg-orange-50 shadow-sm hover:shadow'
                            )}
                          >
                            {done
                              ? <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                              : <Square className="w-5 h-5 text-gray-300 shrink-0 group-hover:text-brand-400" />
                            }
                            <div className="flex items-baseline gap-1">
                              <span className={cn(
                                'text-3xl font-black leading-none',
                                done ? 'text-emerald-300 line-through decoration-emerald-300' : 'text-brand-500'
                              )}>
                                {slot.quantity}
                              </span>
                              <span className={cn(
                                'text-xs font-semibold',
                                done ? 'text-emerald-300' : 'text-gray-400'
                              )}>
                                จาน
                              </span>
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

      {/* ── แยกตามออเดอร์ (collapsible) ── */}
      {orders.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer flex items-center gap-2 px-1 py-2 text-sm font-semibold text-gray-400 hover:text-gray-600 select-none list-none transition-colors">
            <ClipboardList className="w-4 h-4" />
            ดูแยกตามออเดอร์
            <span className="text-xs font-normal ml-1">({orders.length} ออเดอร์)</span>
            <span className="ml-auto text-xs group-open:hidden">▼</span>
            <span className="ml-auto text-xs hidden group-open:inline">▲</span>
          </summary>
          <div className="mt-3 space-y-3">
            {(hideCompleted ? orders.filter(o => !isOrderDone(o)) : orders).map(order => {
              const done = isOrderDone(order)
              const st = getOrderStatusLabel(order.status)
              const note = hasNote(order.note) ? order.note!.trim() : null
              return (
                <div key={order.id} className={cn('card-base overflow-hidden', done && 'opacity-60')}>
                  <div className={cn('px-5 py-3.5 flex items-center justify-between border-b border-gray-50', done ? 'bg-emerald-50' : 'bg-gray-50/50')}>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-black',
                        done ? 'bg-emerald-500' : 'bg-gradient-to-br from-brand-500 to-brand-600')}>
                        {done ? '✓' : `#${String(order.queueNumber).padStart(3, '0')}`}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-bold text-gray-900">{order.customerName}</span>
                          <span className={`status-badge text-[10px] ${st.bg} ${st.color}`}>{st.label}</span>
                          {done && <span className="status-badge text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">พร้อมเสิร์ฟ!</span>}
                        </div>
                        {note && (
                          <div className="flex items-center gap-1 mt-1">
                            <MessageSquare className="w-3 h-3 text-amber-400" />
                            <span className="text-xs text-amber-600">{note}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => checkAllOrder(order)}
                      className={cn('text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ml-2',
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
                          <span className={cn('text-lg font-black', itemDone ? 'text-gray-200' : 'text-brand-500')}>
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
