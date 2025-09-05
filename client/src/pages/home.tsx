import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Bake, Recipe, SensorReading, TimelineStep } from "@shared/schema";
import { safeBakeQueries, safeSensorQueries, safeRecipeQueries, safeTimelineStepQueries } from "@/lib/safeQueries";
import type { User } from "@supabase/supabase-js";
import ActiveBakeCard from "@/components/active-bake-card";
import SensorWidget from "@/components/sensor-widget";
import QuickActions from "@/components/quick-actions";
import TutorialPreview from "@/components/tutorial-preview";
import RecentBakes from "@/components/recent-bakes";
import BottomNavigation from "@/components/bottom-navigation";
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
import { Bell, LogOut, User as UserIcon, Sparkles } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";

export default function Home() {
  const { user, signOut } = useSupabaseAuth();

  // State for modals (keeping them disabled for now to avoid errors)
  const [isCreatingBake, setIsCreatingBake] = useState(false);

  // Initialize data and test connection
  useEffect(() => {
    let mounted = true;
    
    if (user && mounted) {
      // Clear stale cache data
      queryClient.removeQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key?.includes('/api/bakes/') && (key?.includes('/timeline') || key?.includes('/notes') || key?.includes('/photos'));
        }
      });
      
      // Test connection
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
  }, [user?.id]);

  // Get all bakes and filter for active ones
  const { data: allBakes } = useQuery<Bake[]>({
    queryKey: ["bakes"],
    queryFn: safeBakeQueries.getAll,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
    enabled: !!user,
  });
  
  const activeBakes = useMemo(() => 
    (allBakes || [])
      .filter((bake: Bake) => bake && bake.id && bake.status === 'active')
      .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()),
    [allBakes]
  );

  const { data: latestSensor } = useQuery<SensorReading | null>({
    queryKey: ["sensors", "latest"],
    queryFn: safeSensorQueries.getLatest,
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: !!user && activeBakes.length > 0,
  });

  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: safeRecipeQueries.getAll,
    staleTime: 10 * 60 * 1000,
    enabled: !!user,
  });

  // Mutation for creating timeline steps (without toast calls)
  const createTimelineStepsMutation = useMutation({
    mutationFn: async ({ bake, recipe }: { bake: Bake; recipe?: Recipe }) => {
      if (!recipe) {
        throw new Error('Recipe is required to create timeline steps');
      }
      
      const recipeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];
      const timelineSteps = recipeSteps.map((step, index) => ({
        bakeId: bake.id,
        stepIndex: index,
        name: step.name || `Step ${index + 1}`,
        description: step.instructions || step.description || '',
        estimatedDuration: step.durationMinutes || 60,
        actualDuration: null,
        startTime: null,
        endTime: null,
        status: 'pending' as const,
        autoAdjustments: {}
      })) || [];

      const createdSteps = [];
      for (const stepData of timelineSteps) {
        const created = await safeTimelineStepQueries.create(stepData);
        createdSteps.push(created);
      }
      
      return createdSteps;
    },
    onSuccess: (steps) => {
      queryClient.invalidateQueries({ 
        queryKey: ["timeline", steps[0]?.bakeId] 
      });
      console.log('Timeline created successfully:', steps.length, 'steps');
    },
    onError: (error) => {
      console.error('Error creating timeline steps:', error);
    },
  });

  const handleLogout = async () => {
    await signOut();
  };

  const getUserDisplayName = () => {
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
  };

  const getUserInitials = () => {
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
  };

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
          onOpenCamera={() => console.log('Camera disabled for now')}
          onOpenNotes={() => console.log('Notes disabled for now')}
          onStartBake={() => console.log('Start bake disabled for now')}
          onNewRecipe={() => console.log('New recipe disabled for now')}
          hasActiveBake={activeBakes.length > 0}
          isCreatingBake={isCreatingBake}
        />

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
                onClick={() => console.log('Bread analysis disabled for now')}
                className="bg-white text-accent-orange-600 hover:bg-orange-50 ml-4 shadow-md"
                size="sm"
              >
                Try Now
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
    </div>
  );
}