import { useState } from "react";
import { X, SkipForward, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SkipConfirmationModalProps {
  isOpen: boolean;
  stepName: string;
  stepDuration: number; // minutes
  onClose: () => void;
  onConfirmSkip: (pullForward: boolean) => void;
}

export default function SkipConfirmationModal({
  isOpen,
  stepName,
  stepDuration,
  onClose,
  onConfirmSkip
}: SkipConfirmationModalProps) {
  const [pullForward, setPullForward] = useState(true);

  if (!isOpen) return null;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-lg">Skip Step?</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Step info */}
          <div className="bg-muted/50 rounded-lg p-3">
            <h3 className="font-medium text-sm mb-1">
              Skip '{stepName}' ({formatDuration(stepDuration)})?
            </h3>
            <p className="text-xs text-muted-foreground">
              This will mark the step as skipped and move to the next step.
            </p>
          </div>

          {/* Schedule adjustment options */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Schedule Adjustment</h4>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="adjustment"
                checked={pullForward}
                onChange={() => setPullForward(true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-sm text-green-700">
                  Pull earlier steps forward by {formatDuration(stepDuration)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: This will move all remaining steps earlier to maintain your original finish time.
                </p>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="adjustment"
                checked={!pullForward}
                onChange={() => setPullForward(false)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  Keep original timing
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave all other steps unchanged. Your bake will finish {formatDuration(stepDuration)} earlier than planned.
                </p>
              </div>
            </label>
          </div>

          {/* Timeline preview */}
          {pullForward && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Timeline Update</span>
              </div>
              <p className="text-xs text-blue-700">
                All remaining steps will be moved {formatDuration(stepDuration)} earlier. 
                You'll get new notifications at the updated times.
              </p>
            </div>
          )}

          {/* Warning for important steps */}
          {stepDuration >= 60 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Important Step</span>
              </div>
              <p className="text-xs text-yellow-700">
                This is a long step ({formatDuration(stepDuration)}). Skipping it may significantly affect your bake quality.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirmSkip(pullForward)}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip Step
          </Button>
        </div>
      </div>
    </div>
  );
}