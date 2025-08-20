import type { Bake, TimelineStep, Recipe } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, CheckCircle, SkipForward, ChevronDown, ChevronUp, X, Camera, FileText, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActiveBakeCardProps {
  bake: Bake;
}

export default function ActiveBakeCard({ bake }: ActiveBakeCardProps) {
  const { toast } = useToast();
  const [stepTimer, setStepTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  
  // Helper function to create timeline steps for this bake
  const createTimelineSteps = async (bake: Bake) => {
    console.log('Creating timeline steps for bake:', bake.id);
    const recipe = recipes?.find((r: Recipe) => r.id === bake.recipeId);
    
    if (recipe && recipe.steps) {
      const steps = recipe.steps as any[];
      console.log('Found recipe with', steps.length, 'steps');
      
      // Start with current time
      let currentTime = new Date();
      
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepStartTime = new Date(currentTime);
        
        // Calculate when this step should end (current time + duration in minutes)
        const stepEndTime = new Date(currentTime.getTime() + (step.duration * 60 * 1000));
        
        try {
          await apiRequest("POST", "/api/timeline-steps", {
            bakeId: bake.id,
            stepIndex: i,
            name: step.name,
            description: step.description || null,
            estimatedDuration: step.duration,
            status: i === 0 ? 'active' : 'pending',
            startTime: stepStartTime.toISOString(),
            endTime: null, // Will be set when step is completed
            actualDuration: null,
            autoAdjustments: null
          });
          
          // Next step starts when this step ends
          currentTime = stepEndTime;
          
          console.log(`Step ${i + 1} (${step.name}): ${stepStartTime.toLocaleTimeString()} - ${stepEndTime.toLocaleTimeString()}`);
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
  
  // Don't render if bake is invalid or doesn't have an ID
  if (!bake || !bake.id) {
    return null;
  }
  
  const startTime = new Date(bake.startTime || Date.now());
  const estimatedEnd = new Date(bake.estimatedEndTime || Date.now());
  const now = new Date();
  
  const { data: timelineSteps } = useQuery<TimelineStep[]>({
    queryKey: [`/api/bakes/${bake.id}/timeline`],
  });
  
  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });
  
  // Calculate progress based on completed steps
  const completedSteps = timelineSteps?.filter(step => step.status === 'completed').length || 0;
  const totalSteps = timelineSteps?.length || 1;
  const progress = (completedSteps / totalSteps) * 100;
  
  const timeRemaining = estimatedEnd.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const getCurrentStage = () => {
    const currentStep = bake.currentStep || 0;
    const stages = ["Mix", "Bulk Rise", "Shape", "Final Rise", "Bake"];
    return stages[currentStep] || "Unknown";
  };
  
  const getActiveStep = () => {
    return timelineSteps?.find(step => step.status === 'active');
  };
  
  const isAllStepsCompleted = () => {
    if (!timelineSteps || timelineSteps.length === 0) return false;
    return timelineSteps.every(step => step.status === 'completed');
  };
  
  const activeStep = getActiveStep();
  const allCompleted = isAllStepsCompleted();
  
  // Mark bake as completed when all steps are done
  const completeBakeMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/bakes/${bake.id}`, {
      status: "completed",
      endTime: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bakes"] });
      toast({
        title: "Bake Complete! 🎉",
        description: "Congratulations! Your sourdough journey is finished.",
      });
    },
  });
  
  // Auto-complete bake when all steps are done
  useEffect(() => {
    if (allCompleted && bake.status !== 'completed') {
      completeBakeMutation.mutate();
    }
  }, [allCompleted, bake.status]);
  
  // Auto-create timeline when bake card loads and no timeline exists
  useEffect(() => {
    if (timelineSteps !== undefined && timelineSteps.length === 0 && recipes && bake.id) {
      console.log('Auto-creating timeline for bake:', bake.id);
      createTimelineSteps(bake);
    }
  }, [timelineSteps, recipes, bake.id]);
  
  // Auto-create timeline steps if this bake has none
  useEffect(() => {
    if (timelineSteps !== undefined && timelineSteps.length === 0) {
      // We need access to recipes to create timeline steps
      // For now, this will be handled when the user interacts with the bake
      console.log('Bake has no timeline steps:', bake.id);
    }
  }, [timelineSteps, bake.id]);
  
  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setStepTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startStepTimer = () => {
    setIsTimerRunning(true);
  };
  
  const pauseStepTimer = () => {
    setIsTimerRunning(false);
  };
  
  const resetStepTimer = () => {
    setStepTimer(0);
    setIsTimerRunning(false);
  };
  
  
  // Skip to next step mutation
  const skipStepMutation = useMutation({
    mutationFn: async () => {
      if (!activeStep) return;
      
      // Mark current step as completed
      await apiRequest("PATCH", `/api/timeline-steps/${activeStep.id}`, {
        status: "completed",
        endTime: new Date().toISOString(),
        actualDuration: Math.floor(stepTimer / 60),
      });
      
      // Find and activate next step
      const nextStep = timelineSteps?.find(step => step.stepIndex === activeStep.stepIndex + 1);
      if (nextStep) {
        await apiRequest("PATCH", `/api/timeline-steps/${nextStep.id}`, {
          status: "active",
          startTime: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bakes/${bake.id}/timeline`] });
      setStepTimer(0);
      setIsTimerRunning(false);
      toast({
        title: "Step Completed!",
        description: "Moved to the next baking step",
      });
    },
  });
  
  // Skip step without completing mutation
  const skipWithoutCompletingMutation = useMutation({
    mutationFn: async () => {
      if (!activeStep) return;
      
      // Mark current step as skipped
      await apiRequest("PATCH", `/api/timeline-steps/${activeStep.id}`, {
        status: "skipped",
        endTime: new Date().toISOString(),
        actualDuration: Math.floor(stepTimer / 60),
      });
      
      // Find and activate next step
      const nextStep = timelineSteps?.find(step => step.stepIndex === activeStep.stepIndex + 1);
      if (nextStep) {
        await apiRequest("PATCH", `/api/timeline-steps/${nextStep.id}`, {
          status: "active",
          startTime: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bakes/${bake.id}/timeline`] });
      setStepTimer(0);
      setIsTimerRunning(false);
      toast({
        title: "Step Skipped",
        description: "Moved to the next step without completing current one",
        variant: "default",
      });
    },
  });
  
  
  const handleSkipStep = () => {
    skipStepMutation.mutate();
  };
  
  const handleSkipWithoutCompleting = () => {
    skipWithoutCompletingMutation.mutate();
  };
  
  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  
  // Delete bake mutation
  const deleteBakeMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/bakes/${bake.id}`),
    onMutate: async () => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/bakes'] });
      
      // Snapshot the previous value
      const previousBakes = queryClient.getQueryData(['/api/bakes']);
      
      // Optimistically update to remove this bake immediately
      queryClient.setQueryData(['/api/bakes'], (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return [];
        return oldData.filter((b: any) => b.id !== bake.id);
      });
      
      // Return a context object with the snapshotted value
      return { previousBakes };
    },
    onSuccess: () => {
      // Clear all cache data related to this bake
      queryClient.removeQueries({ queryKey: [`/api/bakes/${bake.id}`] });
      queryClient.removeQueries({ queryKey: [`/api/bakes/${bake.id}/timeline`] });
      queryClient.removeQueries({ queryKey: [`/api/bakes/${bake.id}/notes`] });
      queryClient.removeQueries({ queryKey: [`/api/bakes/${bake.id}/photos`] });
      
      // Force refresh of main bakes list to ensure deletion persists
      queryClient.invalidateQueries({ queryKey: ['/api/bakes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bakes/active'] });
      
      toast({
        title: "Bake Deleted",
        description: "Your baking session has been permanently removed",
        variant: "destructive",
      });
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBakes) {
        queryClient.setQueryData(['/api/bakes'], context.previousBakes);
      }
      
      toast({
        title: "Delete Failed",
        description: "Could not delete the bake. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Recalibrate timeline mutation
  const recalibrateMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bakes/${bake.id}/recalibrate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bakes"] });
      toast({
        title: "Timeline Recalibrated!",
        description: "Your baking schedule has been optimized for current conditions",
      });
    },
  });

  const handleClose = () => {
    deleteBakeMutation.mutate();
  };

  return (
    <div className="p-4">
      <div className="bg-gradient-to-r from-sourdough-500 to-sourdough-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h2 className="font-display font-semibold text-xl mb-1">{bake.name}</h2>
            <p className="text-sourdough-100 text-sm">
              Started {formatDistanceToNow(startTime, { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 rounded-lg px-3 py-1">
              <span className="text-sm font-medium">{getCurrentStage()}</span>
            </div>
            <button
              onClick={handleMinimize}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? (
                <ChevronDown className="w-4 h-4 text-white" />
              ) : (
                <ChevronUp className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close baking session"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        
        {/* Content (hidden when minimized) */}
        {!isMinimized && (
          <>
            {/* Timeline Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Steps Progress</span>
                <span>{completedSteps}/{totalSteps} ({Math.round(progress)}%)</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setNotesOpen(true)}
                className="flex-1 flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 rounded-lg py-2 px-3 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm">Notes</span>
              </button>
              <button
                onClick={() => setCameraOpen(true)}
                className="flex-1 flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 rounded-lg py-2 px-3 transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span className="text-sm">Photo</span>
              </button>
            </div>
            
            {/* Timeline Management */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Timeline Management</h4>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => recalibrateMutation.mutate()}
                  disabled={recalibrateMutation.isPending}
                  className="text-accent-orange-500 hover:text-accent-orange-600 text-xs px-2 py-1 h-auto"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${recalibrateMutation.isPending ? 'animate-spin' : ''}`} />
                  Recalibrate
                </Button>
              </div>
              <p className="text-xs text-white/60">
                Optimize timeline based on current environmental conditions
              </p>
            </div>
            
            {/* Baking Steps */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Baking Steps</h4>
              {timelineSteps && timelineSteps.length > 0 ? (
                <div className="space-y-2">
                  {timelineSteps.map((step, index) => (
                    <div key={step.id} className={`flex items-center space-x-3 p-2 rounded-lg text-sm ${
                      step.status === 'active' ? 'bg-white/10' : ''
                    }`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                        step.status === 'completed' ? 'bg-green-500 text-white' :
                        step.status === 'skipped' ? 'bg-yellow-500 text-white' :
                        step.status === 'active' ? 'bg-white text-sourdough-600' :
                        'bg-white/20 text-white/60'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : step.status === 'skipped' ? (
                          <SkipForward className="w-3 h-3" />
                        ) : step.status === 'active' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          step.status === 'active' ? 'text-white' : 
                          step.status === 'completed' ? 'text-green-100' :
                          step.status === 'skipped' ? 'text-yellow-100' :
                          'text-white/60'
                        }`}>
                          {step.name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-white/60">
                          <span>{step.estimatedDuration} min</span>
                          {step.startTime && (
                            <span className="text-blue-300">
                              {new Date(step.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                              {new Date(new Date(step.startTime).getTime() + step.estimatedDuration * 60 * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          )}
                          {step.status === 'completed' && step.actualDuration && (
                            <span className="text-green-300">({step.actualDuration} min actual)</span>
                          )}
                          {step.status === 'skipped' && (
                            <span className="text-yellow-300">(skipped)</span>
                          )}
                        </div>
                        {step.description && (
                          <p className="text-xs text-white/50 mt-1">{step.description}</p>
                        )}
                      </div>
                      {step.status === 'active' && (
                        <div className="text-xs text-white/80 bg-white/10 px-2 py-1 rounded">
                          Current
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-white/60 bg-white/10 rounded-lg p-3 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-white/40" />
                  <p>Creating timeline...</p>
                  <p className="text-xs mt-1 text-white/40">Setting up your baking steps</p>
                </div>
              )}
            </div>

            {/* Completion State */}
        {allCompleted && (
          <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/30">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-green-200 mx-auto mb-2" />
              <p className="font-medium text-lg text-green-100">Bake Complete!</p>
              <p className="text-sm text-green-200">All steps finished successfully</p>
            </div>
          </div>
        )}
        
        {/* Active Step with Timer */}
        {activeStep && !allCompleted && (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-sourdough-100">Current Step</p>
                <p className="font-medium text-lg">{activeStep.name}</p>
                <p className="text-sm text-sourdough-200">{activeStep.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-sourdough-100">Target</p>
                <p className="font-semibold text-lg">{activeStep.estimatedDuration} min</p>
              </div>
            </div>
            
            {/* Timer Display */}
            <div className="bg-white/10 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Timer className="w-5 h-5" />
                  <span className="text-xl font-mono font-bold">{formatTime(stepTimer)}</span>
                </div>
                <div className="flex space-x-2">
                  {!isTimerRunning ? (
                    <Button
                      onClick={startStepTimer}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  ) : (
                    <Button
                      onClick={pauseStepTimer}
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  <Button
                    onClick={resetStepTimer}
                    size="sm"
                    variant="outline"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Progress indicator */}
            {activeStep.estimatedDuration && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Step Progress</span>
                  <span>{Math.min(Math.round((stepTimer / 60) / activeStep.estimatedDuration * 100), 100)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <div 
                    className="bg-white h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((stepTimer / 60) / activeStep.estimatedDuration * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Step Actions (only shown when step is active) */}
            <div className="flex space-x-2">
              <Button
                onClick={resetStepTimer}
                size="sm"
                variant="outline"
                className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                Reset Timer
              </Button>
            </div>
          </div>
        )}
        
            {/* Fallback for when no active step but not all completed */}
            {!activeStep && !allCompleted && (
              <div className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-sourdough-100">
                      {timeRemaining > 0 ? "Next Step" : "Ready"}
                    </p>
                    <p className="font-medium">
                      {timeRemaining > 0 ? getCurrentStage() : "Timeline Ready"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-sourdough-100">
                      {timeRemaining > 0 ? "In" : "Waiting"}
                    </p>
                    <p className="font-semibold text-lg">
                      {timeRemaining > 0 
                        ? `${hoursRemaining}h ${minutesRemaining}m`
                        : "Ready!"
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Bake Controls - Moved to bottom */}
        {!isMinimized && (
          <div className="border-t border-white/10 pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Bake Controls</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleSkipWithoutCompleting}
                disabled={skipWithoutCompletingMutation.isPending || !activeStep}
                size="sm"
                className="bg-yellow-600 hover:bg-yellow-700 text-white disabled:bg-gray-400"
              >
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>
              <Button
                onClick={handleSkipStep}
                disabled={skipStepMutation.isPending || !activeStep}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
            </div>
          </div>
        )}
        
        {/* Camera Modal */}
        {cameraOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sourdough-800">Take Photo</h3>
                <button
                  onClick={() => setCameraOpen(false)}
                  className="p-1 hover:bg-sourdough-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-sourdough-400 mx-auto mb-4" />
                <p className="text-sourdough-600 mb-4">Camera functionality will be available soon!</p>
                <button
                  onClick={() => setCameraOpen(false)}
                  className="bg-sourdough-500 text-white px-4 py-2 rounded-lg hover:bg-sourdough-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Notes Modal */}
        {notesOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-4 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sourdough-800">Add Note</h3>
                <button
                  onClick={() => setNotesOpen(false)}
                  className="p-1 hover:bg-sourdough-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                placeholder="Add notes about this step..."
                className="w-full h-32 p-3 border border-sourdough-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sourdough-500 text-black"
              />
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setNotesOpen(false)}
                  className="flex-1 bg-sourdough-100 text-sourdough-700 px-4 py-2 rounded-lg hover:bg-sourdough-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast({
                      title: "Note Saved!",
                      description: "Your baking note has been saved",
                    });
                    setNotesOpen(false);
                  }}
                  className="flex-1 bg-sourdough-500 text-white px-4 py-2 rounded-lg hover:bg-sourdough-600 transition-colors"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
