import { useState } from "react";
import { Clock, Check, MoreVertical, ChevronRight, TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SmartTimelineStep } from "@/hooks/use-smart-timeline";

interface SmartTimelineStepProps {
  step: SmartTimelineStep;
  onMarkDone: (stepId: string) => void;
  onSkip: (stepId: string) => void;
  onAdjustDuration: (stepId: string, newDuration: number) => void;
  onOpenStepSheet: (stepId: string) => void;
  isActive?: boolean;
}

export default function SmartTimelineStep({
  step,
  onMarkDone,
  onSkip,
  onAdjustDuration,
  onOpenStepSheet,
  isActive = false
}: SmartTimelineStepProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeRange = () => {
    const startTime = formatTime(step.startTime);
    const endTime = formatTime(step.endTime);
    return `${startTime}–${endTime}`;
  };

  const getDurationText = () => {
    if (step.adjustment) {
      const diff = step.adjustedDuration - step.originalDuration;
      const diffText = diff > 0 ? `+${diff}min` : `${diff}min`;
      const color = diff > 0 ? 'text-amber-600' : 'text-green-600';
      
      return (
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 line-through text-xs">
            {step.originalDuration}min
          </span>
          <span className="font-medium">
            {step.adjustedDuration}min
          </span>
          <span className={`text-xs ${color} flex items-center`}>
            {diff > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
            {diffText}
          </span>
        </div>
      );
    }
    
    return <span>{step.adjustedDuration}min</span>;
  };

  const getCountdownText = () => {
    if (step.status !== 'active') return null;
    
    const now = new Date();
    const remaining = step.endTime.getTime() - now.getTime();
    
    if (remaining <= 0) return "Time's up!";
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
    } else {
      return `${seconds}s remaining`;
    }
  };

  const getStepStatusColor = () => {
    switch (step.status) {
      case 'active':
        return 'bg-sourdough-50 border-l-4 border-l-sourdough-500';
      case 'completed':
        return 'bg-gray-50 opacity-75';
      case 'pending':
      default:
        return 'border border-sourdough-200';
    }
  };

  const handleQuickAdjust = (adjustment: number) => {
    const newDuration = Math.max(5, step.adjustedDuration + adjustment);
    onAdjustDuration(step.id, newDuration);
  };

  return (
    <div className={`rounded-lg p-4 transition-all ${getStepStatusColor()}`}>
      <div className="flex items-center space-x-3">
        {/* Status Indicator */}
        <div className="flex-shrink-0">
          {step.status === 'completed' ? (
            <div className="w-6 h-6 rounded-full bg-sourdough-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          ) : step.status === 'active' ? (
            <div className="w-6 h-6 rounded-full bg-sourdough-500 animate-pulse flex items-center justify-center">
              <Clock className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-sourdough-300" />
          )}
        </div>

        {/* Step Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-sourdough-800">
                  {step.name}
                </h4>
                {step.isEnvironmentSensitive && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full" title="Environment sensitive" />
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center space-x-3 text-sm text-sourdough-600">
                  <span>{formatTimeRange()}</span>
                  <span>•</span>
                  <div>{getDurationText()}</div>
                </div>
                
                {step.status === 'active' && (
                  <div className="text-sm font-medium text-sourdough-700">
                    {getCountdownText()}
                  </div>
                )}
              </div>

              {/* Adjustment Reason */}
              {step.adjustment && (
                <div className="mt-2 text-xs text-sourdough-600 bg-sourdough-100 rounded px-2 py-1">
                  {step.adjustment.reason}
                </div>
              )}
            </div>

            {/* Status Badge & Menu */}
            <div className="flex items-center space-x-2">
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                step.status === 'active' 
                  ? 'bg-sourdough-500 text-white' 
                  : step.status === 'completed'
                  ? 'bg-gray-200 text-gray-600'
                  : 'border border-sourdough-300 text-sourdough-600'
              }`}>
                {step.status === 'active' ? 'Active' 
                 : step.status === 'completed' ? 'Done' 
                 : 'Pending'}
              </div>

              {/* Quick Adjustment Controls */}
              {step.status === 'active' && step.isEnvironmentSensitive && (
                <div className="flex items-center space-x-1 bg-white rounded border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleQuickAdjust(-10)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-xs px-1 font-mono">±10m</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleQuickAdjust(10)}
                  >
                    <TrendingUp className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 hover:bg-muted/80 ${
                  step.status === 'active' 
                    ? 'bg-muted/50 text-foreground hover:bg-muted' 
                    : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStep(selectedStep === step.id ? null : step.id);
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Actions Menu */}
          {selectedStep === step.id && (
            <div className="mt-3 p-2 bg-white border rounded-md shadow-md">
              <div className="space-y-1">
                {step.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8"
                    onClick={() => {
                      onMarkDone(step.id);
                      setSelectedStep(null);
                    }}
                  >
                    Mark Done
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => {
                    onOpenStepSheet(step.id);
                    setSelectedStep(null);
                  }}
                >
                  View Details
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8"
                  onClick={() => {
                    setShowAdjustment(true);
                    setSelectedStep(null);
                  }}
                >
                  Adjust Duration
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-red-600"
                  onClick={() => {
                    onSkip(step.id);
                    setSelectedStep(null);
                  }}
                >
                  Skip Step
                </Button>
              </div>
            </div>
          )}

          {/* Duration Adjustment Panel */}
          {showAdjustment && (
            <div className="mt-3 p-3 bg-sourdough-50 border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Adjust Duration</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowAdjustment(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjust(-30)}
                >
                  -30m
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjust(-10)}
                >
                  -10m
                </Button>
                <div className="flex-1 text-center text-sm font-medium">
                  {step.adjustedDuration}min
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjust(10)}
                >
                  +10m
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjust(30)}
                >
                  +30m
                </Button>
              </div>
              
              <div className="text-xs text-sourdough-600">
                Original: {step.originalDuration}min
              </div>
            </div>
          )}
        </div>

        {/* Arrow for active steps */}
        {step.status === 'active' && (
          <ChevronRight 
            className="w-4 h-4 text-sourdough-400" 
            onClick={() => onOpenStepSheet(step.id)}
          />
        )}
      </div>
    </div>
  );
}