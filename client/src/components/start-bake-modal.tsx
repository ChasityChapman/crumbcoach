import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { safeFind, safeMap } from "@/lib/safeArray";
import { safeRecipeQueries } from "@/lib/safeQueries";
import type { Recipe, Bake, InsertBake } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Users, ChefHat, AlertTriangle, CheckCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSensors } from "@/hooks/use-sensors";
import { timelineAnalytics } from "@/lib/timeline-analytics";
import { StarterHealthHelper } from "@/lib/starterHealthHelper";
import { timelineCalculator } from "@/lib/timeline";
import type { StarterCondition } from "@/lib/timeline";

interface RecipeStep {
  id: string;
  name: string;
  duration: number;
  description: string;
}

interface StartBakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBakeStarted?: () => void;
}

export default function StartBakeModal({ isOpen, onClose, onBakeStarted }: StartBakeModalProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState("none");
  const [bakeName, setBakeName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [starterCondition, setStarterCondition] = useState<StarterCondition | null>(null);
  const [showStarterAdvice, setShowStarterAdvice] = useState(false);
  const { toast } = useToast();
  const { sensorData } = useSensors();

  const { data: recipes, isLoading, error } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: safeRecipeQueries.getAll,
    staleTime: 10 * 60 * 1000,
  });

  // Load starter condition when modal opens
  useEffect(() => {
    if (isOpen) {
      StarterHealthHelper.getCurrentStarterCondition()
        .then(condition => {
          setStarterCondition(condition);
          if (condition && (condition.healthStatus !== 'healthy' || condition.stage !== 'peak')) {
            setShowStarterAdvice(true);
          }
        })
        .catch(error => {
          console.warn('Failed to load starter condition:', error);
          // Fall back to demo healthy condition
          setStarterCondition(StarterHealthHelper.getDemoStarterCondition('healthy'));
        });
    }
  }, [isOpen]);

  // Debug logging for recipes
  useEffect(() => {
    console.log('StartBakeModal - Recipes data:', {
      recipes,
      recipesLength: recipes?.length,
      isLoading,
      error
    });
  }, [recipes, isLoading, error]);

  const startBakeMutation = useMutation({
    mutationFn: async (bakeData: InsertBake) => {
      const response = await apiRequest("POST", "/api/bakes", bakeData);
      return response.json();
    },
    onSuccess: async (newBake: Bake) => {
      setIsSubmitting(false);
      console.log('New bake created:', newBake);
      // Create timeline steps for the new bake
      const recipe = safeFind(recipes, r => r.id === selectedRecipeId);
      console.log('Recipe found:', recipe);
      console.log('Recipe steps:', recipe?.steps);
      
      if (recipe && recipe.steps && newBake && newBake.id) {
        const steps = recipe.steps as RecipeStep[];
        console.log('Creating', steps.length, 'timeline steps with environmental adjustments');
        
        // Calculate environmental adjustments with starter condition
        let adjustedSteps = steps;
        try {
          const environmentalConditions = {
            temperature: sensorData?.temperature || 22, // Default room temp
            humidity: sensorData?.humidity || 60, // Default humidity
          };

          const timelineSteps = steps.map(step => ({
            id: step.id,
            name: step.name,
            estimatedDuration: step.duration,
            temperature: step.name.includes('Fermentation') ? 24 : (step.name.includes('Rise') ? 22 : undefined),
            humidity: step.name.includes('Fermentation') || step.name.includes('Rise') ? 65 : undefined
          }));

          const adjustments = await timelineCalculator.calculateSmartAdjustments(
            environmentalConditions,
            timelineSteps,
            starterCondition || undefined
          );

          console.log('Timeline adjustments calculated:', adjustments);
          
          // Apply adjustments to steps
          adjustedSteps = steps.map((step, index) => {
            const adjustment = adjustments.adjustments.find(adj => adj.stepId === step.id);
            return {
              ...step,
              duration: adjustment ? adjustment.adjustedDuration : step.duration,
              adjustmentFactors: adjustment?.factors || []
            };
          });

        } catch (adjustmentError) {
          console.warn('Failed to calculate timeline adjustments:', adjustmentError);
        }
        
        for (let i = 0; i < adjustedSteps.length; i++) {
          const step = adjustedSteps[i];
          console.log('Creating timeline step:', {
            bakeId: newBake.id,
            stepIndex: i,
            name: step.name,
            estimatedDuration: step.duration,
            status: i === 0 ? 'active' : 'pending',
            adjustmentFactors: (step as any).adjustmentFactors
          });
          
          try {
            const timelineStep = await apiRequest("POST", "/api/timeline-steps", {
              bakeId: newBake.id,
              stepIndex: i,
              name: step.name,
              description: step.description || null,
              estimatedDuration: step.duration,
              status: i === 0 ? 'active' : 'pending',
              startTime: i === 0 ? new Date().toISOString() : null,
              endTime: null,
              actualDuration: null,
              autoAdjustments: JSON.stringify({
                factors: (step as any).adjustmentFactors || [],
                starterCondition: starterCondition,
                environmentalConditions: {
                  temperature: sensorData?.temperature || 22,
                  humidity: sensorData?.humidity || 60,
                },
                calculatedAt: new Date().toISOString()
              })
            });
            console.log('Timeline step created:', timelineStep);
          } catch (error) {
            console.error('Failed to create timeline step:', error);
          }
        }
      } else {
        console.log('Missing data for timeline creation:', {
          hasRecipe: !!recipe,
          hasSteps: !!(recipe?.steps),
          hasBake: !!newBake,
          hasBakeId: !!(newBake?.id)
        });
      }

      // Track bake start analytics
      if (recipe && newBake) {
        const steps = recipe.steps as RecipeStep[] || [];
        const totalDuration = steps.reduce((sum, step) => sum + (step.duration || 0), 0);
        
        timelineAnalytics.trackBakeStart({
          bakeId: newBake.id,
          recipeId: recipe.id,
          recipeName: recipe.name,
          totalSteps: steps.length,
          estimatedDurationMinutes: totalDuration,
          startTime: new Date()
        });
      }

      // Force refresh the bakes list to show the new bake
      queryClient.invalidateQueries({ queryKey: ["/api/bakes"] });
      queryClient.refetchQueries({ queryKey: ["/api/bakes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/bakes/${newBake.id}/timeline`] });
      
      toast({
        title: "Bake started!",
        description: `Your ${bakeName} bake has begun. Happy baking!`,
      });
      
      onClose();
      setBakeName("");
      setSelectedRecipeId("");
      setIsSubmitting(false);
    },
    onError: () => {
      setIsSubmitting(false);
      toast({
        title: "Failed to start bake",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const selectedRecipe = safeFind(recipes, r => r.id === selectedRecipeId);

  // Helper functions for starter condition display
  const getHealthStatusIcon = (status: StarterCondition['healthStatus']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'watch': return <Eye className="w-4 h-4 text-amber-600" />;
      case 'sluggish': return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
  };

  const getHealthStatusColor = (status: StarterCondition['healthStatus']) => {
    switch (status) {
      case 'healthy': return 'bg-green-50 border-green-200';
      case 'watch': return 'bg-amber-50 border-amber-200';
      case 'sluggish': return 'bg-red-50 border-red-200';
    }
  };

  const getStageDisplayName = (stage: StarterCondition['stage']) => {
    switch (stage) {
      case 'just_fed': return 'Just Fed';
      case 'peak': return 'Peak Activity';
      case 'collapsing': return 'Past Peak';
      case 'sluggish': return 'Sluggish';
      default: return stage;
    }
  };

  const handleStartBake = () => {
    if (isSubmitting || startBakeMutation.isPending) {
      return; // Prevent multiple submissions
    }
    
    if (!selectedRecipeId || !bakeName.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a recipe and enter a name for your bake.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    onBakeStarted?.(); // Notify parent that bake creation started

    const now = new Date();
    const estimatedEndTime = new Date(now.getTime() + (selectedRecipe?.totalTimeHours || 24) * 60 * 60 * 1000);

    startBakeMutation.mutate({
      recipeId: selectedRecipeId,
      name: bakeName.trim(),
      status: 'active',
      currentStep: 0,
      startTime: now,
      estimatedEndTime: estimatedEndTime,
      actualEndTime: null,
      environmentalData: sensorData ? {
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        timestamp: sensorData.timestamp
      } : null,
      timelineAdjustments: null,
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="font-display text-sourdough-800">Start New Bake</DialogTitle>
          <DialogDescription>
            Choose a recipe and customize your baking session with timeline tracking and smart notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Bake Name */}
          <div className="space-y-2">
            <Label htmlFor="bakeName">Bake Name</Label>
            <Input
              id="bakeName"
              value={bakeName}
              onChange={(e) => setBakeName(e.target.value)}
              placeholder="e.g., Weekend Sourdough, Experiment #3"
              className="border-sourdough-200"
            />
          </div>

          {/* Recipe Selection */}
          <div className="space-y-2">
            <Label>Recipe</Label>
            {isLoading ? (
              <div className="bg-sourdough-50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-sourdough-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-sourdough-200 rounded w-1/2" />
              </div>
            ) : (
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger className="border-sourdough-200">
                  <SelectValue placeholder="Select a recipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose a recipe...</SelectItem>
                  {recipes && recipes.length > 0 ? (
                    safeMap(recipes.filter(recipe => recipe.id && recipe.id.trim() !== ''), (recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        <div className="flex items-center space-x-2">
                          <ChefHat className="w-4 h-4" />
                          <span>{recipe.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-recipes" disabled>
                      <div className="text-gray-500 text-sm">
                        No recipes found. Create a recipe first.
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Recipe Details */}
          {selectedRecipe && (
            <Card className="border-sourdough-200 bg-sourdough-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sourdough-800">{selectedRecipe.name}</h4>
                  <Badge 
                    variant={selectedRecipe.difficulty === 'beginner' ? 'secondary' : 
                            selectedRecipe.difficulty === 'intermediate' ? 'default' : 'destructive'}
                  >
                    {selectedRecipe.difficulty}
                  </Badge>
                </div>
                
                {selectedRecipe.description && (
                  <p className="text-sm text-sourdough-600 mb-3">{selectedRecipe.description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-sourdough-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{selectedRecipe.totalTimeHours}h total</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{(selectedRecipe.steps as RecipeStep[])?.length || 0} steps</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Conditions */}
          {sensorData && (
            <Card className="border-sourdough-200 bg-green-50">
              <CardContent className="p-4">
                <h4 className="font-medium text-green-800 mb-2">Current Conditions</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-600">Temperature</span>
                    <p className="font-medium text-green-800">{sensorData.temperature?.toFixed(1)}°C</p>
                  </div>
                  <div>
                    <span className="text-green-600">Humidity</span>
                    <p className="font-medium text-green-800">{sensorData.humidity}%</p>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  These conditions will be used for timeline adjustments
                </p>
              </CardContent>
            </Card>
          )}

          {/* Starter Condition */}
          {starterCondition && (
            <Card className={`border-2 ${getHealthStatusColor(starterCondition.healthStatus)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800 flex items-center gap-2">
                    {getHealthStatusIcon(starterCondition.healthStatus)}
                    Starter Condition
                  </h4>
                  <Badge 
                    variant={starterCondition.healthStatus === 'healthy' ? 'secondary' : 
                            starterCondition.healthStatus === 'watch' ? 'default' : 'destructive'}
                  >
                    {starterCondition.healthStatus}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Stage</span>
                    <p className="font-medium text-gray-800">{getStageDisplayName(starterCondition.stage)}</p>
                  </div>
                  {starterCondition.riseTimeHours && (
                    <div>
                      <span className="text-gray-600">Last Rise</span>
                      <p className="font-medium text-gray-800">{starterCondition.riseTimeHours}h</p>
                    </div>
                  )}
                </div>

                {/* Starter Advice */}
                {showStarterAdvice && (
                  <div className="border-t pt-3 mt-3">
                    <h5 className="font-medium text-gray-700 mb-2">Timeline Adjustments</h5>
                    <div className="space-y-1">
                      {timelineCalculator.getStarterRecommendations(starterCondition).map((recommendation, index) => (
                        <p key={index} className="text-xs text-gray-600 leading-relaxed">
                          • {recommendation}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  Timeline will be automatically adjusted based on your starter's condition
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-sourdough-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartBake}
            disabled={!selectedRecipeId || !bakeName.trim() || startBakeMutation.isPending || isSubmitting}
            className="flex-1 bg-sourdough-500 hover:bg-sourdough-600 text-white"
          >
            {(startBakeMutation.isPending || isSubmitting) ? "Starting..." : "Start Baking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}