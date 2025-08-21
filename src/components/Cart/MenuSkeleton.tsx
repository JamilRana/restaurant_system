// components/Menu/MenuSkeleton.tsx
export function MenuSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      {/* Desktop Skeleton */}
      <div className="hidden md:grid md:grid-cols-4 gap-6">
        {/* Sidebar Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>

        {/* Menu Content Skeleton */}
        <div className="md:col-span-2 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6 animate-pulse"></div>
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex justify-between py-3 border-b">
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Basket Skeleton */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-6 animate-pulse"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 rounded animate-pulse"
              ></div>
            ))}
          </div>
          <div className="h-10 bg-gray-200 rounded mt-6 animate-pulse"></div>
        </div>
      </div>

      {/* Mobile Skeleton */}
      <div className="md:hidden space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow">
            <div className="h-7 bg-gray-200 rounded w-1/2 mb-4 animate-pulse"></div>
            {[1, 2].map((j) => (
              <div key={j} className="flex justify-between py-2 border-b">
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-36 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
