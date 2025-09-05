import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { safeFind } from "@/lib/safeArray";
import type { Recipe, Bake, InsertBake } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Users, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSensors } from "@/hooks/use-sensors";
import { timelineAnalytics } from "@/lib/timeline-analytics";

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
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [bakeName, setBakeName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { sensorData } = useSensors();

  const { data: recipes, isLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

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
        console.log('Creating', steps.length, 'timeline steps');
        
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          console.log('Creating timeline step:', {
            bakeId: newBake.id,
            stepIndex: i,
            name: step.name,
            estimatedDuration: step.duration,
            status: i === 0 ? 'active' : 'pending'
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
              autoAdjustments: null
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
                  {recipes?.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      <div className="flex items-center space-x-2">
                        <ChefHat className="w-4 h-4" />
                        <span>{recipe.name}</span>
                      </div>
                    </SelectItem>
                  ))}
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