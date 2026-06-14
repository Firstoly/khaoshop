export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-pulse">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-40 bg-gray-200 rounded-xl" />
        <div className="h-4 w-24 bg-gray-100 rounded-lg" />
      </div>

      {/* Card row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
            <div className="h-6 w-16 bg-gray-200 rounded-lg" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* List skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
            <div className="h-5 w-16 bg-gray-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
