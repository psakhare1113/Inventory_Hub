import { useUpdates } from "../hooks/use-updates";
import { Clock } from "lucide-react";

export function UpdatesFeed() {
  const { data: updates, isLoading } = useUpdates();

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-gray-800">Recent Updates</h4>
        <button className="text-sm font-semibold text-purple-600 hover:text-purple-700">View All</button>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center text-gray-400">Loading updates...</div>
        ) : (
          updates?.map((update) => (
            <div key={update.id} className="relative pl-6 pb-6 border-l border-gray-100 last:pb-0">
              {/* Timeline Dot */}
              <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-purple-50"></div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-900">{update.userName}</span>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  {update.timestamp}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{update.content}</p>
              
              {/* Image Grid if images exist */}
              {update.images && update.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {update.images.map((img, i) => (
                    <img key={i} src={img} alt="Update" className="w-full h-16 object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
