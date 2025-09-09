import { useState } from "react";
import { X, Camera, CheckCircle, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdaptiveStepGuideProps {
  stepName: string;
  stepDescription?: string;
  visualCues: string[];
  isOpen: boolean;
  onClose: () => void;
  onMarkComplete: () => void;
  onTakePhoto: () => void;
}

export default function AdaptiveStepGuide({
  stepName,
  stepDescription,
  visualCues = [],
  isOpen,
  onClose,
  onMarkComplete,
  onTakePhoto
}: AdaptiveStepGuideProps) {
  const [currentCueIndex, setCurrentCueIndex] = useState(0);

  if (!isOpen) return null;

  const nextCue = () => {
    if (currentCueIndex < visualCues.length - 1) {
      setCurrentCueIndex(currentCueIndex + 1);
    }
  };

  const prevCue = () => {
    if (currentCueIndex > 0) {
      setCurrentCueIndex(currentCueIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-500" />
              {stepName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Until ready</span>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                Adaptive
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Step description */}
          {stepDescription && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">{stepDescription}</p>
            </div>
          )}

          {/* Visual cues carousel */}
          {visualCues.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Visual Cues</h3>
                <div className="text-xs text-muted-foreground">
                  {currentCueIndex + 1} of {visualCues.length}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {currentCueIndex + 1}
                  </div>
                  <p className="text-sm text-orange-800 leading-relaxed">
                    {visualCues[currentCueIndex]}
                  </p>
                </div>
              </div>

              {visualCues.length > 1 && (
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevCue}
                    disabled={currentCueIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextCue}
                    disabled={currentCueIndex === visualCues.length - 1}
                  >
                    Next Cue
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Example image placeholders */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Reference Images</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-xs text-muted-foreground">
                  <div className="w-8 h-8 bg-muted-foreground/20 rounded mx-auto mb-1 flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                  Not Ready
                </div>
              </div>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-xs text-muted-foreground">
                  <div className="w-8 h-8 bg-green-500/20 rounded mx-auto mb-1 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  Ready!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3 p-4 border-t bg-muted/20">
          <Button
            variant="outline"
            onClick={onTakePhoto}
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
          <Button
            onClick={onMarkComplete}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            It's Ready!
          </Button>
        </div>

        {/* Helpful tip */}
        <div className="px-4 pb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 <strong>Tip:</strong> Take a photo to track progress over time. Look for the visual cues above to know when this step is complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}