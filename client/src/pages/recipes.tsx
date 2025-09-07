import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Recipe } from "@shared/schema";
import { safeRecipeQueries } from "@/lib/safeQueries";
import BottomNavigation from "@/components/bottom-navigation";
import RecipeModal from "@/components/recipe-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, Plus, Filter, Link } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";

export default function Recipes() {
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [sortOrder, setSortOrder] = useState<string>("a-z");
  const [modalTab, setModalTab] = useState<"manual" | "url">("manual");
  
  const { data: recipes, isLoading } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: safeRecipeQueries.getAll,
  });

  // Sort recipes based on filter selection
  const sortedRecipes = useMemo(() => {
    if (!recipes) return [];
    
    return [...recipes].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      
      if (sortOrder === "z-a") {
        return nameB.localeCompare(nameA);
      }
      return nameA.localeCompare(nameB);
    });
  }, [recipes, sortOrder]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sourdough-50 safe-x">
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100 safe-top">
          <div className="px-4 safe-top pb-3 min-h-[60px] flex items-center">
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Recipes</h1>
          </div>
        </header>
        <div className="p-4">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100 animate-pulse">
                <div className="h-4 bg-sourdough-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-sourdough-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
        <BottomNavigation currentPath="/recipes" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sourdough-50 safe-x">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100 safe-top">
        <div className="px-4 safe-top pb-3 flex items-center justify-between min-h-[60px]">
          <h1 className="font-display font-semibold text-lg text-sourdough-800">Recipes</h1>
          <Button 
            onClick={() => {
              setSelectedRecipe(null);
              setModalTab("manual");
              setRecipeModalOpen(true);
            }}
            className="bg-sourdough-50 safe-x0 hover:bg-sourdough-600 text-white touch-manipulation"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
        
        {/* Filter Section */}
        {recipes && recipes.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-sourdough-500" />
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-32 h-8 border-sourdough-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a-z">A-Z</SelectItem>
                  <SelectItem value="z-a">Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </header>

      <div className="p-4 pb-20">
        {recipes && recipes.length > 0 ? (
          <div className="space-y-4">
            {sortedRecipes.map((recipe) => (
              <Card 
                key={recipe.id} 
                className="shadow-sm border-sourdough-100 cursor-pointer hover:shadow-md transition-shadow duration-200"
                onClick={() => {
                  setSelectedRecipe(recipe);
                  setModalTab("manual");
                  setRecipeModalOpen(true);
                }}
                data-testid={`recipe-card-${recipe.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display font-semibold text-lg text-sourdough-800">
                      {recipe.name}
                    </h3>
                    <Badge 
                      variant={recipe.difficulty === 'beginner' ? 'secondary' : 
                              recipe.difficulty === 'intermediate' ? 'default' : 'destructive'}
                    >
                      {recipe.difficulty}
                    </Badge>
                  </div>
                  
                  {recipe.description && (
                    <p className="text-sm text-sourdough-600 mb-3">{recipe.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-sourdough-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{recipe.totalTimeHours}h</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{(recipe.steps as any[])?.length || 0} steps</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <img src={crumbCoachLogo} alt="Crumb Coach" className="w-12 h-12 object-contain mx-auto mb-4 opacity-30" />
            <h3 className="font-display font-semibold text-lg text-sourdough-800 mb-2">
              No Recipes Yet
            </h3>
            <p className="text-sourdough-600 mb-6">Start by creating your first sourdough recipe or add one from a website.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => {
                  setSelectedRecipe(null);
                  setModalTab("manual");
                  setRecipeModalOpen(true);
                }}
                className="bg-sourdough-50 safe-x0 hover:bg-sourdough-600 text-white"
                data-testid="button-create-first-recipe"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Recipe
              </Button>
              <Button 
                onClick={() => {
                  setSelectedRecipe(null);
                  setModalTab("url");
                  setRecipeModalOpen(true);
                }}
                variant="outline"
                className="border-sourdough-300 text-sourdough-700 hover:bg-sourdough-50 safe-x"
                data-testid="button-add-saved-recipe"
              >
                <Link className="w-4 h-4 mr-2" />
                Add from Website
              </Button>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation currentPath="/recipes" />
      
      <RecipeModal
        isOpen={recipeModalOpen}
        onClose={() => {
          setRecipeModalOpen(false);
          setSelectedRecipe(null);
        }}
        recipe={selectedRecipe}
        initialTab={modalTab}
      />
    </div>
  );
}
