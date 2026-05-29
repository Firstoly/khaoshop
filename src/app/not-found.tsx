import Link from 'next/link'
import { ChefHat } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-brand">
          <ChefHat className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-display text-5xl font-black text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-8">ไม่พบหน้าที่คุณต้องการ</p>
        <Link href="/" className="btn-primary inline-flex">กลับหน้าหลัก</Link>
      </div>
    </div>
  )
}
