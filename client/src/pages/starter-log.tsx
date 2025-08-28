import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Camera, Plus, Thermometer, FlaskConical, Clock, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { insertStarterLogSchema, type StarterLog } from "@shared/schema";
import { format } from "date-fns";
import BottomNavigation from "@/components/bottom-navigation";

// Form schema with validation
const starterLogFormSchema = insertStarterLogSchema.extend({
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
  "Other"
];

const starterStageOptions = [
  { value: "just_fed", label: "Just Fed" },
  { value: "peak", label: "Peak Activity" },
  { value: "collapsing", label: "Collapsing" },
  { value: "sluggish", label: "Sluggish" }
];

export default function StarterLogPage() {
  const [activeTab, setActiveTab] = useState("new-log");
  const queryClient = useQueryClient();

  // Fetch starter logs
  const { data: starterLogs = [], isLoading } = useQuery<StarterLog[]>({
    queryKey: ["/api/starter-logs"],
  });

  // Create starter log mutation
  const createLogMutation = useMutation({
    mutationFn: async (data: StarterLogFormData) => {
      const response = await apiRequest("POST", "/api/starter-logs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/starter-logs"] });
      setActiveTab("history");
      form.reset();
    },
  });

  const form = useForm<StarterLogFormData>({
    resolver: zodResolver(starterLogFormSchema),
    defaultValues: {
      logDate: new Date(),
      flourTypes: [{ type: "White All-Purpose", percentage: 100 }],
      feedRatio: { starter: 1, flour: 2, water: 2 },
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
  }, [watchedFeedRatio, form]);

  const onSubmit = (data: StarterLogFormData) => {
    createLogMutation.mutate(data);
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
                      {form.watch("hydrationPercent") && (
                        <Badge variant="secondary" className="ml-4">
                          {form.watch("hydrationPercent")}% Hydration
                        </Badge>
                      )}
                    </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ambientTempF"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Thermometer className="h-4 w-4" />
                            Temperature (°F)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="32"
                              max="110"
                              placeholder="70"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-temp-f"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ambientTempC"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperature (°C)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="43"
                              placeholder="21"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-temp-c"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Starter Stage */}
                  <FormField
                    control={form.control}
                    name="starterStage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Starter Stage</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
                      type="submit" 
                      disabled={createLogMutation.isPending}
                      data-testid="button-save-log"
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
                          {format(new Date(log.logDate!), "PPP 'at' p")}
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
    </div>
  );
}