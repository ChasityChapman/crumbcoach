import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { safeMap } from "@/lib/safeArray";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Thermometer, Clock, AlertTriangle, CheckCircle2, Flame } from "lucide-react";

interface OvenEvent {
  time: Date;
  type: 'preheat' | 'start' | 'end' | 'temp_change';
  temperature: number;
  recipeName: string;
  stepName: string;
  recipeId: string;
}

interface OvenConflict {
  time: Date;
  recipes: string[];
  temperatures: number[];
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

interface OvenScheduleViewProps {
  ovenSchedule: OvenEvent[];
  conflicts: OvenConflict[];
  className?: string;
}

export default function OvenScheduleView({ ovenSchedule, conflicts, className = "" }: OvenScheduleViewProps) {
  
  // Group events by day and create timeline blocks
  const dailySchedule = useMemo(() => {
    if (!ovenSchedule.length) return [];

    // Group events by day
    const dayGroups = ovenSchedule.reduce((groups, event) => {
      const dayKey = format(event.time, 'yyyy-MM-dd');
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(event);
      return groups;
    }, {} as Record<string, OvenEvent[]>);

    // Convert to sorted array of day schedules
    return Object.entries(dayGroups)
      .map(([day, events]) => ({
        day: new Date(day),
        events: events.sort((a, b) => a.time.getTime() - b.time.getTime()),
      }))
      .sort((a, b) => a.day.getTime() - b.day.getTime());
  }, [ovenSchedule]);

  // Create timeline blocks showing oven utilization
  const createTimelineBlocks = (events: OvenEvent[]) => {
    const blocks: Array<{
      startTime: Date;
      endTime: Date;
      temperature: number;
      recipes: string[];
      stepNames: string[];
      type: 'active' | 'preheat';
    }> = [];

    let activeBlock: any = null;

    events.forEach(event => {
      if (event.type === 'preheat') {
        // Start a preheat block
        if (activeBlock && activeBlock.type === 'preheat' && activeBlock.temperature === event.temperature) {
          // Extend existing preheat block
          activeBlock.recipes.push(event.recipeName);
          activeBlock.stepNames.push(event.stepName);
        } else {
          // End previous block if exists
          if (activeBlock) {
            blocks.push(activeBlock);
          }
          // Start new preheat block
          activeBlock = {
            startTime: event.time,
            endTime: event.time, // Will be updated
            temperature: event.temperature,
            recipes: [event.recipeName],
            stepNames: [event.stepName],
            type: 'preheat'
          };
        }
      } else if (event.type === 'start') {
        // Convert preheat to active or start new active block
        if (activeBlock && activeBlock.type === 'preheat') {
          activeBlock.type = 'active';
          activeBlock.endTime = event.time;
        } else {
          // End previous block
          if (activeBlock) {
            blocks.push(activeBlock);
          }
          // Start new active block
          activeBlock = {
            startTime: event.time,
            endTime: event.time,
            temperature: event.temperature,
            recipes: [event.recipeName],
            stepNames: [event.stepName],
            type: 'active'
          };
        }
      } else if (event.type === 'end') {
        if (activeBlock) {
          activeBlock.endTime = event.time;
          // Check if there are more recipes in this block
          const remainingSteps = activeBlock.stepNames.filter((step: string) => step !== event.stepName);
          if (remainingSteps.length === 0) {
            blocks.push(activeBlock);
            activeBlock = null;
          } else {
            activeBlock.stepNames = remainingSteps;
            activeBlock.recipes = activeBlock.recipes.filter((recipe: string) => recipe !== event.recipeName);
          }
        }
      }
    });

    // Add final block if exists
    if (activeBlock) {
      blocks.push(activeBlock);
    }

    return blocks;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBlockColor = (type: string, temperature: number) => {
    if (type === 'preheat') {
      return 'bg-orange-100 border-orange-300 text-orange-800';
    }
    
    // Color code by temperature range
    if (temperature >= 450) return 'bg-red-100 border-red-300 text-red-800';
    if (temperature >= 375) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    if (temperature >= 300) return 'bg-blue-100 border-blue-300 text-blue-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  if (!ovenSchedule.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Thermometer className="w-5 h-5 text-accent-orange-500" />
            <span>Oven Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-sourdough-600">
            <Flame className="w-12 h-12 mx-auto mb-4 text-sourdough-300" />
            <p>No oven usage scheduled</p>
            <p className="text-sm text-sourdough-500 mt-1">Add recipes with baking steps to see oven coordination</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="font-medium mb-2">Oven Temperature Conflicts Detected</div>
            <div className="space-y-2">
              {safeMap(conflicts, (conflict, index) => (
                <div key={index} className="text-sm">
                  <div className="font-medium">
                    {format(conflict.time, 'h:mm a')} - {conflict.temperatures.join('°F vs ')}°F
                  </div>
                  <div className="text-amber-700">
                    {conflict.recipes.join(' & ')}
                  </div>
                  <div className="text-amber-600 italic">{conflict.suggestion}</div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Daily Oven Schedule */}
      {safeMap(dailySchedule, ({ day, events }) => {
        const timelineBlocks = createTimelineBlocks(events);
        
        return (
          <Card key={day.toISOString()}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Thermometer className="w-5 h-5 text-accent-orange-500" />
                  <span>Oven Schedule - {format(day, 'EEEE, MMMM d')}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {timelineBlocks.length} sessions
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {safeMap(timelineBlocks, (block, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${getBlockColor(block.type, block.temperature)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {block.type === 'preheat' ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <Flame className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {block.type === 'preheat' ? 'Preheat' : 'Active Baking'}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {block.temperature}°F
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3" />
                        <span>
                          {format(block.startTime, 'h:mm a')} - {format(block.endTime, 'h:mm a')}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {safeMap(block.recipes, (recipe, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{recipe}</span>
                            <span className="text-xs opacity-75">({block.stepNames[idx]})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                {timelineBlocks.length === 0 && (
                  <div className="text-center py-4 text-sourdough-500">
                    <Flame className="w-8 h-8 mx-auto mb-2 text-sourdough-300" />
                    <p>No oven usage scheduled for this day</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}