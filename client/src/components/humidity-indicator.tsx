import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplets, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState, useEffect } from "react";
import { getHumidity, timeMultiplierFromRH, hydrationDeltaFromRH } from "@/lib/humidity-adjustments";

interface HumidityIndicatorProps {
  currentHumidity?: number;
  showRealTime?: boolean;
}

export default function HumidityIndicator({ currentHumidity, showRealTime = false }: HumidityIndicatorProps) {
  const [realHumidity, setRealHumidity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const humidity = realHumidity ?? currentHumidity ?? 0;
  const timeMultiplier = timeMultiplierFromRH(humidity);
  const hydrationDelta = hydrationDeltaFromRH(humidity);

  useEffect(() => {
    if (showRealTime) {
      fetchRealHumidity();
    }
  }, [showRealTime]);

  const fetchRealHumidity = async () => {
    setIsLoading(true);
    try {
      const rh = await getHumidity();
      setRealHumidity(rh);
    } catch (error) {
      console.log('Could not fetch real humidity data');
    } finally {
      setIsLoading(false);
    }
  };

  const getHumidityLevel = (rh: number) => {
    if (rh >= 70) return { level: "Very High", color: "bg-blue-500", severity: "high" };
    if (rh >= 55) return { level: "High", color: "bg-blue-400", severity: "moderate" };
    if (rh <= 30) return { level: "Very Low", color: "bg-orange-500", severity: "high" };
    if (rh <= 40) return { level: "Low", color: "bg-orange-400", severity: "moderate" };
    return { level: "Normal", color: "bg-green-500", severity: "normal" };
  };

  const getAdjustmentIcon = (multiplier: number) => {
    if (multiplier > 1) return <TrendingUp className="h-4 w-4" />;
    if (multiplier < 1) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const humidityInfo = getHumidityLevel(humidity);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Droplets className="h-4 w-4" />
          Humidity Impact
          {showRealTime && realHumidity && (
            <Badge variant="secondary" className="text-xs">Live</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${humidityInfo.color}`} />
            <span className="text-sm font-medium">{Math.round(humidity)}% RH</span>
          </div>
          <Badge 
            variant={humidityInfo.severity === "high" ? "destructive" : 
                    humidityInfo.severity === "moderate" ? "default" : "secondary"}
            className="text-xs"
          >
            {humidityInfo.level}
          </Badge>
        </div>

        {timeMultiplier !== 1.0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Fermentation time:</span>
            <div className="flex items-center gap-1">
              {getAdjustmentIcon(timeMultiplier)}
              <span className="font-medium">×{timeMultiplier.toFixed(2)}</span>
            </div>
          </div>
        )}

        {hydrationDelta !== 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Water adjustment:</span>
            <span className="font-medium">
              {hydrationDelta > 0 ? '+' : ''}{Math.round(hydrationDelta * 100)}%
            </span>
          </div>
        )}

        {showRealTime && (
          <div className="pt-2 border-t">
            <button
              onClick={fetchRealHumidity}
              disabled={isLoading}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update from location'}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}