import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Bake, Recipe, SensorReading, TimelineStep, User } from "@shared/schema";
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
import NewRecipeModal from "@/components/new-recipe-modal";
import { useState, useEffect } from "react";
import { Bell, LogOut, User as UserIcon } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function Home() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [startBakeOpen, setStartBakeOpen] = useState(false);
  const [newRecipeOpen, setNewRecipeOpen] = useState(false);
  const [isCreatingBake, setIsCreatingBake] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getUserDisplayName = () => {
    const typedUser = user as User;
    if (typedUser?.firstName && typedUser?.lastName) {
      return `${typedUser.firstName} ${typedUser.lastName}`;
    }
    if (typedUser?.firstName) {
      return typedUser.firstName;
    }
    if (typedUser?.email) {
      return typedUser.email;
    }
    return "User";
  };

  const getUserInitials = () => {
    const typedUser = user as User;
    if (typedUser?.firstName && typedUser?.lastName) {
      return `${typedUser.firstName[0]}${typedUser.lastName[0]}`.toUpperCase();
    }
    if (typedUser?.firstName) {
      return typedUser.firstName[0].toUpperCase();
    }
    if (typedUser?.email) {
      return typedUser.email[0].toUpperCase();
    }
    return "U";
  };
  
  // Clear any stale bake cache data on component mount
  useEffect(() => {
    // Clear all bake-related cache on mount to ensure fresh data
    queryClient.removeQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.includes('/api/bakes/') && (key?.includes('/timeline') || key?.includes('/notes') || key?.includes('/photos'));
      }
    });
  }, []);

  // Get all bakes and filter for active ones
  const { data: allBakes } = useQuery<Bake[]>({
    queryKey: ["/api/bakes"],
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
  
  const activeBakes = (allBakes || [])
    .filter((bake: Bake) => bake && bake.id && bake.status === 'active')
    .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()); // Sort by newest first

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
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-sm border-b border-sourdough-100 dark:border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={crumbCoachLogo} 
              alt="Crumb Coach" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="font-display font-semibold text-lg text-sourdough-800 dark:text-white">Crumb Coach</h1>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={(user as User)?.profileImageUrl || ''} alt={getUserDisplayName()} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{getUserDisplayName()}</p>
                    {(user as User)?.email && (
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {(user as User).email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="pb-20">
        {/* Active Bake Cards */}
        {activeBakes.length > 0 ? (
          <div className="space-y-4">
            {/* Show all active bakes */}
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
          onStartBake={() => {
            if (!startBakeOpen && !isCreatingBake) {
              setStartBakeOpen(true);
            }
          }}
          onNewRecipe={() => setNewRecipeOpen(true)}
          hasActiveBake={activeBakes.length > 0}
          isCreatingBake={isCreatingBake}
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
        onClose={() => {
          setStartBakeOpen(false);
          setIsCreatingBake(false);
        }}
        onBakeStarted={() => setIsCreatingBake(true)}
      />
      <NewRecipeModal
        isOpen={newRecipeOpen}
        onClose={() => setNewRecipeOpen(false)}
      />
    </div>
  );
}
