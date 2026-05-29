export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

export interface MenuItem {
  id: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
  dailyLimit: number
  soldCount: number
  isAvailable: boolean
  category?: string | null
  shopId: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  quantity: number
  price: number
  menuItem: MenuItem
}

export interface Order {
  id: string
  queueNumber: number
  customerName: string
  customerPhone: string
  customerAddress?: string | null
  note?: string | null
  status: OrderStatus
  totalAmount: number
  shopId: string
  createdAt: Date
  updatedAt: Date
  items: OrderItem[]
}

export interface Shop {
  id: string
  slug: string
  name: string
  description?: string | null
  logoUrl?: string | null
  coverUrl?: string | null
  phone?: string | null
  address?: string | null
  isOpen: boolean
}

export interface CartItem {
  menuItem: MenuItem
  quantity: number
}

export interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  pendingOrders: number
  totalMenuItems: number
  lowStockItems: MenuItem[]
  recentOrders: Order[]
  topSellingItems: { menuItem: MenuItem; totalSold: number }[]
}
