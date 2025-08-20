import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2, Droplets } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function RecipeModal({ isOpen, onClose }: RecipeModalProps) {
  const [recipeName, setRecipeName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("");
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

  const createRecipeMutation = useMutation({
    mutationFn: (recipeData: any) => apiRequest("POST", "/api/recipes", recipeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Recipe created!",
        description: `${recipeName} has been added to your recipes.`,
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
    setTotalHours(24);
    setSelectedHydration(null);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl mx-auto max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="font-display text-sourdough-800">Create New Recipe</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6 flex-1 overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-2">
                {HYDRATION_PRESETS.map((preset) => (
                  <Button
                    key={preset.percentage}
                    variant={selectedHydration === preset.percentage ? "default" : "outline"}
                    onClick={() => applyHydrationPreset(preset.percentage)}
                    className="text-left justify-start h-auto p-3"
                  >
                    <div>
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-xs opacity-75">{preset.percentage}% - {preset.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

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
              {ingredients.map((ingredient, index) => (
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
              {steps.map((step, index) => (
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
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(index, 'name', e.target.value)}
                      placeholder="Step name"
                    />
                    <Input
                      type="number"
                      value={step.duration}
                      onChange={(e) => updateStep(index, 'duration', parseInt(e.target.value) || 0)}
                      placeholder="Duration (min)"
                    />
                  </div>
                  <Textarea
                    value={step.description}
                    onChange={(e) => updateStep(index, 'description', e.target.value)}
                    placeholder="Step description"
                    rows={2}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
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
            onClick={handleCreateRecipe}
            disabled={!recipeName.trim() || !difficulty || createRecipeMutation.isPending}
            className="flex-1 bg-sourdough-500 hover:bg-sourdough-600 text-white"
          >
            {createRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}