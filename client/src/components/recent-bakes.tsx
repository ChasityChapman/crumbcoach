import { useQuery } from "@tanstack/react-query";
import type { Bake, BakePhoto } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecentBakes() {
  const { data: bakes } = useQuery<Bake[]>({
    queryKey: ["/api/bakes"],
  });

  const handleShare = async (bake: Bake) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${bake.name} Bake`,
          text: `Check out my latest sourdough bake: ${bake.name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    }
  };

  const completedBakes = bakes?.filter(bake => bake.status === 'completed') || [];
  const recentBakes = completedBakes.slice(0, 4); // Show last 4 completed bakes

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sourdough-800">Recent Bakes</h3>
        <Button variant="ghost" size="sm" className="text-accent-orange-500">
          View All
        </Button>
      </div>
      
      {recentBakes.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {recentBakes.map((bake) => (
            <div key={bake.id} className="relative group">
              {/* Placeholder image - in a real app, this would be from BakePhoto */}
              <img 
                src="https://images.unsplash.com/photo-1549931319-a545dcf3bc73?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                alt={bake.name}
                className="w-full h-32 object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl">
                <button 
                  onClick={() => handleShare(bake)}
                  className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Share2 className="w-3 h-3 text-sourdough-600" />
                </button>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-sourdough-800">{bake.name}</p>
                <p className="text-xs text-sourdough-500">
                  {bake.actualEndTime 
                    ? formatDistanceToNow(new Date(bake.actualEndTime), { addSuffix: true })
                    : 'Recently completed'
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-sourdough-200 rounded-full mx-auto mb-3 flex items-center justify-center">
            <span className="text-2xl">🍞</span>
          </div>
          <p className="text-sourdough-600">No completed bakes yet</p>
          <p className="text-sm text-sourdough-500">Start your first bake to see photos here</p>
        </div>
      )}
    </div>
  );
}
