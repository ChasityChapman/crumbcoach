import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { safeMap } from "@/lib/safeArray";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Trash2, Droplets, Link, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HydrationDisplay from "@/components/hydration-display";
import type { Recipe, InsertRecipe } from "@shared/schema";

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: Recipe | null; // Recipe to edit, null for new recipe
  initialTab?: "manual" | "url";
}

interface Ingredient {
  name: string;
  amount: string;
}

interface RecipeStep {
  id: string;
  name: string;
  duration: number;
  description: string;
}

const HYDRATION_PRESETS = [
  { name: "Low Hydration", percentage: 65, description: "Easier to handle, denser crumb" },
  { name: "Medium Hydration", percentage: 75, description: "Balanced texture and handling" },
  { name: "High Hydration", percentage: 85, description: "Open crumb, challenging to handle" },
  { name: "Very High Hydration", percentage: 95, description: "Extremely wet, artisan style" },
];

export default function RecipeModal({ isOpen, onClose, recipe, initialTab = "manual" }: RecipeModalProps) {
  const [activeTab, setActiveTab] = useState<"url" | "manual">(initialTab);
  const [recipeUrl, setRecipeUrl] = useState("");
  const [hasExtractedData, setHasExtractedData] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [totalHours, setTotalHours] = useState(24);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: "Sourdough starter", amount: "100g" },
    { name: "Bread flour", amount: "500g" },
    { name: "Water", amount: "375ml" },
    { name: "Salt", amount: "10g" }
  ]);
  const [steps, setSteps] = useState<RecipeStep[]>([
    { id: "1", name: "Mix Ingredients", duration: 30, description: "Combine starter, flour, water, and salt" },
    { id: "2", name: "Bulk Fermentation", duration: 480, description: "Let dough rise with periodic folds" },
    { id: "3", name: "Shape Loaves", duration: 30, description: "Pre-shape and final shape" },
    { id: "4", name: "Final Rise", duration: 240, description: "Cold proof in refrigerator" },
    { id: "5", name: "Bake", duration: 45, description: "Bake in Dutch oven" }
  ]);
  const [selectedHydration, setSelectedHydration] = useState<number | null>(null);

  const { toast } = useToast();

  // Set the initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Populate form when editing an existing recipe
  useEffect(() => {
    if (recipe) {
      setActiveTab("manual");
      setRecipeName(recipe.name || "");
      setDescription(recipe.description || "");
      setDifficulty(recipe.difficulty || "");
      setTotalHours(recipe.totalTimeHours || 24);
      setIngredients(recipe.ingredients as Ingredient[] || []);
      setSteps(recipe.steps as RecipeStep[] || []);
      setSelectedHydration(null);
      setRecipeUrl("");
      setHasExtractedData(false);
    } else if (!hasExtractedData) {
      // Only reset form for new recipe if we haven't extracted data
      resetForm();
    }
  }, [recipe, hasExtractedData]);

  const createRecipeMutation = useMutation({
    mutationFn: (recipeData: InsertRecipe) => {
      if (recipe?.id) {
        // Editing existing recipe
        return apiRequest("PUT", `/api/recipes/${recipe.id}`, recipeData);
      } else {
        // Creating new recipe
        return apiRequest("POST", "/api/recipes", recipeData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: recipe?.id ? "Recipe updated!" : "Recipe created!",
        description: recipe?.id 
          ? `${recipeName} has been updated.`
          : `${recipeName} has been added to your recipes.`,
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: recipe?.id ? "Failed to update recipe" : "Failed to create recipe",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const extractRecipeMutation = useMutation({
    mutationFn: async (url: string) => {
      if (url === "test") {
        const response = await apiRequest("POST", "/api/recipes/extract-test", {});
        const data = await response.json();
        return data;
      }
      const response = await apiRequest("POST", "/api/recipes/extract-from-url", { url });
      const data = await response.json();
      return data;
    },
    onSuccess: (data: Partial<Recipe>) => {
      console.log('Extracted recipe data:', data);
      
      // Mark that we have extracted data to prevent form reset
      setHasExtractedData(true);
      
      // Fill the form with extracted data
      setRecipeName(data.name || "");
      setDescription(data.description || "");
      setDifficulty(data.difficulty || "");
      setTotalHours(data.totalTimeHours || 24);
      
      // Set ingredients with proper structure
      if (data.ingredients && Array.isArray(data.ingredients)) {
        setIngredients(data.ingredients);
      }
      
      // Set steps with proper structure
      if (data.steps && Array.isArray(data.steps)) {
        setSteps(data.steps);
      }
      
      setSelectedHydration(null);
      
      // Switch to manual tab to show the extracted data
      setActiveTab("manual");
      
      toast({
        title: "Recipe extracted!",
        description: `Successfully imported "${data.name || 'recipe'}". Review and edit as needed.`,
      });
    },
    onError: (error: Error) => {
      console.error('Recipe extraction error:', error);
      toast({
        title: "Failed to extract recipe",
        description: error.message || "Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setActiveTab("manual");
    setRecipeUrl("");
    setRecipeName("");
    setDescription("");
    setDifficulty("");
    setTotalHours(24);
    setSelectedHydration(null);
    setHasExtractedData(false);
    setIngredients([
      { name: "Sourdough starter", amount: "100g" },
      { name: "Bread flour", amount: "500g" },
      { name: "Water", amount: "375ml" },
      { name: "Salt", amount: "10g" }
    ]);
    setSteps([
      { id: "1", name: "Mix Ingredients", duration: 30, description: "Combine starter, flour, water, and salt" },
      { id: "2", name: "Bulk Fermentation", duration: 480, description: "Let dough rise with periodic folds" },
      { id: "3", name: "Shape Loaves", duration: 30, description: "Pre-shape and final shape" },
      { id: "4", name: "Final Rise", duration: 240, description: "Cold proof in refrigerator" },
      { id: "5", name: "Bake", duration: 45, description: "Bake in Dutch oven" }
    ]);
  };

  const handleExtractFromUrl = () => {
    if (!recipeUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a recipe URL.",
        variant: "destructive",
      });
      return;
    }

    extractRecipeMutation.mutate(recipeUrl.trim());
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "" }]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addStep = () => {
    const newId = (steps.length + 1).toString();
    setSteps([...steps, { id: newId, name: "", duration: 60, description: "" }]);
  };

  const updateStep = (index: number, field: keyof RecipeStep, value: string | number) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const applyHydrationPreset = (percentage: number) => {
    setSelectedHydration(percentage);
    // Update water amount based on flour amount
    const flourIngredient = ingredients.find(ing => ing.name.toLowerCase().includes('flour'));
    if (flourIngredient) {
      const flourAmount = parseInt(flourIngredient.amount);
      if (!isNaN(flourAmount)) {
        const waterAmount = Math.round(flourAmount * (percentage / 100));
        const waterIndex = ingredients.findIndex(ing => ing.name.toLowerCase().includes('water'));
        if (waterIndex >= 0) {
          updateIngredient(waterIndex, 'amount', `${waterAmount}ml`);
        }
      }
    }
    
    toast({
      title: "Hydration applied",
      description: `${percentage}% hydration preset applied to your recipe.`,
    });
  };

  const handleCreateRecipe = () => {
    if (!recipeName.trim() || !difficulty || ingredients.length === 0 || steps.length === 0) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createRecipeMutation.mutate({
      name: recipeName.trim(),
      description: description.trim() || null,
      difficulty,
      totalTimeHours: totalHours,
      ingredients,
      steps
    });
  };

  if (!isOpen) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg p-0 flex flex-col overflow-hidden w-screen max-w-none md:w-[min(100vw-2rem,56rem)] h-[100svh] md:h-auto md:max-h-[85svh]">
          <div className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 p-6 pb-4 border-b">
            <DialogPrimitive.Title className="text-base sm:text-lg font-semibold leading-none tracking-tight font-display text-sourdough-800">
              {recipe?.id ? "Edit Recipe" : "Create New Recipe"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon">
                <X className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogPrimitive.Close>
          </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "url" | "manual")} className="h-full">
            <div className="p-6 space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="flex items-center space-x-2" data-testid="tab-url-import">
                  <Link className="w-4 h-4" />
                  <span>Import from URL</span>
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center space-x-2" data-testid="tab-manual-entry">
                  <Plus className="w-4 h-4" />
                  <span>Manual Entry</span>
                </TabsTrigger>
              </TabsList>

            <TabsContent value="url" className="space-y-4 flex-shrink-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipeUrl">Recipe URL</Label>
                <Input
                  id="recipeUrl"
                  value={recipeUrl}
                  onChange={(e) => setRecipeUrl(e.target.value)}
                  placeholder="https://example.com/sourdough-recipe"
                  className="border-sourdough-200"
                  data-testid="input-recipe-url"
                />
                <p className="text-sm text-muted-foreground">
                  Paste a link to any sourdough recipe webpage. Our AI will extract the ingredients and steps for you.
                </p>
              </div>
              
              <Button
                onClick={handleExtractFromUrl}
                disabled={!recipeUrl.trim() || extractRecipeMutation.isPending}
                className="w-full bg-sourdough-500 hover:bg-sourdough-600 text-white mb-3"
                data-testid="button-extract-recipe"
              >
                {extractRecipeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extracting Recipe...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Extract Recipe from URL
                  </>
                )}
              </Button>
              
              {extractRecipeMutation.isPending && (
                <div className="bg-sourdough-50 border border-sourdough-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-sourdough-500" />
                    <div>
                      <p className="font-medium text-sourdough-800">Analyzing Recipe...</p>
                      <p className="text-sm text-sourdough-600">This may take a few moments while we read the webpage and extract the recipe details.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

              <TabsContent value="manual" className="space-y-6">
            {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipeName">Recipe Name</Label>
              <Input
                id="recipeName"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="e.g., Weekend Sourdough"
                className="border-sourdough-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="border-sourdough-200">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your recipe..."
              className="border-sourdough-200"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalHours">Total Time (hours)</Label>
            <Input
              id="totalHours"
              type="number"
              value={totalHours}
              onChange={(e) => setTotalHours(parseInt(e.target.value) || 24)}
              className="border-sourdough-200"
              min="1"
              max="72"
            />
          </div>

          {/* Ingredients */}
          <Card className="border-sourdough-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Ingredients</span>
                <Button size="sm" onClick={addIngredient} variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {safeMap(ingredients, (ingredient, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    placeholder="Ingredient name"
                    className="flex-1"
                  />
                  <Input
                    value={ingredient.amount}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="w-24"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeIngredient(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {/* Real-time Hydration Display */}
              {ingredients.length > 0 && (
                <div className="mt-4 pt-3 border-t border-sourdough-200">
                  <HydrationDisplay ingredients={ingredients} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hydration Presets */}
          <Card className="border-sourdough-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Droplets className="w-5 h-5 text-blue-500" />
                <span>Hydration Presets</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Choose water-to-flour ratio. Higher hydration creates more open crumb but is harder to handle.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {safeMap(HYDRATION_PRESETS, (preset) => (
                  <Button
                    key={preset.percentage}
                    variant={selectedHydration === preset.percentage ? "default" : "outline"}
                    onClick={() => applyHydrationPreset(preset.percentage)}
                    className="text-left justify-start h-auto p-4 min-h-[4rem] flex-col items-start space-y-1"
                  >
                    <div className="w-full space-y-1">
                      <div className="font-medium text-sm leading-tight">{preset.name}</div>
                      <div className="text-xs opacity-75 leading-tight">{preset.percentage}% hydration</div>
                      <div className="text-xs opacity-60 leading-tight">{preset.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card className="border-sourdough-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Steps</span>
                <Button size="sm" onClick={addStep} variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {safeMap(steps, (step, index) => (
                <div key={step.id} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Step {index + 1}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeStep(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`step-name-${index}`} className="text-sm">Step Name</Label>
                      <Input
                        id={`step-name-${index}`}
                        value={step.name}
                        onChange={(e) => updateStep(index, 'name', e.target.value)}
                        placeholder="Step name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`step-duration-${index}`} className="text-sm">Duration (minutes)</Label>
                      <Input
                        id={`step-duration-${index}`}
                        type="number"
                        value={step.duration}
                        onChange={(e) => updateStep(index, 'duration', parseInt(e.target.value) || 0)}
                        placeholder="Duration (min)"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`step-description-${index}`} className="text-sm">Description</Label>
                    <Textarea
                      id={`step-description-${index}`}
                      value={step.description}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                      placeholder="Step description"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 p-6 pt-4 border-t">
          <Button
            onClick={handleCreateRecipe}
            disabled={!recipeName.trim() || !difficulty || createRecipeMutation.isPending}
            className="w-full bg-sourdough-500 hover:bg-sourdough-600 text-white"
            data-testid="button-create-recipe"
          >
            {createRecipeMutation.isPending 
              ? (recipe?.id ? "Updating..." : "Creating...")
              : (recipe?.id ? "Update Recipe" : "Create Recipe")
            }
          </Button>
        </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}