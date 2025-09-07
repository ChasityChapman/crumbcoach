import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { safeStarterLogQueries } from "@/lib/safeQueries";
import { safeMap } from "@/lib/safeArray";
import type { Starter, Flour } from "@shared/schema";
import { 
  calculateHydration, 
  calculateGramsFromRatio, 
  parseRatioString,
  DISCARD_OPTIONS 
} from "@shared/src/lib/starterTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, Save, Clock, Thermometer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HydrationCalculatorModal from "@/components/hydration-calculator-modal";

interface StarterNewEntryFormProps {
  starter: Starter;
}

export default function StarterNewEntryForm({ starter }: StarterNewEntryFormProps) {
  const { toast } = useToast();
  const [showHydrationCalc, setShowHydrationCalc] = useState(false);
  
  // Form state
  const [timestamp, setTimestamp] = useState(new Date());
  const [flourMix, setFlourMix] = useState<{ flourId: string; pct: number }[]>([]);
  const [ratioString, setRatioString] = useState("1:1:1");
  const [ratio, setRatio] = useState({ s: 1, f: 1, w: 1 });
  const [totalGrams, setTotalGrams] = useState(150);
  const [riseTimeHrs, setRiseTimeHrs] = useState<number | undefined>();
  const [ambientTemp, setAmbientTemp] = useState<number | undefined>();
  const [discardUse, setDiscardUse] = useState("");
  const [notes, setNotes] = useState("");

  // Get available flours
  // Mock flour data for now
  const flours = [
    { id: 'all-purpose', name: 'All Purpose' },
    { id: 'bread', name: 'Bread Flour' },
    { id: 'whole-wheat', name: 'Whole Wheat' },
    { id: 'rye', name: 'Rye' }
  ];

  // Load defaults from starter on mount
  useEffect(() => {
    if (starter.defaults) {
      const defaults = starter.defaults;
      setRatio({ s: defaults.ratioS, f: defaults.ratioF, w: defaults.ratioW });
      setRatioString(`${defaults.ratioS}:${defaults.ratioF}:${defaults.ratioW}`);
      setTotalGrams(defaults.totalGrams);
      setFlourMix(defaults.flourMix || []);
      
      if (defaults.hydrationTargetPct) {
        // Calculate water ratio to hit target hydration
        const waterRatio = (defaults.hydrationTargetPct / 100) * defaults.ratioF;
        const newRatio = { s: defaults.ratioS, f: defaults.ratioF, w: waterRatio };
        setRatio(newRatio);
        setRatioString(`${defaults.ratioS}:${defaults.ratioF}:${waterRatio.toFixed(1)}`);
      }
    }
  }, [starter.defaults]);

  // Calculate derived values
  const allocatedGrams = useMemo(() => 
    calculateGramsFromRatio(ratio, totalGrams), 
    [ratio, totalGrams]
  );

  const hydrationPct = useMemo(() => 
    calculateHydration(allocatedGrams.flour, allocatedGrams.water), 
    [allocatedGrams]
  );

  // Handle ratio string changes
  const handleRatioChange = (value: string) => {
    setRatioString(value);
    const parsed = parseRatioString(value);
    if (parsed) {
      setRatio(parsed);
    }
  };

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async () => {
      const entryData = {
        starterId: starter.id,
        timestamp: timestamp,
        flourMix: flourMix.length > 0 ? flourMix : [{ flourId: flours[0]?.id || "all-purpose", pct: 100 }],
        ratio,
        totalGrams,
        hydrationPct,
        riseTimeHrs,
        ambientTemp,
        discardUse: discardUse.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      
      return safeStarterLogQueries.create(entryData);
    },
    onSuccess: () => {
      toast({
        title: "Entry logged!",
        description: `${starter.name} feeding recorded successfully.`,
      });
      
      // Reset form to defaults
      if (starter.defaults) {
        setRiseTimeHrs(undefined);
        setAmbientTemp(undefined);
        setDiscardUse("");
        setNotes("");
        setTimestamp(new Date());
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["starter-entries"] });
      queryClient.invalidateQueries({ queryKey: ["starter-health"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to log entry",
        description: "Please try again.",
        variant: "destructive",
      });
      console.error("Entry creation failed:", error);
    },
  });

  const handleSave = () => {
    if (!flourMix.length && !flours.length) {
      toast({
        title: "Missing flour selection",
        description: "Please select at least one flour type.",
        variant: "destructive",
      });
      return;
    }
    
    createEntryMutation.mutate();
  };

  const saveAsDefaults = () => {
    // TODO: Implement save as defaults functionality
    toast({
      title: "Defaults saved!",
      description: "These settings will be used for future entries.",
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {/* Load defaults logic */}}
          className="text-xs"
        >
          Load Defaults
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={saveAsDefaults}
          className="text-xs"
        >
          Save as Default
        </Button>
      </div>

      {/* Date/Time */}
      <Card>
        <CardContent className="p-4">
          <Label htmlFor="timestamp">Date/Time</Label>
          <Input
            id="timestamp"
            type="datetime-local"
            value={timestamp.toISOString().slice(0, 16)}
            onChange={(e) => setTimestamp(new Date(e.target.value))}
            className="mt-1"
          />
        </CardContent>
      </Card>

      {/* Flour Type(s) */}
      <Card>
        <CardContent className="p-4">
          <Label>Flour Type(s)</Label>
          {flours.length > 0 ? (
            <Select value={flourMix[0]?.flourId || "all-purpose"} onValueChange={(flourId) => {
              setFlourMix([{ flourId, pct: 100 }]);
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select flour type" />
              </SelectTrigger>
              <SelectContent>
                {safeMap(flours, (flour) => (
                  <SelectItem key={flour.id} value={flour.id}>
                    {flour.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Loading flour types...</p>
          )}
        </CardContent>
      </Card>

      {/* Ratio & Hydration */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label htmlFor="ratio">Ratio (Starter:Flour:Water)</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="ratio"
              value={ratioString}
              onChange={(e) => handleRatioChange(e.target.value)}
              placeholder="1:1:1"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHydrationCalc(true)}
              className="shrink-0"
            >
              <Calculator className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Hydration:</span>
            <Badge variant="secondary" className="font-mono">
              {hydrationPct}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Total Amount */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label htmlFor="totalGrams">Total Amount ({starter.unitMass})</Label>
          <Input
            id="totalGrams"
            type="number"
            value={totalGrams}
            onChange={(e) => setTotalGrams(Math.max(5, parseInt(e.target.value) || 0))}
            min={5}
            max={2000}
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Starter: {allocatedGrams.starter}{starter.unitMass}</div>
            <div>Flour: {allocatedGrams.flour}{starter.unitMass}</div>
            <div>Water: {allocatedGrams.water}{starter.unitMass}</div>
          </div>
        </CardContent>
      </Card>

      {/* Rise Time */}
      <Card>
        <CardContent className="p-4">
          <Label htmlFor="riseTime">Rise time to peak (optional)</Label>
          <div className="flex items-center space-x-2 mt-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Input
              id="riseTime"
              type="number"
              value={riseTimeHrs || ""}
              onChange={(e) => setRiseTimeHrs(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="6"
              step="0.5"
              min="0"
              max="48"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        </CardContent>
      </Card>

      {/* Ambient Temperature */}
      <Card>
        <CardContent className="p-4">
          <Label htmlFor="ambientTemp">Ambient temperature (optional)</Label>
          <div className="flex items-center space-x-2 mt-1">
            <Thermometer className="w-4 h-4 text-muted-foreground" />
            <Input
              id="ambientTemp"
              type="number"
              value={ambientTemp || ""}
              onChange={(e) => setAmbientTemp(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="24"
              min={-10}
              max={50}
            />
            <span className="text-sm text-muted-foreground">°{starter.unitTemp}</span>
          </div>
        </CardContent>
      </Card>

      {/* Discard Usage */}
      <Card>
        <CardContent className="p-4">
          <Label>Discard used for</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {safeMap(DISCARD_OPTIONS, (option) => (
              <Button
                key={option}
                variant={discardUse === option ? "default" : "outline"}
                size="sm"
                onClick={() => setDiscardUse(discardUse === option ? "" : option)}
                className="text-xs h-7"
              >
                {option}
              </Button>
            ))}
          </div>
          {discardUse === "Other" && (
            <Input
              value={discardUse}
              onChange={(e) => setDiscardUse(e.target.value)}
              placeholder="Custom discard usage"
              className="mt-2"
            />
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="p-4">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Smelled fruity, lots of bubbles..."
            rows={3}
            className="mt-1"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-20 z-10">
        <Button
          onClick={handleSave}
          disabled={createEntryMutation.isPending}
          className="w-full bg-sourdough-500 hover:bg-sourdough-600 text-white py-3 text-base"
        >
          <Save className="w-4 h-4 mr-2" />
          {createEntryMutation.isPending ? "Saving..." : "Save Entry"}
        </Button>
      </div>

      <HydrationCalculatorModal
        isOpen={showHydrationCalc}
        onClose={() => setShowHydrationCalc(false)}
        onApply={(newRatio) => {
          setRatio(newRatio);
          setRatioString(`${newRatio.s}:${newRatio.f}:${newRatio.w}`);
        }}
        initialRatio={ratio}
        unitMass={starter.unitMass}
      />
    </div>
  );
}