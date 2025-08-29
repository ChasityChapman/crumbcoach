import { calculateHydration, getHydrationLevel } from "@/lib/hydrationCalculator";
import { Badge } from "@/components/ui/badge";
import { Droplets } from "lucide-react";

interface HydrationDisplayProps {
  ingredients: { name: string; amount: string }[];
  className?: string;
}

export default function HydrationDisplay({ ingredients, className = "" }: HydrationDisplayProps) {
  const hydrationData = calculateHydration(ingredients);
  const level = getHydrationLevel(hydrationData.hydrationPercentage);

  if (!hydrationData.isValid) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <Droplets className="w-4 h-4" />
        <span className="text-sm">Add flour and water to see hydration</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main hydration percentage */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-lg text-sourdough-800">
            {hydrationData.hydrationPercentage}%
          </span>
        </div>
        <Badge className={`${level.color} ${level.textColor} border-0`}>
          {level.level}
        </Badge>
      </div>

      {/* Breakdown and description */}
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex items-center justify-between">
          <span>Water: {Math.round(hydrationData.totalWater)}g</span>
          <span>Flour: {Math.round(hydrationData.totalFlour)}g</span>
        </div>
        <p className="italic">{level.description}</p>
      </div>
    </div>
  );
}