import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Camera, Plus, Thermometer, FlaskConical, Clock, TrendingUp, FileText, BookOpen, Settings, Calculator, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertStarterLogSchema, type StarterLog, type Recipe } from "@shared/schema";
import { format, formatDistanceToNow } from "date-fns";
import { safeParseDate } from "@/lib/utils";
import BottomNavigation from "@/components/bottom-navigation";
import { safeStarterLogQueries, safeRecipeQueries } from "@/lib/safeQueries";
import RecipeModal from "@/components/recipe-modal";
import HydrationCalculatorModal from "@/components/hydration-calculator-modal";

// Form schema with validation - exclude userId since it's added automatically
const starterLogFormSchema = insertStarterLogSchema.omit({ userId: true }).extend({
  flourTypes: z.array(z.object({
    type: z.string().min(1, "Flour type is required"),
    percentage: z.number().min(1).max(100)
  })).min(1, "At least one flour type is required"),
  feedRatio: z.object({
    starter: z.number().min(0.1, "Starter ratio must be positive"),
    flour: z.number().min(0.1, "Flour ratio must be positive"),
    water: z.number().min(0.1, "Water ratio must be positive")
  }),
});

type StarterLogFormData = z.infer<typeof starterLogFormSchema>;

const flourTypeOptions = [
  "White All-Purpose",
  "White Bread Flour", 
  "Whole Wheat",
  "Whole Wheat Pastry",
  "Rye",
  "Spelt",
  "Einkorn",
  "Rice",
  "Buckwheat",
  "Kamut",
  "Other"
];

const discardUsageOptions = [
  "Pancakes",
  "Crackers",
  "Waffles",
  "Focaccia", 
  "Pizza Dough",
  "Naan",
  "Other"
];

const starterStageOptions = [
  { value: "just_fed", label: "Just Fed" },
  { value: "peak", label: "Peak Activity" },
  { value: "collapsing", label: "Collapsing" },
  { value: "sluggish", label: "Sluggish" }
];

