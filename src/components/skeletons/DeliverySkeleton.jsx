export function DeliverySkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded-full w-3/4" />
              <div className="h-3 bg-gray-200 rounded-full w-1/2" />
              <div className="h-3 bg-gray-200 rounded-full w-2/3" />
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
