import { useState } from "react";
import { format, addMinutes } from "date-fns";
import { X, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineItem {
  id: string;
  stepName: string;
  status: 'active' | 'pending' | 'completed';
  startAt: Date;
  endAt: Date;
  duration: number;
}

interface RecalibrationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: TimelineItem[];
  selectedStepId?: string | null;
  onApplyRecalibration: (type: 'shift' | 'compress' | 'single', delta: number, stepId?: string) => void;
}

type RecalibrationType = 'shift' | 'compress' | 'single';

export default function RecalibrationSheet({
  isOpen,
  onClose,
  items,
  selectedStepId,
  onApplyRecalibration
}: RecalibrationSheetProps) {
  const [recalibrationType, setRecalibrationType] = useState<RecalibrationType>('shift');
  const [deltaMinutes, setDeltaMinutes] = useState(0);

  if (!isOpen) return null;

  const selectedStep = selectedStepId && Array.isArray(items) ? items.find(item => item.id === selectedStepId) : null;
  const activeStep = Array.isArray(items) ? items.find(item => item.status === 'active') : null;
  const pendingItems = Array.isArray(items) ? items.filter(item => item.status === 'pending') : [];

  // Calculate recalibrated schedule based on type and delta
  const getRecalibratedSchedule = () => {
    // Ensure items is an array
    if (!items || !Array.isArray(items)) {
      return [];
    }

    if (recalibrationType === 'shift') {
      // Shift all remaining steps by delta
      return items.map(item => {
        if (item.status === 'completed') return item;
        
        return {
          ...item,
          startAt: addMinutes(item.startAt, deltaMinutes),
          endAt: addMinutes(item.endAt, deltaMinutes)
        };
      });
    } else if (recalibrationType === 'compress') {
      // Keep finish time, compress gaps
      const lastStep = items[items.length - 1];
      const totalCompressionNeeded = deltaMinutes;
      const pendingSteps = items.filter(item => item.status === 'pending');
      
      if (pendingSteps.length === 0) return items;
      
      const compressionPerStep = Math.floor(totalCompressionNeeded / pendingSteps.length);
      let accumulatedCompression = 0;
      
      return items.map(item => {
        if (item.status === 'completed') return item;
        if (item.status === 'active') return item;
        
        accumulatedCompression += compressionPerStep;
        return {
          ...item,
          startAt: addMinutes(item.startAt, -accumulatedCompression),
          endAt: addMinutes(item.endAt, -accumulatedCompression)
        };
      });
    } else if (recalibrationType === 'single' && selectedStep) {
      // Edit single step duration only
      return items.map(item => {
        if (item.id !== selectedStep.id) return item;
        
        return {
          ...item,
          duration: Math.max(1, item.duration + deltaMinutes),
          endAt: addMinutes(item.startAt, Math.max(1, item.duration + deltaMinutes))
        };
      });
    }
    
    return items;
  };

  const recalibratedItems = getRecalibratedSchedule();
  const presetDeltas = [5, 10, 15, 30];

  const handleApply = () => {
    onApplyRecalibration(recalibrationType, deltaMinutes, selectedStepId || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-background rounded-t-lg sm:rounded-lg w-full sm:w-96 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Recalibrate Timeline</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Recalibration Type */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Recalibration Type
            </h3>
            
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="recalibration"
                  value="shift"
                  checked={recalibrationType === 'shift'}
                  onChange={(e) => setRecalibrationType(e.target.value as RecalibrationType)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">Shift remaining steps</div>
                  <div className="text-sm text-muted-foreground">
                    Move all upcoming steps by the same amount
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="recalibration"
                  value="compress"
                  checked={recalibrationType === 'compress'}
                  onChange={(e) => setRecalibrationType(e.target.value as RecalibrationType)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium">Keep finish time</div>
                  <div className="text-sm text-muted-foreground">
                    Compress gaps between steps to maintain ETA
                  </div>
                </div>
              </label>

              {selectedStep && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="recalibration"
                    value="single"
                    checked={recalibrationType === 'single'}
                    onChange={(e) => setRecalibrationType(e.target.value as RecalibrationType)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Edit single step only</div>
                    <div className="text-sm text-muted-foreground">
                      Only adjust "{selectedStep.stepName}" duration
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Delta Controls */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Time Adjustment
            </h3>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeltaMinutes(Math.max(-60, deltaMinutes - 1))}
                className="w-8 h-8 p-0"
              >
                -
              </Button>
              
              <div className="flex-1 text-center">
                <input
                  type="number"
                  value={deltaMinutes}
                  onChange={(e) => setDeltaMinutes(parseInt(e.target.value) || 0)}
                  className="w-full text-center border rounded px-2 py-1"
                  placeholder="0"
                />
                <div className="text-xs text-muted-foreground mt-1">minutes</div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeltaMinutes(Math.min(120, deltaMinutes + 1))}
                className="w-8 h-8 p-0"
              >
                +
              </Button>
            </div>

            <div className="flex space-x-2">
              {presetDeltas.map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setDeltaMinutes(preset)}
                  className="flex-1"
                >
                  +{preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Before/After Preview */}
          {deltaMinutes !== 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Timeline Preview
              </h3>
              
              <div className="space-y-2">
                {(Array.isArray(items) ? items.slice(0, 3) : []).map((item, index) => {
                  const recalibratedItem = recalibratedItems[index];
                  const hasChanged = item.startAt.getTime() !== recalibratedItem.startAt.getTime() || 
                                   item.endAt.getTime() !== recalibratedItem.endAt.getTime() ||
                                   item.duration !== recalibratedItem.duration;
                  
                  if (item.status === 'completed') return null;
                  
                  return (
                    <div key={item.id} className="flex items-center space-x-2 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.stepName}</div>
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <span>
                            {format(item.startAt, 'h:mm a')} • {item.duration}min
                          </span>
                          {hasChanged && (
                            <>
                              <ArrowRight className="w-3 h-3" />
                              <span className="text-primary">
                                {format(recalibratedItem.startAt, 'h:mm a')} • {recalibratedItem.duration}min
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {hasChanged && (
                        <div className={`w-2 h-2 rounded-full ${
                          deltaMinutes > 0 ? 'bg-orange-500' : 'bg-blue-500'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-4 border-t bg-muted/20">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            className="flex-1"
            disabled={deltaMinutes === 0}
          >
            Apply recalibration
          </Button>
        </div>
      </div>
    </div>
  );
}