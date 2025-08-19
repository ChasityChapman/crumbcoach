import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Bake, Recipe, SensorReading, TimelineStep } from "@shared/schema";
import ActiveBakeCard from "@/components/active-bake-card";
import SensorWidget from "@/components/sensor-widget";
import QuickActions from "@/components/quick-actions";
import TimelineView from "@/components/timeline-view";
import TutorialPreview from "@/components/tutorial-preview";
import RecentBakes from "@/components/recent-bakes";
import BottomNavigation from "@/components/bottom-navigation";
import CameraModal from "@/components/camera-modal";
import NotesModal from "@/components/notes-modal";
import StartBakeModal from "@/components/start-bake-modal";
import { useState, useEffect } from "react";
import { Wheat, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [startBakeOpen, setStartBakeOpen] = useState(false);

  // Get all bakes and filter for active ones
  const { data: allBakes } = useQuery<Bake[]>({
    queryKey: ["/api/bakes"],
  });
  
  const activeBakes = allBakes?.filter(bake => bake.status === 'active') || [];

  const { data: latestSensor } = useQuery<SensorReading | null>({
    queryKey: ["/api/sensors/latest"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  // Timeline data is now handled individually by each ActiveBakeCard

  // Helper function to create timeline steps for existing bake
  const createTimelineSteps = async (bake: Bake) => {
    console.log('Creating timeline steps for existing bake:', bake.id);
    const recipe = recipes?.find(r => r.id === bake.recipeId);
    
    if (recipe && recipe.steps) {
      const steps = recipe.steps as any[];
      console.log('Found recipe with', steps.length, 'steps');
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        try {
          const timelineStep = await apiRequest("POST", "/api/timeline-steps", {
            bakeId: bake.id,
            stepIndex: i,
            name: step.name,
            description: step.description || null,
            estimatedDuration: step.duration,
            status: i === 0 ? 'active' : 'pending',
            startTime: i === 0 ? new Date().toISOString() : null,
            endTime: null,
            actualDuration: null,
            autoAdjustments: null
          });
          console.log('Created timeline step:', timelineStep);
        } catch (error) {
          console.error('Failed to create timeline step:', error);
        }
      }
      
      // Refresh timeline after creation
      queryClient.invalidateQueries({ queryKey: [`/api/bakes/${bake.id}/timeline`] });
      
      toast({
        title: "Timeline Created!",
        description: "Your baking timeline is now ready",
      });
    }
  };

  // Timeline creation is now handled by individual ActiveBakeCard components

  return (
    <div className="min-h-screen bg-sourdough-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center">
              <Wheat className="text-white w-4 h-4" />
            </div>
            <h1 className="font-display font-semibold text-lg text-sourdough-800">SourDough Pro</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-sourdough-600">Live</span>
            <button className="p-2 text-sourdough-600">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="pb-20">
        {/* Active Bake Cards */}
        {activeBakes.length > 0 ? (
          <div className="space-y-1">
            {activeBakes.map((bake) => (
              <ActiveBakeCard key={bake.id} bake={bake} />
            ))}
          </div>
        ) : (
          <div className="p-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-sourdough-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">🍞</span>
              </div>
              <p className="text-sourdough-600 mb-2">No active bakes</p>
              <p className="text-sm text-sourdough-500">Start a new bake to begin your sourdough journey</p>
            </div>
          </div>
        )}

        {/* Sensor Data */}
        <SensorWidget reading={latestSensor} />

        {/* Quick Actions */}
        <QuickActions
          onOpenCamera={() => setCameraOpen(true)}
          onOpenNotes={() => setNotesOpen(true)}
          onStartBake={() => setStartBakeOpen(true)}
          hasActiveBake={activeBakes.length > 0}
        />

        {/* Note: Timeline view is now integrated into each ActiveBakeCard */}

        {/* Tutorial Preview */}
        <TutorialPreview />

        {/* Recent Bakes */}
        <RecentBakes />
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation currentPath="/" />

      {/* Modals */}
      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        bakeId={activeBakes[0]?.id}
      />
      <NotesModal
        isOpen={notesOpen}
        onClose={() => setNotesOpen(false)}
        bakeId={activeBakes[0]?.id}
      />
      <StartBakeModal
        isOpen={startBakeOpen}
        onClose={() => setStartBakeOpen(false)}
      />
    </div>
  );
}
