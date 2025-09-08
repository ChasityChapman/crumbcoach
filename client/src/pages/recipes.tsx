import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Recipe } from "@shared/schema";
import { safeRecipeQueries } from "@/lib/safeQueries";
import BottomNavigation from "@/components/bottom-navigation";
import RecipeModal from "@/components/recipe-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Clock, Users, Plus, Filter, Link, Search, MoreVertical, Edit, Copy, Trash2, ChefHat, ArrowUpDown, BookOpen, Globe, Droplets, CheckCircle } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";

export default function Recipes() {
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [sortOrder, setSortOrder] = useState<string>("a-z");
  const [modalTab, setModalTab] = useState<"manual" | "url">("manual");
  const [searchText, setSearchText] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: recipes, isLoading } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: safeRecipeQueries.getAll,
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: (recipeId: string) => apiRequest("DELETE", `/api/recipes/${recipeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setRecipeToDelete(null);
      toast({
        title: "Recipe deleted",
        description: "The recipe has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete recipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Duplicate recipe mutation
  const duplicateRecipeMutation = useMutation({
    mutationFn: (recipeData: any) => apiRequest("POST", "/api/recipes", recipeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast({
        title: "Recipe duplicated",
        description: "The recipe has been successfully duplicated.",
      });
    },
    onError: () => {
      toast({
        title: "Duplicate failed",
        description: "Failed to duplicate recipe. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter and sort recipes
  const sortedRecipes = useMemo(() => {
    if (!recipes) return [];
    
    // Filter recipes by search text and difficulty
    let filteredRecipes = recipes.filter((recipe) => {
      // Filter by search text (name and description)
      const matchesSearch = searchText.trim() === "" || 
        recipe.name.toLowerCase().includes(searchText.toLowerCase()) ||
        (recipe.description && recipe.description.toLowerCase().includes(searchText.toLowerCase()));
      
      // Filter by difficulty
      const matchesDifficulty = selectedDifficulty === "all" || recipe.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesDifficulty;
    });
    
    // Sort filtered recipes
    return filteredRecipes.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      
      if (sortOrder === "z-a") {
        return nameB.localeCompare(nameA);
      }
      return nameA.localeCompare(nameB);
    });
  }, [recipes, sortOrder, searchText, selectedDifficulty]);

  // Handler functions
  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setModalTab("manual");
    setRecipeModalOpen(true);
  };

  const handleDuplicateRecipe = (recipe: Recipe) => {
    const duplicatedRecipe = {
      ...recipe,
      name: `${recipe.name} (Copy)`,
      id: undefined, // Remove ID so a new one gets generated
      createdAt: undefined,
    };
    duplicateRecipeMutation.mutate(duplicatedRecipe);
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
  };

  const confirmDelete = () => {
    if (recipeToDelete) {
      deleteRecipeMutation.mutate(recipeToDelete.id);
    }
  };

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
        
        {/* Search and Filter Section */}
        {recipes && recipes.length > 0 && (
          <div className="px-4 pb-3 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-sourdough-400" />
              <Input
                type="text"
                placeholder="Search recipes..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10 border-sourdough-200"
                aria-label="Search recipes"
              />
            </div>
            
            {/* Filter Controls Container */}
            <div className="bg-sourdough-25 rounded-lg p-3 border border-sourdough-100">
              {/* Desktop Filter Controls */}
              <div className="hidden sm:flex items-center gap-4">
                <Filter className="w-4 h-4 text-sourdough-500" />
                
                {/* Difficulty Filter */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="difficulty-select" className="text-sm font-medium text-sourdough-700">
                    Difficulty:
                  </Label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger id="difficulty-select" className="w-32 h-8 border-sourdough-200">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Sort Order */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="sort-select" className="text-sm font-medium text-sourdough-700">
                    Sort:
                  </Label>
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger id="sort-select" className="w-32 h-8 border-sourdough-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a-z">A-Z</SelectItem>
                      <SelectItem value="z-a">Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mobile Filter Button */}
              <div className="sm:hidden">
                <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full border-sourdough-200">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter & Sort
                      <ArrowUpDown className="w-4 h-4 ml-2" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-xl">
                    <SheetHeader>
                      <SheetTitle>Filter & Sort Recipes</SheetTitle>
                      <SheetDescription>
                        Customize how you view your recipe collection
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      {/* Difficulty Filter */}
                      <div className="space-y-2">
                        <Label htmlFor="mobile-difficulty-select" className="text-sm font-medium">
                          Filter by Difficulty
                        </Label>
                        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                          <SelectTrigger id="mobile-difficulty-select" className="border-sourdough-200">
                            <SelectValue placeholder="All Levels" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Sort Order */}
                      <div className="space-y-2">
                        <Label htmlFor="mobile-sort-select" className="text-sm font-medium">
                          Sort Order
                        </Label>
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                          <SelectTrigger id="mobile-sort-select" className="border-sourdough-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="a-z">A-Z</SelectItem>
                            <SelectItem value="z-a">Z-A</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSelectedDifficulty("all");
                            setSortOrder("a-z");
                          }}
                          className="flex-1"
                        >
                          Reset
                        </Button>
                        <Button 
                          onClick={() => setFilterSheetOpen(false)}
                          className="flex-1 bg-sourdough-500 hover:bg-sourdough-600"
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="p-4 pb-20">
        {recipes && recipes.length > 0 ? (
          sortedRecipes.length > 0 ? (
            <div className="space-y-4">
              {sortedRecipes.map((recipe) => (
                <Card 
                  key={recipe.id} 
                  className="shadow-sm border-sourdough-100 hover:shadow-md transition-shadow duration-200"
                  data-testid={`recipe-card-${recipe.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div 
                        className="flex-shrink-0 cursor-pointer"
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          setModalTab("manual");
                          setRecipeModalOpen(true);
                        }}
                      >
                        {recipe.thumbnailUrl ? (
                          <img 
                            src={recipe.thumbnailUrl} 
                            alt={recipe.name}
                            className="w-12 h-12 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-md bg-sourdough-200 flex items-center justify-center">
                            <ChefHat className="w-6 h-6 text-sourdough-500" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedRecipe(recipe);
                          setModalTab("manual");
                          setRecipeModalOpen(true);
                        }}
                      >
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
                      </div>

                      {/* Menu */}
                      <div className="flex-shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditRecipe(recipe)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateRecipe(recipe)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteRecipe(recipe)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // No recipes match current filters
            <div className="text-center py-12">
              <img src={crumbCoachLogo} alt="Crumb Coach" className="w-12 h-12 object-contain mx-auto mb-4 opacity-30" />
              <h3 className="font-display font-semibold text-lg text-sourdough-800 mb-2">
                No Recipes Found
              </h3>
              <p className="text-sourdough-600 mb-6">
                No recipes match your current search or filter criteria. Try adjusting your filters or search terms.
              </p>
              <Button 
                onClick={() => {
                  setSearchText("");
                  setSelectedDifficulty("all");
                }}
                variant="outline"
                className="border-sourdough-300 text-sourdough-700 hover:bg-sourdough-50"
              >
                Clear Filters
              </Button>
            </div>
          )
        ) : (
          <div className="safe-x safe-bottom">
            <div className="max-w-md mx-auto text-center px-6 py-12">
              {/* Full-width illustration */}
              <div className="mb-8">
                <div className="relative mx-auto w-48 h-48 bg-gradient-to-br from-sourdough-100 to-sourdough-200 dark:from-sourdough-800 dark:to-sourdough-900 rounded-2xl flex items-center justify-center mb-6">
                  {/* Main bread illustration */}
                  <div className="relative">
                    <ChefHat className="w-24 h-24 text-sourdough-400 dark:text-sourdough-500" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-sourdough-50 dark:bg-sourdough-700 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-sourdough-600 dark:text-sourdough-300" />
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-4 left-6 w-3 h-3 bg-sourdough-300 dark:bg-sourdough-600 rounded-full opacity-60"></div>
                  <div className="absolute bottom-6 right-4 w-2 h-2 bg-sourdough-300 dark:bg-sourdough-600 rounded-full opacity-40"></div>
                  <div className="absolute bottom-4 left-4 w-4 h-4 bg-sourdough-200 dark:bg-sourdough-700 rounded-full opacity-50"></div>
                </div>
              </div>

              {/* Enhanced copy */}
              <div className="space-y-4 mb-8">
                <h2 className="font-display font-bold text-2xl text-sourdough-900 dark:text-sourdough-100">
                  Your Recipe Collection Awaits
                </h2>
                <p className="text-sourdough-600 dark:text-sourdough-400 text-base leading-relaxed">
                  Start building your personal sourdough library with recipes that inspire your baking journey.
                </p>
              </div>

              {/* Value proposition bullets */}
              <div className="space-y-3 mb-8 text-left">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-sourdough-500 dark:text-sourdough-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-sourdough-700 dark:text-sourdough-300">
                    Import recipes from your favorite blogs and websites
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Droplets className="w-5 h-5 text-sourdough-500 dark:text-sourdough-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-sourdough-700 dark:text-sourdough-300">
                    Track hydration ratios and ingredient measurements
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-sourdough-500 dark:text-sourdough-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-sourdough-700 dark:text-sourdough-300">
                    Organize your recipes with photos and difficulty levels
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-sourdough-500 dark:text-sourdough-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-sourdough-700 dark:text-sourdough-300">
                    Create timeline-guided baking sessions
                  </p>
                </div>
              </div>

              {/* Enhanced action buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setSelectedRecipe(null);
                    setModalTab("manual");
                    setRecipeModalOpen(true);
                  }}
                  size="lg"
                  className="w-full bg-sourdough-500 hover:bg-sourdough-600 dark:bg-sourdough-600 dark:hover:bg-sourdough-700 text-white font-medium"
                  data-testid="button-create-first-recipe"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Recipe
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedRecipe(null);
                    setModalTab("url");
                    setRecipeModalOpen(true);
                  }}
                  variant="outline"
                  size="lg"
                  className="w-full border-sourdough-300 text-sourdough-700 hover:bg-sourdough-50 dark:border-sourdough-600 dark:text-sourdough-300 dark:hover:bg-sourdough-800"
                  data-testid="button-add-saved-recipe"
                >
                  <Link className="w-5 h-5 mr-2" />
                  Import from Website
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation currentPath="/recipes" />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!recipeToDelete} onOpenChange={() => setRecipeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{recipeToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
