import React, { useMemo } from "react";
import type { Starter, StarterEntry } from "@shared/schema";
import { safeMap } from "@/lib/safeArray";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Droplets, Clock, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface StarterTrendsProps {
  entries: StarterEntry[];
  starter: Starter;
}

export default function StarterTrends({ entries, starter }: StarterTrendsProps) {
  // Calculate trend data
  const trendData = useMemo(() => {
    if (entries.length < 2) return null;

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Hydration trend
    const hydrationValues = sortedEntries.map(e => e.hydrationPct);
    const hydrationAvg = hydrationValues.reduce((sum, val) => sum + val, 0) / hydrationValues.length;
    const hydrationTrend = hydrationValues.length > 1 
      ? hydrationValues[hydrationValues.length - 1] - hydrationValues[0]
      : 0;

    // Rise time analysis
    const riseTimeEntries = sortedEntries.filter(e => e.riseTimeHrs);
    const riseTimeAvg = riseTimeEntries.length > 0
      ? riseTimeEntries.reduce((sum, e) => sum + (e.riseTimeHrs || 0), 0) / riseTimeEntries.length
      : 0;

    // Feeding frequency
    const dateRange = differenceInDays(
      new Date(sortedEntries[sortedEntries.length - 1].timestamp),
      new Date(sortedEntries[0].timestamp)
    );
    const feedingFrequency = dateRange > 0 ? entries.length / dateRange : 0;

    // Temperature correlation
    const tempEntries = sortedEntries.filter(e => e.ambientTemp && e.riseTimeHrs);
    const tempCorrelation = tempEntries.length > 1 ? calculateCorrelation(
      tempEntries.map(e => e.ambientTemp!),
      tempEntries.map(e => e.riseTimeHrs!)
    ) : null;

    // Flour usage distribution
    const flourUsage: Record<string, number> = {};
    sortedEntries.forEach(entry => {
      entry.flourMix?.forEach(mix => {
        flourUsage[mix.flourId] = (flourUsage[mix.flourId] || 0) + 1;
      });
    });

    return {
      hydrationAvg: Math.round(hydrationAvg),
      hydrationTrend,
      riseTimeAvg: Math.round(riseTimeAvg * 10) / 10,
      feedingFrequency: Math.round(feedingFrequency * 10) / 10,
      tempCorrelation,
      flourUsage,
      totalEntries: entries.length,
      dateRange
    };
  }, [entries]);

  // Simple correlation calculation
  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-3 h-3 text-green-600" />;
    if (value < 0) return <TrendingDown className="w-3 h-3 text-red-600" />;
    return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
  };

  const getCorrelationText = (correlation: number | null) => {
    if (correlation === null) return "Insufficient data";
    if (correlation > 0.3) return "Higher temp → faster rise";
    if (correlation < -0.3) return "Higher temp → slower rise";
    return "No clear pattern";
  };

  if (!trendData || entries.length < 2) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Not enough data for trends</p>
            <p className="text-sm mt-1">Log more entries to see patterns</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Hydration</p>
                <p className="text-lg font-semibold">{trendData.hydrationAvg}%</p>
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(trendData.hydrationTrend)}
                <span className="text-xs text-muted-foreground">
                  {trendData.hydrationTrend > 0 ? '+' : ''}{Math.round(trendData.hydrationTrend)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Rise Time</p>
                <p className="text-lg font-semibold">
                  {trendData.riseTimeAvg > 0 ? `${trendData.riseTimeAvg}h` : 'N/A'}
                </p>
              </div>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Feeding Frequency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Feeding frequency</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {trendData.feedingFrequency} feeds/day
            </Badge>
          </div>

          {/* Temperature Correlation */}
          {trendData.tempCorrelation !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Droplets className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Temp vs Rise Time</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {getCorrelationText(trendData.tempCorrelation)}
              </span>
            </div>
          )}

          {/* Activity Summary */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {trendData.totalEntries} entries over {trendData.dateRange} days
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Simple Hydration Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Hydration Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {safeMap(entries.slice(-7), (entry, index) => { // Last 7 entries
              const date = format(new Date(entry.timestamp), "MMM d");
              const hydration = entry.hydrationPct;
              const maxHydration = Math.max(...entries.map(e => e.hydrationPct));
              const width = (hydration / maxHydration) * 100;
              
              return (
                <div key={entry.id} className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground w-12 text-right">{date}</span>
                  <div className="flex-1 bg-sourdough-100 rounded-full h-2">
                    <div 
                      className="bg-sourdough-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono w-8">{hydration}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}