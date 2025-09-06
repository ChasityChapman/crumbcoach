import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { safeStarterLogQueries } from "@/lib/safeQueries";
import { safeMap, safeFind } from "@/lib/safeArray";
import type { Starter, StarterEntry, Flour } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Filter, Search, Calendar, TrendingUp, Clock, Thermometer } from "lucide-react";
import { format, subDays, isWithinInterval } from "date-fns";
import StarterTrends from "@/components/starter-trends";

interface StarterHistoryProps {
  starter: Starter;
}

type DateRange = "7d" | "30d" | "custom";

export default function StarterHistory({ starter }: StarterHistoryProps) {
  // Filter state
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [flourFilter, setFlourFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTrends, setShowTrends] = useState(false);

  // Get entries for this starter (using starter log queries as fallback)
  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ["starter-entries", starter.id],
    queryFn: () => safeStarterLogQueries.getAll(),
    staleTime: 1 * 60 * 1000,
  });

  // Mock flour data for now
  const flours = [
    { id: 'all-purpose', name: 'All Purpose' },
    { id: 'bread', name: 'Bread Flour' },
    { id: 'whole-wheat', name: 'Whole Wheat' },
    { id: 'rye', name: 'Rye' }
  ];

  // Filter entries based on criteria
  const filteredEntries = useMemo(() => {
    let filtered = [...allEntries];

    // Date range filter
    const now = new Date();
    let startDate: Date;
    
    switch (dateRange) {
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subDays(now, 365); // Default to 1 year
    }

    filtered = filtered.filter(entry => 
      isWithinInterval(new Date(entry.timestamp), { start: startDate, end: now })
    );

    // Flour filter
    if (flourFilter) {
      filtered = filtered.filter(entry => 
        entry.flourMix?.some(mix => mix.flourId === flourFilter)
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.notes?.toLowerCase().includes(query) ||
        entry.discardUse?.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [allEntries, dateRange, flourFilter, searchQuery]);

  const getFlourName = (flourId: string) => {
    const flour = safeFind(flours, f => f.id === flourId);
    return flour?.name || "Unknown Flour";
  };

  const getStageDisplay = (entry: StarterEntry) => {
    // Simple heuristic based on time since entry
    const hoursSince = (Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < 2) return { label: "Fed", color: "bg-green-100 text-green-800" };
    if (entry.riseTimeHrs && hoursSince >= entry.riseTimeHrs) {
      return { label: "Peaked", color: "bg-blue-100 text-blue-800" };
    }
    return { label: "Rising", color: "bg-amber-100 text-amber-800" };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-sourdough-100">
              <div className="h-4 bg-sourdough-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-sourdough-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Date Range */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flour Filter & Search */}
            <div className="flex space-x-2">
              <Select value={flourFilter} onValueChange={setFlourFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="All flours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All flours</SelectItem>
                  {safeMap(flours, flour => (
                    <SelectItem key={flour.id} value={flour.id}>
                      {flour.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes, discard usage..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggle Trends */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-sourdough-800">
          History ({filteredEntries.length} entries)
        </h3>
        <Button
          variant={showTrends ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTrends(!showTrends)}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Trends
        </Button>
      </div>

      {/* Trends Section */}
      {showTrends && (
        <StarterTrends 
          entries={filteredEntries} 
          starter={starter}
        />
      )}

      {/* Entry List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No entries found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          safeMap(filteredEntries, (entry) => {
            const stage = getStageDisplay(entry);
            
            return (
              <Card key={entry.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">
                          {format(new Date(entry.timestamp), "EEE • h:mm a")}
                        </span>
                        <Badge className={`text-xs ${stage.color}`}>
                          {stage.label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.timestamp), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {entry.hydrationPct}% hydration
                      </Badge>
                    </div>
                  </div>

                  {/* Flour Mix */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {safeMap(entry.flourMix || [], (mix) => (
                      <Badge key={mix.flourId} variant="secondary" className="text-xs">
                        {getFlourName(mix.flourId)} {mix.pct}%
                      </Badge>
                    ))}
                  </div>

                  {/* Ratio and amounts */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <div>
                      Ratio: {entry.ratioS}:{entry.ratioF}:{entry.ratioW}
                    </div>
                    <div>
                      Total: {entry.totalGrams}{starter.unitMass}
                    </div>
                  </div>

                  {/* Additional details */}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    {entry.riseTimeHrs && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{entry.riseTimeHrs}h rise</span>
                      </div>
                    )}
                    {entry.ambientTemp && (
                      <div className="flex items-center space-x-1">
                        <Thermometer className="w-3 h-3" />
                        <span>{entry.ambientTemp}°{starter.unitTemp}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes and discard */}
                  {(entry.notes || entry.discardUse) && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-1">
                        {entry.discardUse && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Discard:</span> {entry.discardUse}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="text-sm text-sourdough-700">
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}