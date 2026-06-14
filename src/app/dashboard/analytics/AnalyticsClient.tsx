'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, ShoppingBag, Calendar, Award, Banknote, QrCode, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b']

export function AnalyticsClient({ data }: { data: any }) {
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily')

  const chartData = period === 'daily' ? data.dailyData.slice(-14) : data.weeklyData

  const totalPayments = data.paymentBreakdown.cash + data.paymentBreakdown.qr
  const pieData = [
    { name: 'เงินสด', value: data.paymentBreakdown.cash },
    { name: 'QR / PromptPay', value: data.paymentBreakdown.qr },
  ]

  const stats = [
    { label: 'ออเดอร์ที่รับเงินแล้ว', value: data.summary.totalOrders.toLocaleString(), unit: 'ออเดอร์', icon: ShoppingBag, bg: 'bg-orange-50', text: 'text-brand-600' },
    { label: 'รายได้รวม (รับแล้ว)', value: formatPrice(data.summary.totalRevenue), unit: '', icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'ออเดอร์เดือนนี้ (รับแล้ว)', value: data.summary.thisMonthOrders.toLocaleString(), unit: 'ออเดอร์', icon: Calendar, bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'รายได้เดือนนี้ (รับแล้ว)', value: formatPrice(data.summary.thisMonthRevenue), unit: '', icon: Award, bg: 'bg-violet-50', text: 'text-violet-600' },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-lg text-xs">
        <p className="font-bold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === 'revenue' ? `รายได้: ${formatPrice(p.value)}` : `ออเดอร์: ${p.value}`}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">รายงานยอดขาย</h1>
        <p className="text-sm text-gray-400 mt-0.5">วิเคราะห์ข้อมูลร้านของคุณ</p>
      </div>

      {/* Unpaid alert */}
      {data.unpaid.count > 0 && (
        <div className="card-base p-4 border-l-4 border-red-400 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-600">ยังไม่ได้รับเงิน</p>
              <p className="text-xs text-gray-500">{data.unpaid.count} ออเดอร์ที่ยังค้างชำระ</p>
            </div>
          </div>
          <p className="font-display text-2xl font-black text-red-500 shrink-0">{formatPrice(data.unpaid.amount)}</p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card-base p-5">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.text}`} />
            </div>
            <p className="font-display text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label} {s.unit}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card-base p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-gray-900">ยอดขายและออเดอร์</h2>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(['daily', 'weekly'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {p === 'daily' ? '14 วัน' : '8 สัปดาห์'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={period === 'daily' ? 'date' : 'week'} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="revenue" fill="#f97316" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top selling menu */}
        <div className="card-base p-6">
          <h2 className="font-display font-bold text-gray-900 mb-5">เมนูขายดีตลอดกาล</h2>
          {data.topMenus.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-3">
              {data.topMenus.map((item: any, i: number) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0`}
                    style={{ background: COLORS[i] ?? '#f97316' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <div className="mt-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500"
                        style={{ width: `${Math.min((item.quantity / (data.topMenus[0]?.quantity || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-brand-500">{item.quantity}</p>
                    <p className="text-[10px] text-gray-400">ถุง</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="card-base p-6">
          <h2 className="font-display font-bold text-gray-900 mb-5">วิธีชำระเงิน (30 วันล่าสุด)</h2>
          {totalPayments === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="flex items-center gap-6">
              <div className="shrink-0">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={pieData} cx={65} cy={65} innerRadius={40} outerRadius={65}
                      dataKey="value" paddingAngle={3}>
                      <Cell fill="#f97316" />
                      <Cell fill="#10b981" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">เงินสด</p>
                    <p className="text-xl font-display font-bold text-brand-500">{data.paymentBreakdown.cash}</p>
                    <p className="text-xs text-gray-400">{totalPayments > 0 ? Math.round(data.paymentBreakdown.cash / totalPayments * 100) : 0}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">QR / PromptPay</p>
                    <p className="text-xl font-display font-bold text-emerald-500">{data.paymentBreakdown.qr}</p>
                    <p className="text-xs text-gray-400">{totalPayments > 0 ? Math.round(data.paymentBreakdown.qr / totalPayments * 100) : 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order trend line chart */}
      <div className="card-base p-6">
        <h2 className="font-display font-bold text-gray-900 mb-6">แนวโน้มออเดอร์ 30 วัน</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }}
              interval={4} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="orders" name="orders" stroke="#f97316"
              strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#f97316' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
