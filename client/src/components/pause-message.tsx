import { Pause, Clock } from "lucide-react";

interface PauseMessageProps {
  className?: string;
}

export default function PauseMessage({ className = "" }: PauseMessageProps) {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Pause className="w-4 h-4 text-amber-600" />
        <p className="text-sm text-amber-800">
          Timer paused. Fermentation doesn't care—set a reminder if you step away.
        </p>
      </div>
    </div>
  );
}