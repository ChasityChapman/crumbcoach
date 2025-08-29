import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RecipeStep {
  id: string;
  name: string;
  duration: number;
  description: string;
}

interface RecipeIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
}

export default function NewRecipeModal({ isOpen, onClose }: NewRecipeModalProps) {
  const [recipeName, setRecipeName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [steps, setSteps] = useState<RecipeStep[]>([
    { id: "1", name: "", duration: 30, description: "" }
  ]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { id: "1", name: "Bread Flour", amount: 500, unit: "g" },
    { id: "2", name: "Water", amount: 350, unit: "g" },
    { id: "3", name: "Sourdough Starter", amount: 100, unit: "g" },
    { id: "4", name: "Salt", amount: 10, unit: "g" }
  ]);
  const { toast } = useToast();

  const createRecipeMutation = useMutation({
    mutationFn: (recipeData: any) => apiRequest("POST", "/api/recipes", recipeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Recipe Created!",
        description: `${recipeName} has been added to your recipe collection`,
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: "Failed to create recipe",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setRecipeName("");
    setDescription("");
    setDifficulty("");
    setSteps([{ id: "1", name: "", duration: 30, description: "" }]);
    setIngredients([
      { id: "1", name: "Bread Flour", amount: 500, unit: "g" },
      { id: "2", name: "Water", amount: 350, unit: "g" },
      { id: "3", name: "Sourdough Starter", amount: 100, unit: "g" },
      { id: "4", name: "Salt", amount: 10, unit: "g" }
    ]);
  };

  const addStep = () => {
    const newStep: RecipeStep = {
      id: (steps.length + 1).toString(),
      name: "",
      duration: 30,
      description: ""
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    if (steps.length > 1) setSteps(steps.filter(step => step.id !== id));
  };

  const updateStep = (id: string, field: keyof RecipeStep, value: string | number) => {
    setSteps(steps.map(step => (step.id === id ? { ...step, [field]: value } : step)));
  };

  const addIngredient = () => {
    const newIngredient: RecipeIngredient = {
      id: (ingredients.length + 1).toString(),
      name: "",
      amount: 0,
      unit: "g"
    };
    setIngredients([...ingredients, newIngredient]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const updateIngredient = (id: string, field: keyof RecipeIngredient, value: string | number) => {
    setIngredients(ingredients.map(ing => (ing.id === id ? { ...ing, [field]: value } : ing)));
  };

  const handleSubmit = () => {
    if (
      !recipeName.trim() ||
      !difficulty ||
      steps.some(step => !step.name.trim()) ||
      ingredients.some(ing => !ing.name.trim() || ing.amount <= 0)
    ) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const totalTimeHours = Math.ceil(
      steps.reduce((total, step) => total + step.duration, 0) / 60
    );

    createRecipeMutation.mutate({
      name: recipeName.trim(),
      description: description.trim() || null,
      difficulty,
      totalTimeHours,
      steps: steps.map(step => ({
        id: step.id,
        name: step.name.trim(),
        duration: step.duration,
        description: step.description.trim() || null
      })),
      ingredients: ingredients.map(ing => ({
        id: ing.id,
        name: ing.name.trim(),
        amount: ing.amount,
        unit: ing.unit
      })),
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* FIX: grid shell + fixed height + hidden outer overflow */}
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl h-[90vh] p-0 overflow-hidden !grid grid-rows-[auto,1fr,auto] !gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="font-display text-sourdough-800">Create New Recipe</DialogTitle>
        </DialogHeader>

        {/* FIX: min-h-0 allows this row to shrink; overflow-y-auto makes it scroll */}
        <div className="min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipeName">Recipe Name *</Label>
              <Input
                id="recipeName"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="e.g., Classic Sourdough"
                className="border-sourdough-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Difficulty *</Label>
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
              rows={3}
            />
          </div>

          {/* Ingredients */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Ingredients *</Label>
              <Button
                onClick={addIngredient}
                size="sm"
                className="bg-sourdough-500 hover:bg-sourdough-600 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Ingredient
              </Button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ingredient, index) => (
                <div key={ingredient.id} className="border border-sourdough-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sourdough-800">Ingredient {index + 1}</h4>
                    {ingredients.length > 1 && (
                      <Button
                        onClick={() => removeIngredient(ingredient.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="sm:col-span-3 space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(ingredient.id, "name", e.target.value)}
                        placeholder="e.g., Bread Flour"
                        className="border-sourdough-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        value={ingredient.amount}
                        onChange={(e) =>
                          updateIngredient(
                            ingredient.id,
                            "amount",
                            Number.isNaN(parseFloat(e.target.value))
                              ? 0
                              : parseFloat(e.target.value)
                          )
                        }
                        min="0"
                        step="0.1"
                        className="border-sourdough-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit *</Label>
                      <Select
                        value={ingredient.unit}
                        onValueChange={(value) => updateIngredient(ingredient.id, "unit", value)}
                      >
                        <SelectTrigger className="border-sourdough-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="l">l</SelectItem>
                          <SelectItem value="cup">cup</SelectItem>
                          <SelectItem value="tbsp">tbsp</SelectItem>
                          <SelectItem value="tsp">tsp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Recipe Steps *</Label>
              <Button
                onClick={addStep}
                size="sm"
                className="bg-sourdough-500 hover:bg-sourdough-600 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id} className="border border-sourdough-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sourdough-800">Step {index + 1}</h4>
                    {steps.length > 1 && (
                      <Button
                        onClick={() => removeStep(step.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label>Step Name *</Label>
                      <Input
                        value={step.name}
                        onChange={(e) => updateStep(step.id, "name", e.target.value)}
                        placeholder="e.g., Mix Ingredients"
                        className="border-sourdough-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (min) *</Label>
                      <Input
                        type="number"
                        value={step.duration}
                        onChange={(e) => updateStep(step.id, "duration", parseInt(e.target.value) || 0)}
                        min="1"
                        className="border-sourdough-200"
                      />
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={step.description}
                      onChange={(e) => updateStep(step.id, "description", e.target.value)}
                      placeholder="Detailed instructions for this step..."
                      className="border-sourdough-200"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 p-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-sourdough-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !recipeName.trim() ||
              !difficulty ||
              steps.some(step => !step.name.trim()) ||
              ingredients.some(ing => !ing.name.trim() || ing.amount <= 0) ||
              createRecipeMutation.isPending
            }
            className="flex-1 bg-sourdough-500 hover:bg-sourdough-600 text-white"
          >
            {createRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}