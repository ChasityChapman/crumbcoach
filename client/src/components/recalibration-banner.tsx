import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RecalibrationBannerProps {
  deltaMinutes: number;
  onDismiss: () => void;
}

export default function RecalibrationBanner({ deltaMinutes, onDismiss }: RecalibrationBannerProps) {
  const direction = deltaMinutes > 0 ? "+" : "";
  const absMinutes = Math.abs(deltaMinutes);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <p className="text-sm text-blue-800">
            We'll shift your next steps by {direction}{absMinutes} min.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-blue-600 hover:text-blue-700 h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}