export default function StarterLogPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("new-entry");
  const [tempUnit, setTempUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [discardUsageType, setDiscardUsageType] = useState<"notes" | "existing-recipe" | "new-recipe">("notes");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("none");
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [hydrationCalculatorOpen, setHydrationCalculatorOpen] = useState(false);
  const [starterName, setStarterName] = useState<string>('Odin');
  const [starterHealth, setStarterHealth] = useState<'healthy' | 'watch' | 'sluggish'>('healthy');
  const [lastFeedTime, setLastFeedTime] = useState<Date | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Load preferences from settings
  useEffect(() => {
    const saved = localStorage.getItem('crumbCoachSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.tempUnit) {
        setTempUnit(settings.tempUnit);
      }
      if (settings.starterName) {
        setStarterName(settings.starterName);
      }
    }
  }, []);

  // Fetch starter logs
  const { data: starterLogs = [], isLoading } = useQuery<StarterLog[]>({
    queryKey: ["starter-logs"],
    queryFn: safeStarterLogQueries.getAll,
  });

  // Fetch recipes for selection
  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ["recipes"],
    queryFn: safeRecipeQueries.getAll,
  });

  const form = useForm<StarterLogFormData>({
    resolver: zodResolver(starterLogFormSchema),
    defaultValues: {
      logDate: new Date(),
      flourTypes: [{ type: "White All-Purpose", percentage: 100 }],
      feedRatio: { starter: 1, flour: 1, water: 1 },
      feedAmountGrams: 50,
      starterStage: "just_fed",
      conditionNotes: "",
      discardUsed: false,
      discardRecipe: "",
      peakActivity: false,
      ambientTempF: undefined,
      ambientTempC: undefined,
      riseTimeHours: undefined,
      riseTimeMinutes: undefined,
    },
  });

  // Watch form values for auto-calculations
  const watchedFeedRatio = form.watch("feedRatio");
  const watchedFlourTypes = form.watch("flourTypes");

  // Auto-calculate hydration percentage
  useEffect(() => {
    if (watchedFeedRatio?.flour && watchedFeedRatio?.water) {
      const hydrationPercent = Math.round((watchedFeedRatio.water / watchedFeedRatio.flour) * 100);
      form.setValue("hydrationPercent", hydrationPercent);
    }
  }, [watchedFeedRatio?.flour, watchedFeedRatio?.water, form]);

  // Calculate last feed time and ETA
  useEffect(() => {
    if (starterLogs.length > 0) {
      const lastLog = starterLogs[0]; // Assuming sorted by date desc
      if (lastLog.logDate) {
        setLastFeedTime(new Date(lastLog.logDate));
      }
    }
  }, [starterLogs]);

  // Auto-calculate feeding allocations
  const calculateAllocations = () => {
    const totalAmount = form.watch("feedAmountGrams") || 0;
    const ratio = watchedFeedRatio;
    if (!ratio || !totalAmount) return { starter: 0, flour: 0, water: 0 };

    const totalRatio = ratio.starter + ratio.flour + ratio.water;
    const starter = Math.round((totalAmount * ratio.starter) / totalRatio);
    const flour = Math.round((totalAmount * ratio.flour) / totalRatio);
    const water = Math.round((totalAmount * ratio.water) / totalRatio);
    
    return { starter, flour, water };
  };

  const allocations = calculateAllocations();

  // Calculate health status
  const getHealthColor = () => {
    switch (starterHealth) {
      case 'healthy': return 'bg-green-500';
      case 'watch': return 'bg-yellow-500';
      case 'sluggish': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getNextFeedETA = () => {
    if (!lastFeedTime) return 'No previous feeding';
    const hoursSinceLastFeed = (Date.now() - lastFeedTime.getTime()) / (1000 * 60 * 60);
    const nextFeedHours = 24 - hoursSinceLastFeed;
    
    if (nextFeedHours <= 0) {
      return 'Due now';
    } else if (nextFeedHours <= 6) {
      return `Due in ${Math.round(nextFeedHours)}h`;
    } else {
      return `Next feed ETA ${Math.round(nextFeedHours/4)*4}–${Math.round(nextFeedHours/4)*4 + 4}h`;
    }
  };

  // Load starter defaults from settings after form is initialized
  useEffect(() => {
    const saved = localStorage.getItem('crumbCoachSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.starterDefaults) {
        const defaults = settings.starterDefaults;
        if (defaults.flourTypes) form.setValue("flourTypes", defaults.flourTypes);
        if (defaults.feedRatio) form.setValue("feedRatio", defaults.feedRatio);
        if (defaults.feedAmountGrams) form.setValue("feedAmountGrams", defaults.feedAmountGrams);
        if (defaults.starterStage) form.setValue("starterStage", defaults.starterStage);
      }
    }
  }, []);

  // Create starter log mutation
  const createLogMutation = useMutation({
    mutationFn: safeStarterLogQueries.create,
    onSuccess: () => {
      console.log('Starter log saved successfully');
      queryClient.invalidateQueries({ queryKey: ["starter-logs"] });
      setActiveTab("history");
      form.reset();
      // Reset discard usage state
      setDiscardUsageType("notes");
      setSelectedRecipeId("");
      toast({
        title: "Log Entry Saved",
        description: "Your starter log entry has been saved successfully.",
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Error saving starter log:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save your starter log entry. Please try again.",
        duration: 5000,
      });
    },
  });

  // Save current form values as defaults
  const saveAsDefaults = () => {
    const currentSettings = JSON.parse(localStorage.getItem('crumbCoachSettings') || '{}');
    const starterDefaults = {
      flourTypes: form.getValues("flourTypes"),
      feedRatio: form.getValues("feedRatio"),
      feedAmountGrams: form.getValues("feedAmountGrams"),
      starterStage: form.getValues("starterStage"),
    };
    
    const updatedSettings = {
      ...currentSettings,
      starterDefaults
    };
    
    localStorage.setItem('crumbCoachSettings', JSON.stringify(updatedSettings));
    
    // Show success toast notification
    toast({
      title: "Settings Saved",
      description: "Your feeding preferences have been saved as defaults for future entries.",
      duration: 3000,
    });
  };

  // Load saved defaults into the form
  const loadDefaults = () => {
    const saved = localStorage.getItem('crumbCoachSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.starterDefaults) {
        const defaults = settings.starterDefaults;
        if (defaults.flourTypes) form.setValue("flourTypes", defaults.flourTypes);
        if (defaults.feedRatio) form.setValue("feedRatio", defaults.feedRatio);
        if (defaults.feedAmountGrams) form.setValue("feedAmountGrams", defaults.feedAmountGrams);
        if (defaults.starterStage) form.setValue("starterStage", defaults.starterStage);
        
        toast({
          title: "Defaults Loaded",
          description: "Your saved feeding preferences have been restored.",
          duration: 2000,
        });
      } else {
        toast({
          title: "No Defaults Found",
          description: "No saved feeding preferences found. Set up your preferences and click 'Save as Defaults'.",
          duration: 3000,
        });
      }
    }
  };

  const onSubmit = (data: StarterLogFormData) => {
    console.log('Form submitted with data:', data);
    
    // Submit form data directly - mapping handled in Supabase query
    createLogMutation.mutate({
      ...data,
      logDate: data.logDate || new Date(),
      photoUrl: null, // Optional field
      weatherData: null, // Optional field
      hydrationPercent: data.hydrationPercent ?? null,
      ambientTempF: data.ambientTempF ?? null,
      ambientTempC: data.ambientTempC ?? null,
      starterStage: data.starterStage ?? null,
      conditionNotes: data.conditionNotes ?? null,
      riseTimeHours: data.riseTimeHours ?? null,
      riseTimeMinutes: data.riseTimeMinutes ?? null,
      discardRecipe: data.discardRecipe ?? null,
      peakActivity: data.peakActivity ?? null,
      discardUsed: data.discardUsed ?? null,
    });
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Starter Log</h1>
          <p className="text-muted-foreground">Track your sourdough starter's health and performance</p>
        </div>
        <FlaskConical className="h-8 w-8 text-amber-500" />
      </div>

      {/* Starter Name Display */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                  {starterName}
                </h2>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Your sourdough starter
                </p>
              </div>
            </div>
            <div className="text-right">
              <button 
                onClick={() => navigate('/profile')}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline cursor-pointer transition-colors"
                data-testid="link-advanced-settings"
              >
                Customize this name in Advanced Settings
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-log" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Entry
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            History & Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new-log" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-amber-500" />
                Log Starter Feeding
              </CardTitle>
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300 flex-1">
                  <p className="font-medium">Save Time with Defaults</p>
                  <p className="text-blue-600 dark:text-blue-400 mt-1">
                    Fill out your typical feeding preferences and click "Save as Defaults" to automatically load them for future entries.
                  </p>
                </div>
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadDefaults}
                  data-testid="button-load-defaults-top"
                  className="flex items-center gap-2 shrink-0"
                >
                  <Settings className="h-3 w-3" />
                  Load Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Date and Time */}
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="logDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Date & Time
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                              data-testid="input-log-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Flour Types */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Flour Types</Label>
                    <div className="space-y-3">
                      {watchedFlourTypes.map((flourType, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Select
                            value={flourType.type}
                            onValueChange={(value) => {
                              const newFlourTypes = [...watchedFlourTypes];
                              newFlourTypes[index] = { ...newFlourTypes[index], type: value };
                              form.setValue("flourTypes", newFlourTypes);
                            }}
                          >
                            <SelectTrigger className="w-[200px]" data-testid={`select-flour-type-${index}`}>
                              <SelectValue placeholder="Select flour type" />
                            </SelectTrigger>
                            <SelectContent>
                              {flourTypeOptions.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="Percentage"
                            value={flourType.percentage}
                            onChange={(e) => {
                              const newFlourTypes = [...watchedFlourTypes];
                              newFlourTypes[index] = { 
                                ...newFlourTypes[index], 
                                percentage: parseInt(e.target.value) || 0 
                              };
                              form.setValue("flourTypes", newFlourTypes);
                            }}
                            className="w-24"
                            min="1"
                            max="100"
                            data-testid={`input-flour-percentage-${index}`}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          {watchedFlourTypes.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newFlourTypes = watchedFlourTypes.filter((_, i) => i !== index);
                                form.setValue("flourTypes", newFlourTypes);
                              }}
                              data-testid={`button-remove-flour-${index}`}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newFlourTypes = [...watchedFlourTypes, { type: "White All-Purpose", percentage: 100 }];
                          form.setValue("flourTypes", newFlourTypes);
                        }}
                        className="w-full"
                        data-testid="button-add-flour-type"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Flour Type
                      </Button>
                    </div>
                  </div>

                  {/* Feed Ratio */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Feed Ratio (Starter : Flour : Water)</Label>
                    <p className="text-xs text-muted-foreground">
                      Enter the ratio of starter to flour to water. For example, 1:2:2 means 1 part starter, 2 parts flour, 2 parts water.
                    </p>
                    <div className="flex items-center gap-3">
                      <FormField
                        control={form.control}
                        name="feedRatio.starter"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                placeholder="1"
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="w-20"
                                data-testid="input-feed-ratio-starter"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <span>:</span>
                      <FormField
                        control={form.control}
                        name="feedRatio.flour"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                placeholder="2"
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="w-20"
                                data-testid="input-feed-ratio-flour"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <span>:</span>
                      <FormField
                        control={form.control}
                        name="feedRatio.water"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                placeholder="2"
                                value={field.value}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                className="w-20"
                                data-testid="input-feed-ratio-water"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {watchedFeedRatio?.flour && watchedFeedRatio?.water && (
                        <Badge variant="secondary" className="ml-4">
                          {Math.round((watchedFeedRatio.water / watchedFeedRatio.flour) * 100)}% Hydration
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 <strong>Tip:</strong> 100% hydration (1:1 water to flour ratio) is the most common starter feeding ratio and creates a balanced, active starter.
                    </p>
                  </div>

                  {/* Feed Amount */}
                  <FormField
                    control={form.control}
                    name="feedAmountGrams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Feed Amount (grams of flour added)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="50"
                            value={field.value}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-feed-amount"
                          />
                        </FormControl>
                        <FormDescription>Total amount of flour you added to the starter</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Temperature */}
                  <div className="space-y-4">
                    <FormLabel className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4" />
                      Ambient Temperature
                    </FormLabel>
                    <div className="flex items-center gap-3">
                      {tempUnit === 'fahrenheit' ? (
                        <FormField
                          control={form.control}
                          name="ambientTempF"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="70"
                                  min="32"
                                  max="110"
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                                    field.onChange(value);
                                    // Auto-convert to Celsius
                                    if (value) {
                                      const celsius = Math.round((value - 32) * 5/9);
                                      form.setValue("ambientTempC", celsius);
                                    } else {
                                      form.setValue("ambientTempC", undefined);
                                    }
                                  }}
                                  data-testid="input-temperature"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="ambientTempC"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="21"
                                  min="0"
                                  max="43"
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                                    field.onChange(value);
                                    // Auto-convert to Fahrenheit
                                    if (value) {
                                      const fahrenheit = Math.round((value * 9/5) + 32);
                                      form.setValue("ambientTempF", fahrenheit);
                                    } else {
                                      form.setValue("ambientTempF", undefined);
                                    }
                                  }}
                                  data-testid="input-temperature"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <div className="w-16 h-10 flex items-center justify-center text-sm font-medium bg-muted rounded-md">
                        °{tempUnit === 'fahrenheit' ? 'F' : 'C'}
                      </div>
                    </div>
                  </div>

                  {/* Starter Stage */}
                  <FormField
                    control={form.control}
                    name="starterStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starter Stage</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? "just_fed"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-starter-stage">
                              <SelectValue placeholder="Select starter stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {starterStageOptions.map((stage) => (
                              <SelectItem key={stage.value} value={stage.value}>
                                {stage.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Rise Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="riseTimeHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Rise Time (Hours)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="48"
                              placeholder="6"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-rise-hours"
                            />
                          </FormControl>
                          <FormDescription>Time to double/triple</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="riseTimeMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Minutes</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="30"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-rise-minutes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Condition Notes */}
                  <FormField
                    control={form.control}
                    name="conditionNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe smell, texture, bubbles, rise level..."
                            className="min-h-[100px]"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            data-testid="textarea-condition-notes"
                          />
                        </FormControl>
                        <FormDescription>
                          Note any observations about smell, texture, bubbles, or activity level
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Discard Usage */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="discardUsed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-discard-used"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Used discard for recipe</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    {form.watch("discardUsed") && (
                      <div className="space-y-4">
                        <FormItem>
                          <FormLabel>How would you like to record what you made?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={discardUsageType}
                              onValueChange={(value: "notes" | "existing-recipe" | "new-recipe") => setDiscardUsageType(value)}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="notes" id="notes" />
                                <Label htmlFor="notes" className="flex items-center space-x-2 cursor-pointer">
                                  <FileText className="w-4 h-4" />
                                  <span>Add notes</span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="existing-recipe" id="existing-recipe" />
                                <Label htmlFor="existing-recipe" className="flex items-center space-x-2 cursor-pointer">
                                  <BookOpen className="w-4 h-4" />
                                  <span>Select saved recipe</span>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="new-recipe" id="new-recipe" />
                                <Label htmlFor="new-recipe" className="flex items-center space-x-2 cursor-pointer">
                                  <Plus className="w-4 h-4" />
                                  <span>Add new recipe</span>
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                        </FormItem>

                        {discardUsageType === "notes" && (
                          <FormField
                            control={form.control}
                            name="discardRecipe"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>What did you make?</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., pancakes, crackers, focaccia"
                                    value={field.value ?? ""}
                                    onChange={field.onChange}
                                    data-testid="input-discard-recipe"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {discardUsageType === "existing-recipe" && (
                          <FormItem>
                            <FormLabel>Select Recipe</FormLabel>
                            <Select
                              value={selectedRecipeId}
                              onValueChange={(value) => {
                                setSelectedRecipeId(value);
                                const selectedRecipe = recipes.find(r => r.id === value);
                                if (selectedRecipe) {
                                  form.setValue("discardRecipe", selectedRecipe.name);
                                }
                              }}
                            >
                              <SelectTrigger data-testid="select-existing-recipe">
                                <SelectValue placeholder="Choose a saved recipe" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Choose a recipe...</SelectItem>
                                {recipes.length === 0 ? (
                                  <SelectItem value="no-recipes" disabled>
                                    No recipes found - create one first
                                  </SelectItem>
                                ) : (
                                  recipes.map((recipe) => (
                                    <SelectItem key={recipe.id} value={recipe.id}>
                                      {recipe.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}

                        {discardUsageType === "new-recipe" && (
                          <div className="space-y-2">
                            <Label>Create New Recipe</Label>
                            <Button
                              type="button"
                              onClick={() => setRecipeModalOpen(true)}
                              className="w-full border border-dashed border-sourdough-300 bg-sourdough-50 hover:bg-sourdough-100 text-sourdough-700"
                              variant="outline"
                              data-testid="button-create-recipe-from-discard"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create Recipe for This Discard
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Peak Activity Checkbox */}
                  <FormField
                    control={form.control}
                    name="peakActivity"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-peak-activity"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Starter reached peak activity</FormLabel>
                          <FormDescription>Check if the starter doubled or tripled in size</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      data-testid="button-reset-form"
                    >
                      Reset
                    </Button>
                    <Button 
                      type="button"
                      variant="secondary"
                      onClick={saveAsDefaults}
                      data-testid="button-save-defaults"
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Save as Defaults
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createLogMutation.isPending}
                      data-testid="button-save-log"
                      onClick={(e) => {
                        console.log('Save button clicked!', e);
                        console.log('Form errors:', form.formState.errors);
                        console.log('Form values:', form.getValues());
                      }}
                    >
                      {createLogMutation.isPending ? "Saving..." : "Save Log Entry"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Starter Log History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading your starter logs...</div>
              ) : starterLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No starter logs yet. Create your first entry to start tracking!
                </div>
              ) : (
                <div className="space-y-4">
                  {starterLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 space-y-3" data-testid={`starter-log-${log.id}`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          {log.logDate ? (() => {
                            try {
                              const safeDate = safeParseDate(log.logDate) || new Date();
                              return format(safeDate, "PPP 'at' p");
                            } catch (error) {
                              console.warn('Date formatting error for log date:', error);
                              return "Invalid date";
                            }
                          })() : "No date"}
                        </h3>
                        <Badge variant={log.starterStage === "peak" ? "default" : "secondary"}>
                          {log.starterStage?.replace("_", " ")}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Flour Types</p>
                          <p>
                            {(log.flourTypes as any[])?.map(f => `${f.type} (${f.percentage}%)`).join(", ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Feed Ratio</p>
                          <p>
                            {(log.feedRatio as any)?.starter}:
                            {(log.feedRatio as any)?.flour}:
                            {(log.feedRatio as any)?.water}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Hydration</p>
                          <p>{log.hydrationPercent}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Feed Amount</p>
                          <p>{log.feedAmountGrams}g</p>
                        </div>
                      </div>

                      {log.riseTimeHours && (
                        <div>
                          <p className="text-muted-foreground text-sm">Rise Time</p>
                          <p className="text-sm">
                            {log.riseTimeHours}h {log.riseTimeMinutes ? `${log.riseTimeMinutes}m` : ""}
                          </p>
                        </div>
                      )}

                      {log.conditionNotes && (
                        <div>
                          <p className="text-muted-foreground text-sm">Notes</p>
                          <p className="text-sm">{log.conditionNotes}</p>
                        </div>
                      )}

                      {log.discardUsed && log.discardRecipe && (
                        <div>
                          <p className="text-muted-foreground text-sm">Discard Used For</p>
                          <p className="text-sm">{log.discardRecipe}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Navigation */}
      <BottomNavigation currentPath="/starter-log" />
      
      <RecipeModal
        isOpen={recipeModalOpen}
        onClose={() => {
          setRecipeModalOpen(false);
        }}
        recipe={null}
        initialTab="manual"
      />
    </div>
  );
}