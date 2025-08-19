import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Recipe } from "@shared/schema";
import BottomNavigation from "@/components/bottom-navigation";
import RecipeModal from "@/components/recipe-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Wheat, Plus } from "lucide-react";

export default function Recipes() {
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  
  const { data: recipes, isLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sourdough-50">
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100">
          <div className="px-4 py-3">
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
    <div className="min-h-screen bg-sourdough-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center">
              <Wheat className="text-white w-4 h-4" />
            </div>
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Recipes</h1>
          </div>
          <Button 
            onClick={() => setRecipeModalOpen(true)}
            className="bg-sourdough-500 hover:bg-sourdough-600 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </header>

      <div className="p-4 pb-20">
        {recipes && recipes.length > 0 ? (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="shadow-sm border-sourdough-100">
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
            <Wheat className="w-12 h-12 text-sourdough-300 mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg text-sourdough-800 mb-2">
              No Recipes Yet
            </h3>
            <p className="text-sourdough-600 mb-4">Start by creating your first sourdough recipe.</p>
            <Button 
              onClick={() => setRecipeModalOpen(true)}
              className="bg-sourdough-500 hover:bg-sourdough-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Recipe
            </Button>
          </div>
        )}
      </div>

      <BottomNavigation currentPath="/recipes" />
      
      <RecipeModal
        isOpen={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
      />
    </div>
  );
}
