import { format } from "date-fns";
import { safeParseDate } from "@/lib/utils";
import { Clock, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NextStepTileProps {
  stepName: string;
  startTime: Date;
  duration: number;
  onClick: () => void;
  onDismiss?: () => void;
}

export default function NextStepTile({ stepName, startTime, duration, onClick, onDismiss }: NextStepTileProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;
  return (
    <div 
      className="fixed bottom-24 left-4 right-4 bg-accent-orange-500 text-white rounded-2xl p-4 shadow-xl border-2 border-accent-orange-400 cursor-pointer z-40 transition-all hover:shadow-2xl hover:scale-[1.02] backdrop-blur-sm bg-accent-orange-500/95"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">
              Next: {stepName}
            </p>
            <p className="text-xs opacity-90">
              {(() => {
                try {
                  const safeDate = safeParseDate(startTime) || new Date();
                  return format(safeDate, 'h:mm a');
                } catch (error) {
                  console.warn('Date formatting error in NextStepTile:', error);
                  return format(new Date(), 'h:mm a');
                }
              })()} • {duration} min
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <ChevronRight className="w-5 h-5 opacity-75" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="w-8 h-8 p-0 hover:bg-white/20 text-white rounded-full"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}