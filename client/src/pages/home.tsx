import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Bake, Recipe, SensorReading, TimelineStep } from "@shared/schema";
import { safeBakeQueries, safeSensorQueries, safeRecipeQueries, safeTimelineStepQueries } from "@/lib/safeQueries";
import type { User } from "@supabase/supabase-js";
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
import RecipeModal from "@/components/recipe-modal";
import BreadAnalysisModal from "@/components/bread-analysis-modal";
// Direct default import - matches "export default AskGemini"
import AskGemini from "@/components/ask-gemini";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Bell, LogOut, User as UserIcon, Sparkles } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { testSupabaseConnection, testDatabaseTables } from "@/lib/testSupabase";
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
  const { user, signOut } = useSupabaseAuth();

  const [cameraOpen, setCameraOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [startBakeOpen, setStartBakeOpen] = useState(false);
  const [newRecipeOpen, setNewRecipeOpen] = useState(false);
  const [breadAnalysisOpen, setBreadAnalysisOpen] = useState(false);
  const [askGeminiOpen, setAskGeminiOpen] = useState(false);
  const [isCreatingBake, setIsCreatingBake] = useState(false);

  const handleLogout = useCallback(async () => {
    await signOut();
    // The auth state change will automatically redirect to auth page
  }, [signOut]);

  const getUserDisplayName = useMemo(() => {
    if (user?.user_metadata?.firstName && user?.user_metadata?.lastName) {
      return `${user.user_metadata.firstName} ${user.user_metadata.lastName}`;
    }
    if (user?.user_metadata?.firstName) {
      return user.user_metadata.firstName;
    }
    if (user?.email) {
      return user.email;
    }
    return "User";
  }, [user?.user_metadata?.firstName, user?.user_metadata?.lastName, user?.email]);

  const getUserInitials = useMemo(() => {
    if (user?.user_metadata?.firstName && user?.user_metadata?.lastName) {
      return `${user.user_metadata.firstName[0]}${user.user_metadata.lastName[0]}`.toUpperCase();
    }
    if (user?.user_metadata?.firstName) {
      return user.user_metadata.firstName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  }, [user?.user_metadata?.firstName, user?.user_metadata?.lastName, user?.email]);
  
  // Initialize data and test connection only once
  useEffect(() => {
    let mounted = true;
    
    // Only clear cache and test connection if user just logged in
    if (user && mounted) {
      // Clear only stale bake-related cache data once
      queryClient.removeQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/bakes/') && (key?.includes('/timeline') || key?.includes('/notes') || key?.includes('/photos'));
        }
      });
      
      // Test connection once per session
      const testConnection = async () => {
        try {
          const result = await testSupabaseConnection();
          if (mounted) console.log('Supabase connection test result:', result);
          if (result.success && mounted) {
            const tableResult = await testDatabaseTables();
            if (mounted) console.log('Database tables test result:', tableResult);
          }
        } catch (error) {
          if (mounted) console.error('Connection test error:', error);
        }
      };
      
      testConnection();
    }
    
    return () => { mounted = false; };
  }, [user?.id]); // Only run when user ID changes

  // Get all bakes and filter for active ones
  const { data: allBakes } = useQuery<Bake[]>({
    queryKey: ["bakes"],
    queryFn: safeBakeQueries.getAll,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
    refetchOnMount: "always",
    enabled: !!user, // Only query when user is authenticated
  });
  
  const activeBakes = useMemo(() => 
    (allBakes || [])
      .filter((bake: Bake) => bake && bake.id && bake.status === 'active')
      .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()),
    [allBakes]
  ); // Memoize expensive filtering and sorting

  const { data: latestSensor } = useQuery<SensorReading | null>({
    queryKey: ["sensors", "latest"],
    queryFn: safeSensorQueries.getLatest,
    refetchInterval: 60000, // Reduced to refresh every 60 seconds to reduce load
    staleTime: 30000, // Consider data fresh for 30 seconds
    enabled: !!user && activeBakes.length > 0, // Only query if there are active bakes
  });

  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: safeRecipeQueries.getAll,
    staleTime: 10 * 60 * 1000, // Recipes don't change often - 10 minutes
    enabled: !!user,
  });

  // Timeline data is now handled individually by each ActiveBakeCard

  // Mutation for creating timeline steps
  const createTimelineStepsMutation = useMutation({
    mutationFn: async ({ bake, recipe }: { bake: Bake; recipe?: Recipe }) => {
      if (!recipe) {
        throw new Error('Recipe is required to create timeline steps');
      }
      
      // Generate timeline steps based on recipe steps
      const recipeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];
      const timelineSteps = recipeSteps.map((step, index) => ({
        bakeId: bake.id,
        stepIndex: index,
        name: step.name || `Step ${index + 1}`,
        description: step.instructions || step.description || '',
        estimatedDuration: step.durationMinutes || 60, // Default 1 hour if not specified
        actualDuration: null,
        startTime: null,
        endTime: null,
        status: 'pending' as const,
        autoAdjustments: {}
      })) || [];

      // Create each timeline step in Supabase
      const createdSteps = [];
      for (const stepData of timelineSteps) {
        const created = await safeTimelineStepQueries.create(stepData);
        createdSteps.push(created);
      }
      
      return createdSteps;
    },
    onSuccess: (steps) => {
      // Invalidate and refetch timeline data for the bake
      queryClient.invalidateQueries({ 
        queryKey: ["timeline", steps[0]?.bakeId] 
      });
      
      toast({
        title: "Timeline Created",
        description: `Created ${steps.length} timeline steps for your bake`,
      });
    },
    onError: (error) => {
      console.error('Error creating timeline steps:', error);
      toast({
        title: "Timeline Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create timeline steps",
        variant: "destructive",
      });
    },
  });

  // Helper function to create timeline steps for existing bake
  const createTimelineSteps = async (bake: Bake) => {
    try {
      // Find the recipe for this bake
      const recipe = recipes?.find(r => r.id === bake.recipeId);
      if (!recipe) {
        throw new Error('Recipe not found for this bake');
      }

      // Check if timeline steps already exist for this bake
      const existingSteps = await safeTimelineStepQueries.getByBakeId(bake.id);
      if (existingSteps && existingSteps.length > 0) {
        toast({
          title: "Timeline Already Exists",
          description: "This bake already has timeline steps",
          variant: "destructive",
        });
        return;
      }

      // Create the timeline steps
      createTimelineStepsMutation.mutate({ bake, recipe });
    } catch (error) {
      console.error('Error in createTimelineSteps:', error);
      toast({
        title: "Timeline Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create timeline",
        variant: "destructive",
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
            <h1 className="font-display font-semibold text-lg sm:text-xl md:text-2xl text-sourdough-800 dark:text-white">Crumb Coach</h1>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.profileImageUrl || ''} alt={getUserDisplayName()} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm sm:text-base">{getUserDisplayName()}</p>
                    {user?.email && (
                      <p className="w-[200px] truncate text-xs sm:text-sm text-muted-foreground">
                        {user.email}
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
              <p className="text-sm sm:text-base text-sourdough-600 mb-2">No active bakes</p>
              <p className="text-xs sm:text-sm text-sourdough-500">Start a new bake to begin your sourdough journey</p>
            </div>
          </div>
        )}

        {/* Sensor Data */}
        <SensorWidget reading={latestSensor || undefined} />

        
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

        {/* AI Features */}
        <div className="px-4 mb-6 space-y-4">
          {/* AI Bread Analysis Feature */}
          <div className="bg-gradient-to-r from-accent-orange-500 to-accent-orange-600 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-semibold">AI Bread Analysis</h3>
                </div>
                <p className="text-sm text-orange-100 leading-relaxed">
                  Upload a photo of your bread and get expert AI feedback on crumb structure, crust, and tips for improvement.
                </p>
              </div>
              <Button 
                onClick={() => setBreadAnalysisOpen(true)}
                className="bg-white text-accent-orange-600 hover:bg-orange-50 ml-4 shadow-md"
                size="sm"
              >
                Try Now
              </Button>
            </div>
          </div>

          {/* Ask Gemini Feature */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-semibold">Ask Gemini AI</h3>
                </div>
                <p className="text-sm text-blue-100 leading-relaxed">
                  Get instant answers to your sourdough questions from Google's AI assistant.
                </p>
              </div>
              <Button 
                onClick={() => setAskGeminiOpen?.(true)}
                className="bg-white text-blue-600 hover:bg-blue-50 ml-4 shadow-md"
                size="sm"
              >
                Ask AI
              </Button>
            </div>
          </div>
        </div>

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
      <RecipeModal
        isOpen={newRecipeOpen}
        onClose={() => setNewRecipeOpen(false)}
      />
      {typeof BreadAnalysisModal === 'function' ? (
        <BreadAnalysisModal
          open={breadAnalysisOpen}
          onOpenChange={setBreadAnalysisOpen}
        />
      ) : (
        breadAnalysisOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <p>AI Bread Analysis feature is temporarily unavailable.</p>
              <button 
                onClick={() => setBreadAnalysisOpen(false)}
                className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        )
      )}
      <AskGemini
        open={askGeminiOpen || false}
        onOpenChange={setAskGeminiOpen}
        context={activeBakes?.length > 0 ? `Active bake: ${activeBakes[0]?.recipeName}` : undefined}
      />
    </div>
  );
}
