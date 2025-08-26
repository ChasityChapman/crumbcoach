import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Calendar, ChefHat, Plus, Trash2, ArrowRight, CalendarClock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow, addHours } from "date-fns";
import type { Recipe, TimelinePlan } from "@shared/schema";
import BottomNavigation from "@/components/bottom-navigation";

interface TimelineSchedule {
  targetEndTime: Date;
  recipes: RecipeSchedule[];
  earliestStartTime: Date;
}

interface RecipeSchedule {
  recipeId: string;
  recipeName: string;
  startTime: Date;
  endTime: Date;
  totalDurationMinutes: number;
  steps: StepSchedule[];
}

interface StepSchedule {
  id: string;
  name: string;
  duration: number;
  startTime: Date;
  endTime: Date;
}

export default function TimelinePlanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [planName, setPlanName] = useState("");
  const [targetEndTime, setTargetEndTime] = useState("");
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [calculatedSchedule, setCalculatedSchedule] = useState<TimelineSchedule | null>(null);

  // Fetch user's recipes
  const { data: recipes = [], isLoading: recipesLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  // Fetch existing timeline plans
  const { data: timelinePlans = [] } = useQuery<TimelinePlan[]>({
    queryKey: ["/api/timeline-plans"],
  });

  // Create timeline plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (planData: { name: string; targetEndTime: string; recipeIds: string[] }) => {
      const res = await apiRequest("POST", "/api/timeline-plans", planData);
      return await res.json();
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeline-plans"] });
      toast({
        title: "Timeline plan created!",
        description: `${planName} has been saved successfully.`,
      });
      
      // Show the calculated schedule
      if (newPlan.calculatedSchedule) {
        setCalculatedSchedule({
          ...newPlan.calculatedSchedule,
          targetEndTime: new Date(newPlan.calculatedSchedule.targetEndTime),
          recipes: newPlan.calculatedSchedule.recipes.map((r: any) => ({
            ...r,
            startTime: new Date(r.startTime),
            endTime: new Date(r.endTime),
            steps: r.steps.map((s: any) => ({
              ...s,
              startTime: new Date(s.startTime),
              endTime: new Date(s.endTime)
            }))
          })),
          earliestStartTime: new Date(newPlan.calculatedSchedule.earliestStartTime)
        });
      }
      
      // Reset form
      setPlanName("");
      setTargetEndTime("");
      setSelectedRecipeIds([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create timeline plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("DELETE", `/api/timeline-plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeline-plans"] });
      toast({
        title: "Timeline plan deleted",
        description: "The timeline plan has been removed.",
      });
    },
  });

  // Calculate preview timeline
  const previewSchedule = useMemo(() => {
    if (!targetEndTime || selectedRecipeIds.length === 0) return null;
    
    const selectedRecipes = recipes.filter(r => selectedRecipeIds.includes(r.id));
    
    // Parse the datetime-local input as a local time, not UTC
    const [datePart, timePart] = targetEndTime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    const targetDate = new Date(year, month - 1, day, hours, minutes);
    
    return selectedRecipes.map(recipe => {
      const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
      const totalMinutes = steps.reduce((sum: number, step: any) => sum + (step.duration || 0), 0);
      const startTime = new Date(targetDate.getTime() - (totalMinutes * 60 * 1000));
      
      return {
        recipeName: recipe.name,
        startTime,
        totalMinutes,
        difficulty: recipe.difficulty
      };
    }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [recipes, selectedRecipeIds, targetEndTime]);

  const handleRecipeToggle = (recipeId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecipeIds([...selectedRecipeIds, recipeId]);
    } else {
      setSelectedRecipeIds(selectedRecipeIds.filter(id => id !== recipeId));
    }
  };

  const handleCreatePlan = () => {
    if (!planName.trim() || !targetEndTime || selectedRecipeIds.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in plan name, target end time, and select at least one recipe.",
        variant: "destructive",
      });
      return;
    }

    createPlanMutation.mutate({
      name: planName.trim(),
      targetEndTime,
      recipeIds: selectedRecipeIds
    });
  };

  const handleQuickTimeSet = (hours: number) => {
    const targetTime = addHours(new Date(), hours);
    setTargetEndTime(format(targetTime, "yyyy-MM-dd'T'HH:mm"));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-800 border-green-200";
      case "intermediate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "advanced": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (recipesLoading) {
    return (
      <div className="min-h-screen bg-sourdough-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin text-sourdough-500 mx-auto mb-4" />
          <p className="text-sourdough-600">Loading your recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sourdough-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center">
              <CalendarClock className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-lg text-sourdough-800">
                Multi-Recipe Timeline
              </h1>
              <p className="text-sm text-sourdough-600">Plan perfect timing for multiple recipes</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20 space-y-6">
        {/* Timeline Plan Creator */}
        <Card className="shadow-sm border-sourdough-100">
          <CardHeader>
            <CardTitle className="font-display text-sourdough-800 flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Create Timeline Plan</span>
            </CardTitle>
            <CardDescription>
              Select multiple recipes and set when you want everything to finish
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan Name */}
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g., Sunday Dinner Spread"
                className="border-sourdough-200"
                data-testid="input-plan-name"
              />
            </div>

            {/* Target End Time */}
            <div className="space-y-2">
              <Label htmlFor="target-time">Target Completion Time</Label>
              <div className="flex space-x-2">
                <Input
                  id="target-time"
                  type="datetime-local"
                  value={targetEndTime}
                  onChange={(e) => setTargetEndTime(e.target.value)}
                  className="border-sourdough-200 flex-1"
                  data-testid="input-target-time"
                />
              </div>
              
              {/* Quick Time Buttons */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTimeSet(4)}
                  className="text-sm"
                  data-testid="button-quick-4h"
                >
                  +4h
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTimeSet(6)}
                  className="text-sm"
                  data-testid="button-quick-6h"
                >
                  +6h
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTimeSet(12)}
                  className="text-sm"
                  data-testid="button-quick-12h"
                >
                  +12h
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTimeSet(24)}
                  className="text-sm"
                  data-testid="button-quick-24h"
                >
                  +24h
                </Button>
              </div>
            </div>

            {/* Recipe Selection */}
            <div className="space-y-3">
              <Label>Select Recipes</Label>
              {recipes.length === 0 ? (
                <Alert className="border-sourdough-200">
                  <ChefHat className="h-4 w-4" />
                  <AlertDescription>
                    No recipes found. Create some recipes first to use the timeline planner.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recipes.map(recipe => (
                    <div
                      key={recipe.id}
                      className="flex items-center space-x-3 p-3 border border-sourdough-200 rounded-lg hover:bg-sourdough-25"
                    >
                      <Checkbox
                        checked={selectedRecipeIds.includes(recipe.id)}
                        onCheckedChange={(checked) => handleRecipeToggle(recipe.id, !!checked)}
                        data-testid={`checkbox-recipe-${recipe.id}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sourdough-800">{recipe.name}</h4>
                          <Badge variant="outline" className={getDifficultyColor(recipe.difficulty)}>
                            {recipe.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-sourdough-600 mt-1">
                          {Array.isArray(recipe.steps) ? recipe.steps.length : 0} steps • 
                          {Array.isArray(recipe.steps) 
                            ? Math.round(recipe.steps.reduce((sum: number, step: any) => sum + (step.duration || 0), 0) / 60)
                            : 0
                          } hours total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview Timeline */}
            {previewSchedule && (
              <div className="space-y-3">
                <Label>Timeline Preview</Label>
                <div className="bg-sourdough-25 border border-sourdough-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-sourdough-700">
                    <span>Recipe Schedule</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Target: {format(new Date(targetEndTime), "MMM d, h:mm a")}</span>
                    </span>
                  </div>
                  
                  {previewSchedule.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-sourdough-200 last:border-0">
                      <div>
                        <span className="font-medium text-sourdough-800">{item.recipeName}</span>
                        <Badge variant="outline" className={`ml-2 ${getDifficultyColor(item.difficulty)}`}>
                          {item.difficulty}
                        </Badge>
                      </div>
                      <div className="text-right text-sm text-sourdough-600">
                        <div>Start: {format(item.startTime, "h:mm a")}</div>
                        <div>{Math.round(item.totalMinutes / 60)}h duration</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Button */}
            <Button
              onClick={handleCreatePlan}
              disabled={createPlanMutation.isPending || !planName.trim() || !targetEndTime || selectedRecipeIds.length === 0}
              className="w-full bg-sourdough-600 hover:bg-sourdough-700"
              data-testid="button-create-plan"
            >
              {createPlanMutation.isPending ? "Creating Plan..." : "Create Timeline Plan"}
            </Button>
          </CardContent>
        </Card>

        {/* Calculated Schedule Display */}
        {calculatedSchedule && (
          <Card className="shadow-sm border-sourdough-100">
            <CardHeader>
              <CardTitle className="font-display text-sourdough-800 flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Your Timeline Schedule</span>
              </CardTitle>
              <CardDescription>
                Start times calculated for {format(calculatedSchedule.targetEndTime, "MMMM d, yyyy 'at' h:mm a")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-sourdough-200 bg-sourdough-25">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>First recipe starts:</strong> {format(calculatedSchedule.earliestStartTime, "h:mm a")} 
                  <span className="text-sourdough-600 ml-2">
                    ({formatDistanceToNow(calculatedSchedule.earliestStartTime, { addSuffix: true })})
                  </span>
                </AlertDescription>
              </Alert>

              {calculatedSchedule.recipes.map((recipe, index) => (
                <div key={recipe.recipeId} className="border border-sourdough-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sourdough-800">{recipe.recipeName}</h4>
                    <div className="text-sm text-sourdough-600">
                      {format(recipe.startTime, "h:mm a")} → {format(recipe.endTime, "h:mm a")}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {recipe.steps.map((step, stepIndex) => (
                      <div key={step.id} className="flex items-center justify-between text-sm bg-sourdough-25 rounded px-3 py-2">
                        <span className="text-sourdough-700">{stepIndex + 1}. {step.name}</span>
                        <div className="flex items-center space-x-2 text-sourdough-600">
                          <span>{format(step.startTime, "h:mm a")}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>{format(step.endTime, "h:mm a")}</span>
                          <span className="text-xs">({step.duration}min)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Existing Timeline Plans */}
        {timelinePlans.length > 0 && (
          <Card className="shadow-sm border-sourdough-100">
            <CardHeader>
              <CardTitle className="font-display text-sourdough-800">Saved Timeline Plans</CardTitle>
              <CardDescription>Your previously created timeline plans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {timelinePlans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between p-3 border border-sourdough-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-sourdough-800">{plan.name}</h4>
                    <p className="text-sm text-sourdough-600">
                      Target: {format(new Date(plan.targetEndTime), "MMM d, yyyy 'at' h:mm a")} • 
                      {Array.isArray(plan.recipeIds) ? plan.recipeIds.length : 0} recipes
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {plan.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePlanMutation.mutate(plan.id)}
                      disabled={deletePlanMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-delete-plan-${plan.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNavigation currentPath="/timeline-planner" />
    </div>
  );
}