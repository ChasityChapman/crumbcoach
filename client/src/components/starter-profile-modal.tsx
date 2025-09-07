import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Starter, Flour } from "@shared/schema";
import { safeStarterLogQueries } from "@/lib/safeQueries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Settings, Plus, Trash2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const starterProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  avatar: z.string().optional(),
  unitMass: z.enum(["g", "oz"]).default("g"),
  unitTemp: z.enum(["C", "F"]).default("C"),
  archived: z.boolean().default(false),
  defaults: z.object({
    ratioS: z.number().min(0.1).max(20).default(1),
    ratioF: z.number().min(0.1).max(20).default(1),
    ratioW: z.number().min(0.1).max(20).default(1),
    totalGrams: z.number().min(5).max(2000).default(150),
    hydrationTargetPct: z.number().min(50).max(200).optional(),
    reminderHours: z.number().min(1).max(168).default(24),
    quietStart: z.string().regex(/^\\d{2}:\\d{2}$/).default("22:00"),
    quietEnd: z.string().regex(/^\\d{2}:\\d{2}$/).default("07:00"),
  }).optional(),
});

type StarterProfileFormData = z.infer<typeof starterProfileSchema>;

interface StarterProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  starter: Starter | null; // null for creating new starter
}

const EMOJI_OPTIONS = ["🍞", "🧬", "🦠", "🫧", "⚗️", "🔬", "🌾", "🥖", "🥨", "🧪"];

