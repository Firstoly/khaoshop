import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(price)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatDateWithDay(date: Date | string): string {
  const d = new Date(date)
  const day = new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(d)
  const rest = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  return `${day} ${rest}`
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date)
  const day = new Intl.DateTimeFormat('th-TH', { weekday: 'short' }).format(d)
  const dateStr = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(d)
  return `${day} ${dateStr}`
}

export function generateQueueNumber(orderCount: number): string {
  return String(orderCount + 1).padStart(3, '0')
}

export function getStockStatus(dailyLimit: number, soldCount: number) {
  const remaining = dailyLimit - soldCount
  if (remaining <= 0) return { label: 'หมดแล้ว', color: 'red', remaining: 0 }
  if (remaining <= 3) return { label: `เหลือ ${remaining}`, color: 'orange', remaining }
  return { label: `เหลือ ${remaining}`, color: 'green', remaining }
}

export function getOrderStatusLabel(status: string) {
  const labels: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:   { label: 'รอรับออเดอร์', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
    CONFIRMED: { label: 'รับออเดอร์แล้ว', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    PREPARING: { label: 'กำลังทำ',      color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    READY:     { label: 'เสร็จแล้ว',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    DELIVERED: { label: 'ส่งแล้ว',     color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200' },
    CANCELLED: { label: 'ยกเลิก',      color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
  }
  return labels[status] ?? { label: status, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' }
}

export const ORDER_STATUS_FLOW = [
  'PENDING',
  'CONFIRMED',
  'DELIVERED',
]

export function getPaymentMethodLabel(method: string) {
  return method === 'PROMPTPAY' ? 'QR / PromptPay' : 'เงินสด'
}

export function getPaymentStatusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    PENDING:  { label: 'รอชำระ',    color: 'text-gray-500' },
    PAID:     { label: 'รอยืนยัน', color: 'text-blue-600' },
    VERIFIED: { label: 'ยืนยันแล้ว', color: 'text-emerald-600' },
  }
  return map[status] ?? { label: status, color: 'text-gray-500' }
}
