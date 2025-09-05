import { format } from "date-fns";
import { Clock, ChevronRight } from "lucide-react";

interface NextStepTileProps {
  stepName: string;
  startTime: Date;
  duration: number;
  onClick: () => void;
}

export default function NextStepTile({ stepName, startTime, duration, onClick }: NextStepTileProps) {
  return (
    <div 
      className="fixed bottom-4 left-4 right-4 bg-primary text-primary-foreground rounded-lg p-3 shadow-lg cursor-pointer z-40 transition-all hover:shadow-xl"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              Next: {stepName}
            </p>
            <p className="text-xs opacity-90">
              {format(startTime, 'h:mm a')} • {duration} min
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 opacity-75" />
      </div>
    </div>
  );
}