export default function StarterProfileModal({
  isOpen,
  onClose,
  starter
}: StarterProfileModalProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const [defaultFlours, setDefaultFlours] = useState<Array<{ flourId: string; pct: number }>>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get available flours
  // Mock flour data for now
  const flours = [
    { id: 'all-purpose', name: 'All Purpose' },
    { id: 'bread', name: 'Bread Flour' },
    { id: 'whole-wheat', name: 'Whole Wheat' },
    { id: 'rye', name: 'Rye' }
  ];

  const form = useForm<StarterProfileFormData>({
    resolver: zodResolver(starterProfileSchema),
    defaultValues: {
      name: "",
      avatar: "🍞",
      unitMass: "g",
      unitTemp: "C",
      archived: false,
      defaults: {
        ratioS: 1,
        ratioF: 1,
        ratioW: 1,
        totalGrams: 150,
        reminderHours: 24,
        quietStart: "22:00",
        quietEnd: "07:00",
      },
    },
  });

  // Load starter data when modal opens
  useEffect(() => {
    if (isOpen && starter) {
      form.reset({
        name: starter.name,
        avatar: starter.avatar || "🍞",
        unitMass: starter.unitMass as "g" | "oz",
        unitTemp: starter.unitTemp as "C" | "F",
        archived: starter.archived || false,
        defaults: starter.defaults ? {
          ratioS: starter.defaults.ratioS,
          ratioF: starter.defaults.ratioF,
          ratioW: starter.defaults.ratioW,
          totalGrams: starter.defaults.totalGrams,
          hydrationTargetPct: starter.defaults.hydrationTargetPct || undefined,
          reminderHours: starter.defaults.reminderHours || 24,
          quietStart: starter.defaults.quietStart || "22:00",
          quietEnd: starter.defaults.quietEnd || "07:00",
        } : {
          ratioS: 1,
          ratioF: 1,
          ratioW: 1,
          totalGrams: 150,
          reminderHours: 24,
          quietStart: "22:00",
          quietEnd: "07:00",
        },
      });

      // Load default flours if editing existing starter
      if (starter.defaultFlours?.length) {
        setDefaultFlours(starter.defaultFlours.map(df => ({
          flourId: df.flourId,
          pct: df.pct
        })));
      }
    } else if (isOpen && !starter) {
      // Reset for new starter
      form.reset();
      setDefaultFlours([{ flourId: "all-purpose", pct: 100 }]);
    }
  }, [isOpen, starter, form]);

  // Create/update starter mutation
  const saveStarterMutation = useMutation({
    mutationFn: async (data: StarterProfileFormData) => {
      if (starter) {
        // Mock starter update for now
        return { success: true, ...data };
      } else {
        // Mock starter creation for now
        return { success: true, id: `starter-${Date.now()}`, ...data };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["starters"] });
      toast({
        title: starter ? "Starter Updated" : "Starter Created",
        description: starter ? "Your starter profile has been updated." : "Your new starter has been created.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${starter ? "update" : "create"} starter: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: StarterProfileFormData) => {
    // Validate flour percentages sum to 100
    const totalPct = defaultFlours.reduce((sum, df) => sum + df.pct, 0);
    if (Math.abs(totalPct - 100) > 1) {
      toast({
        title: "Invalid Flour Mix",
        description: "Flour percentages must sum to 100%",
        variant: "destructive",
      });
      return;
    }

    saveStarterMutation.mutate(data);
  };

  const addFlourRow = () => {
    setDefaultFlours([...defaultFlours, { flourId: "", pct: 0 }]);
  };

  const removeFlourRow = (index: number) => {
    setDefaultFlours(defaultFlours.filter((_, i) => i !== index));
  };

  const updateFlourRow = (index: number, field: "flourId" | "pct", value: string | number) => {
    const newFlours = [...defaultFlours];
    newFlours[index] = { ...newFlours[index], [field]: value };
    setDefaultFlours(newFlours);
  };

  // Calculate hydration percentage
  const watchedDefaults = form.watch("defaults");
  const hydrationPct = watchedDefaults?.ratioF && watchedDefaults?.ratioW
    ? Math.round((watchedDefaults.ratioW / watchedDefaults.ratioF) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {starter ? "Starter Profile & Defaults" : "Create New Starter"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="defaults">Defaults</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Starter Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Odin" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="avatar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avatar</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {EMOJI_OPTIONS.map((emoji) => (
                              <Button
                                key={emoji}
                                type="button"
                                variant={field.value === emoji ? "default" : "outline"}
                                size="sm"
                                onClick={() => field.onChange(emoji)}
                                className="text-xl"
                              >
                                {emoji}
                              </Button>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="unitMass"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mass Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="g">Grams (g)</SelectItem>
                                <SelectItem value="oz">Ounces (oz)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="unitTemp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="C">Celsius (°C)</SelectItem>
                                <SelectItem value="F">Fahrenheit (°F)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {starter && (
                      <FormField
                        control={form.control}
                        name="archived"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Archive Starter</FormLabel>
                              <FormDescription>
                                Archived starters won't appear in your main list
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Default Flour Mix */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Default Flour Mix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {defaultFlours.map((flour, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Select
                            value={flour.flourId}
                            onValueChange={(value) => updateFlourRow(index, "flourId", value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select flour type" />
                            </SelectTrigger>
                            <SelectContent>
                              {flours.filter(f => f.id && f.id.trim() !== '').map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="%"
                            value={flour.pct}
                            onChange={(e) => updateFlourRow(index, "pct", parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          {defaultFlours.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFlourRow(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addFlourRow}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Flour
                      </Button>
                      <div className="text-sm text-muted-foreground">
                        Total: {defaultFlours.reduce((sum, f) => sum + f.pct, 0)}% 
                        {Math.abs(defaultFlours.reduce((sum, f) => sum + f.pct, 0) - 100) > 1 && (
                          <Badge variant="destructive" className="ml-2">Must equal 100%</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="defaults" className="space-y-4">
                {/* Feeding Defaults */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Feeding Defaults</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Ratio */}
                    <div className="space-y-2">
                      <Label>Default Ratio (Starter : Flour : Water)</Label>
                      <div className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name="defaults.ratioS"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  className="w-16 text-center"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span>:</span>
                        <FormField
                          control={form.control}
                          name="defaults.ratioF"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  className="w-16 text-center"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span>:</span>
                        <FormField
                          control={form.control}
                          name="defaults.ratioW"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  className="w-16 text-center"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Badge variant="secondary" className="ml-2">
                          {hydrationPct}% hydration
                        </Badge>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="defaults.totalGrams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Total Amount ({form.watch("unitMass")})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="5"
                              max="2000"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="max-w-xs"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="defaults.hydrationTargetPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Hydration (%) - Optional</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="50"
                              max="200"
                              placeholder="Leave blank for auto-calculation"
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              className="max-w-xs"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Reminder Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reminder Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="defaults.reminderHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reminder Interval (hours)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="168"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              className="max-w-xs"
                            />
                          </FormControl>
                          <FormDescription>How often to remind you to feed your starter</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="defaults.quietStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quiet Hours Start</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="defaults.quietEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quiet Hours End</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormDescription>No notifications will be sent during quiet hours</FormDescription>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={saveStarterMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {saveStarterMutation.isPending ? "Saving..." : starter ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}