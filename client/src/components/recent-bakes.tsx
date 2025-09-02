import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { safeBakeQueries } from "@/lib/safeQueries";
import type { Bake, BakePhoto } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Share2, RefreshCw, FileText, X, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";

export default function RecentBakes() {
  const { toast } = useToast();
  const { data: bakes } = useQuery<Bake[]>({
    queryKey: ["bakes"],
    queryFn: safeBakeQueries.getAll,
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

  // Restart bake mutation
  const restartBakeMutation = useMutation({
    mutationFn: async (bake: Bake) => {
      return bakeQueries.create({
        recipeId: bake.recipeId,
        name: `${bake.name} (Restart)`,
        status: "active",
        startTime: new Date(),
        currentStep: 0,
        estimatedEndTime: null,
        actualEndTime: null,
        environmentalData: null,
        timelineAdjustments: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakes"] });
      toast({
        title: "Bake Restarted! 🍞",
        description: "Your new baking session has begun",
      });
    },
  });

  const [, setLocation] = useLocation();

  const handleRebake = (bake: Bake) => {
    restartBakeMutation.mutate(bake);
  };
  
  const handleViewDetails = (bake: Bake) => {
    // Navigate to recent tab
    setLocation('/recent-bakes');
  };

  const completedBakes = bakes?.filter(bake => bake.status === 'completed') || [];
  const recentBakes = completedBakes.slice(0, 4); // Show last 4 completed bakes

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sourdough-800">Recent Bakes</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-accent-orange-500"
          onClick={() => setLocation('/recent-bakes')}
        >
          View All
        </Button>
      </div>
      
      {recentBakes.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {recentBakes.map((bake) => (
            <div 
              key={bake.id} 
              className="relative group"
            >
              {/* Placeholder image - in a real app, this would be from BakePhoto */}
              <img 
                src="https://images.unsplash.com/photo-1549931319-a545dcf3bc73?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                alt={bake.name}
                className="w-full h-32 object-cover rounded-xl"
              />
              
              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex space-x-1">
                <button 
                  data-details
                  onClick={() => handleViewDetails(bake)}
                  className="bg-white/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="View details"
                >
                  <FileText className="w-3 h-3 text-sourdough-600" />
                </button>
                <button 
                  data-share
                  onClick={() => handleShare(bake)}
                  className="bg-white/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Share"
                >
                  <Share2 className="w-3 h-3 text-sourdough-600" />
                </button>
              </div>
              
              <div className="mt-2">
                <h4 className="font-medium text-sm text-sourdough-800">{bake.name}</h4>
                <p className="text-xs text-sourdough-500 mb-2">
                  {bake.actualEndTime 
                    ? `Completed ${formatDistanceToNow(new Date(bake.actualEndTime), { addSuffix: true })}`
                    : 'Completed recently'
                  }
                </p>
                
                {/* Rebake Button */}
                <Button
                  onClick={() => handleRebake(bake)}
                  disabled={restartBakeMutation.isPending}
                  size="sm"
                  variant="outline"
                  className="w-full text-xs py-1 h-7 border-sourdough-300 text-sourdough-700 hover:bg-sourdough-50 hover:border-sourdough-400"
                  data-testid={`button-rebake-${bake.id}`}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {restartBakeMutation.isPending ? "Starting..." : "Rebake"}
                </Button>
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
