'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Square, ListChecks, ClipboardList, ChefHat, RefreshCw, Eye, EyeOff } from 'lucide-react'
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
  const [tab, setTab] = useState<'menu' | 'order'>('menu')
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
  const visibleOrders = hideCompleted ? orders.filter(o => !isOrderDone(o)) : orders

  // aggregate by menu item name
  const menuMap = new Map<string, { name: string; slots: Array<{ key: string; queueNumber: number; customerName: string; quantity: number }> }>()
  for (const order of orders) {
    if (hideCompleted && isOrderDone(order)) continue
    for (const item of order.items) {
      const name = item.menuItem.name
      if (!menuMap.has(name)) menuMap.set(name, { name, slots: [] })
      menuMap.get(name)!.slots.push({
        key: `${order.id}-${item.id}`,
        queueNumber: order.queueNumber,
        customerName: order.customerName,
        quantity: item.quantity,
      })
    }
  }
  const menuGroups = Array.from(menuMap.values()).sort((a, b) => {
    const aDone = a.slots.every(s => checked.has(s.key))
    const bDone = b.slots.every(s => checked.has(s.key))
    return Number(aDone) - Number(bDone)
  })

  const progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">เตรียมอาหาร</h1>
          <p className="text-sm text-gray-400 mt-0.5">{orders.length} ออเดอร์ · {totalItems} รายการทั้งหมด</p>
        </div>
        <button
          onClick={() => setHideCompleted(!hideCompleted)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
            hideCompleted
              ? 'bg-brand-500 text-white shadow-brand'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {hideCompleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {hideCompleted ? 'แสดงทั้งหมด' : 'ซ่อนที่เสร็จแล้ว'}
        </button>
      </div>

      {/* Progress bar */}
      {totalItems > 0 && (
        <div className="card-base p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">ความคืบหน้า</span>
            <span className="text-sm font-bold text-brand-500">{checkedItems} / {totalItems} รายการ ({progressPct}%)</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500',
                progressPct === 100 ? 'bg-emerald-500' : 'bg-brand-500'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {progressPct === 100 && (
            <p className="text-xs text-emerald-600 font-semibold mt-2 text-center">✅ เสร็จทุกรายการแล้ว!</p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-base p-4 text-center">
          <p className="font-display text-2xl font-bold text-amber-500">{orders.length - doneOrders}</p>
          <p className="text-xs text-gray-400 mt-0.5">ออเดอร์ค้างอยู่</p>
        </div>
        <div className="card-base p-4 text-center">
          <p className="font-display text-2xl font-bold text-brand-500">{checkedItems}</p>
          <p className="text-xs text-gray-400 mt-0.5">รายการที่ทำแล้ว</p>
        </div>
        <div className="card-base p-4 text-center">
          <p className="font-display text-2xl font-bold text-emerald-600">{doneOrders}</p>
          <p className="text-xs text-gray-400 mt-0.5">ออเดอร์พร้อมเสิร์ฟ</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'menu',  label: 'แยกตามเมนู',    icon: ListChecks   },
          { key: 'order', label: 'แยกตามออเดอร์', icon: ClipboardList },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as 'menu' | 'order')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === t.key
                ? 'bg-brand-500 text-white shadow-brand'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'
            )}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
        {checkedItems > 0 && (
          <button
            onClick={() => setChecked(new Set())}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            รีเซ็ตทั้งหมด
          </button>
        )}
      </div>

      {/* ==================== แยกตามเมนู ==================== */}
      {tab === 'menu' && (
        <div className="space-y-3">
          {menuGroups.length === 0 ? (
            <EmptyState />
          ) : menuGroups.map(group => {
            const total = group.slots.reduce((s, sl) => s + sl.quantity, 0)
            const doneSlotsCount = group.slots.filter(sl => checked.has(sl.key)).length
            const allDone = doneSlotsCount === group.slots.length
            return (
              <div key={group.name} className={cn('card-base overflow-hidden transition-all duration-200', allDone && 'opacity-55')}>
                {/* Menu header */}
                <div className={cn('px-5 py-3.5 flex items-center justify-between border-b border-gray-50', allDone ? 'bg-emerald-50' : 'bg-gray-50/50')}>
                  <div className="flex items-center gap-2.5">
                    {allDone
                      ? <span className="text-emerald-500 text-lg">✓</span>
                      : <ChefHat className="w-4 h-4 text-brand-400" />
                    }
                    <span className={cn('font-display font-bold text-base', allDone ? 'text-emerald-700 line-through' : 'text-gray-900')}>
                      {group.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{doneSlotsCount}/{group.slots.length} คิว</span>
                    <span className={cn('font-display font-bold text-sm px-2.5 py-1 rounded-lg',
                      allDone ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-600')}>
                      รวม {total} จาน
                    </span>
                  </div>
                </div>
                {/* Per-order slots */}
                <div className="divide-y divide-gray-50">
                  {group.slots.map(slot => {
                    const done = checked.has(slot.key)
                    return (
                      <button
                        key={slot.key}
                        onClick={() => toggleCheck(slot.key)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left group"
                      >
                        {done
                          ? <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                          : <Square className="w-5 h-5 text-gray-300 shrink-0 group-hover:text-brand-300" />
                        }
                        <span className={cn('text-sm font-medium flex-1', done ? 'line-through text-gray-300' : 'text-gray-700')}>
                          คิว <span className="font-bold text-gray-900">#{String(slot.queueNumber).padStart(3, '0')}</span>
                          <span className="text-gray-400 ml-1">— {slot.customerName}</span>
                        </span>
                        <span className={cn('text-sm font-bold shrink-0 min-w-[2rem] text-right',
                          done ? 'text-gray-300' : 'text-brand-500')}>
                          ×{slot.quantity}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ==================== แยกตามออเดอร์ ==================== */}
      {tab === 'order' && (
        <div className="space-y-3">
          {visibleOrders.length === 0 ? (
            <EmptyState />
          ) : visibleOrders.map(order => {
            const done = isOrderDone(order)
            const st = getOrderStatusLabel(order.status)
            return (
              <div key={order.id} className={cn('card-base overflow-hidden transition-all duration-200', done && 'opacity-55')}>
                {/* Order header */}
                <div className={cn('px-5 py-3.5 flex items-center justify-between border-b border-gray-50', done ? 'bg-emerald-50' : 'bg-gray-50/50')}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white text-xs font-black',
                      done ? 'bg-emerald-500' : 'bg-gradient-to-br from-brand-500 to-brand-600')}>
                      {done ? '✓' : `#${String(order.queueNumber).padStart(3, '0')}`}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-gray-900">{order.customerName}</span>
                        <span className={`status-badge text-[10px] ${st.bg} ${st.color}`}>{st.label}</span>
                        {done && (
                          <span className="status-badge text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            พร้อมเสิร์ฟ!
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        <span className="mx-1">·</span>
                        {order.items.length} รายการ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => checkAllOrder(order)}
                      className={cn('text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                        done
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                      )}
                    >
                      {done ? 'ยกเลิก' : 'เสร็จทั้งหมด'}
                    </button>
                  </div>
                </div>
                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {order.items.map(item => {
                    const key = `${order.id}-${item.id}`
                    const itemDone = checked.has(key)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleCheck(key)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left group"
                      >
                        {itemDone
                          ? <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                          : <Square className="w-5 h-5 text-gray-300 shrink-0 group-hover:text-brand-300" />
                        }
                        <span className={cn('text-sm font-medium flex-1', itemDone ? 'line-through text-gray-300' : 'text-gray-800')}>
                          {item.menuItem.name}
                          {item.menuItem.category && (
                            <span className="text-xs text-gray-400 ml-1.5">({item.menuItem.category})</span>
                          )}
                        </span>
                        <span className={cn('text-sm font-bold shrink-0 min-w-[2rem] text-right',
                          itemDone ? 'text-gray-300' : 'text-brand-500')}>
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
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-gray-400">
      <ListChecks className="w-14 h-14 mx-auto mb-3 opacity-20" />
      <p className="font-medium">ไม่มีออเดอร์ที่ต้องเตรียม</p>
      <p className="text-sm mt-1">เมื่อมีออเดอร์ใหม่จะแสดงที่นี่อัตโนมัติ</p>
    </div>
  )
}
