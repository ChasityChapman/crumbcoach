import React, { useState, useMemo } from "react";
import { calculateHydration, calculateGramsFromRatio } from "@shared/src/lib/starterTypes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calculator, Check, X } from "lucide-react";

interface HydrationCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (ratio: { s: number; f: number; w: number }) => void;
  initialRatio: { s: number; f: number; w: number };
  unitMass: string;
}

export default function HydrationCalculatorModal({
  isOpen,
  onClose,
  onApply,
  initialRatio,
  unitMass
}: HydrationCalculatorModalProps) {
  const [ratio, setRatio] = useState(initialRatio);
  const [targetHydration, setTargetHydration] = useState(100);
  const [totalGrams, setTotalGrams] = useState(150);

  // Calculate derived values
  const allocatedGrams = useMemo(() => 
    calculateGramsFromRatio(ratio, totalGrams), 
    [ratio, totalGrams]
  );

  const actualHydration = useMemo(() => 
    calculateHydration(allocatedGrams.flour, allocatedGrams.water), 
    [allocatedGrams]
  );

  // Handle hydration target change
  const handleTargetHydrationChange = (hydration: number) => {
    setTargetHydration(hydration);
    const waterRatio = (hydration / 100) * ratio.f;
    setRatio({ ...ratio, w: waterRatio });
  };

  // Handle ratio component changes
  const handleRatioChange = (component: 's' | 'f' | 'w', value: number) => {
    const newRatio = { ...ratio, [component]: value };
    setRatio(newRatio);
    
    // Update target hydration based on new water ratio
    const newHydration = calculateHydration(newRatio.f, newRatio.w);
    setTargetHydration(newHydration);
  };

  const handleApply = () => {
    onApply(ratio);
    onClose();
  };

  const handleReset = () => {
    setRatio(initialRatio);
    setTargetHydration(calculateHydration(initialRatio.f, initialRatio.w));
  };

  // Common hydration presets
  const presets = [
    { name: "50%", value: 50 },
    { name: "75%", value: 75 },
    { name: "100%", value: 100 },
    { name: "125%", value: 125 },
    { name: "150%", value: 150 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="w-5 h-5" />
            <span>Hydration Calculator</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Ratio Display */}
          <Card className="bg-sourdough-25">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Current Ratio</div>
                <div className="text-lg font-mono font-semibold">
                  {ratio.s.toFixed(1)} : {ratio.f.toFixed(1)} : {ratio.w.toFixed(1)}
                </div>
                <Badge variant="secondary" className="mt-2">
                  {actualHydration}% hydration
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Target Hydration Slider */}
          <div className="space-y-3">
            <Label>Target Hydration: {targetHydration}%</Label>
            <Slider
              value={[targetHydration]}
              onValueChange={([value]) => handleTargetHydrationChange(value)}
              min={50}
              max={200}
              step={5}
              className="w-full"
            />
            
            {/* Hydration Presets */}
            <div className="flex space-x-2">
              {presets.map((preset) => (
                <Button
                  key={preset.name}
                  variant={targetHydration === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTargetHydrationChange(preset.value)}
                  className="text-xs flex-1"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Manual Ratio Adjustment */}
          <div className="space-y-3">
            <Label>Manual Ratio Adjustment</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="starter-ratio" className="text-xs">Starter</Label>
                <Input
                  id="starter-ratio"
                  type="number"
                  value={ratio.s.toFixed(1)}
                  onChange={(e) => handleRatioChange('s', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  className="text-center"
                />
              </div>
              <div>
                <Label htmlFor="flour-ratio" className="text-xs">Flour</Label>
                <Input
                  id="flour-ratio"
                  type="number"
                  value={ratio.f.toFixed(1)}
                  onChange={(e) => handleRatioChange('f', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  className="text-center"
                />
              </div>
              <div>
                <Label htmlFor="water-ratio" className="text-xs">Water</Label>
                <Input
                  id="water-ratio"
                  type="number"
                  value={ratio.w.toFixed(1)}
                  onChange={(e) => handleRatioChange('w', parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  className="text-center"
                />
              </div>
            </div>
          </div>

          {/* Total Amount Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preview ({totalGrams}{unitMass} total)</Label>
              <Input
                type="number"
                value={totalGrams}
                onChange={(e) => setTotalGrams(parseInt(e.target.value) || 0)}
                className="w-20 text-center"
                min="5"
                max="2000"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded">
              <div>Starter: {allocatedGrams.starter}{unitMass}</div>
              <div>Flour: {allocatedGrams.flour}{unitMass}</div>
              <div>Water: {allocatedGrams.water}{unitMass}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 bg-sourdough-500 hover:bg-sourdough-600"
            >
              <Check className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}