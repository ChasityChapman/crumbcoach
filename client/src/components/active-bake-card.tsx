import type { Bake } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ActiveBakeCardProps {
  bake: Bake;
}

export default function ActiveBakeCard({ bake }: ActiveBakeCardProps) {
  const startTime = new Date(bake.startTime || Date.now());
  const estimatedEnd = new Date(bake.estimatedEndTime || Date.now());
  const now = new Date();
  
  // Calculate progress based on start time and estimated end time
  const totalDuration = estimatedEnd.getTime() - startTime.getTime();
  const elapsed = now.getTime() - startTime.getTime();
  const progress = Math.min(Math.max(elapsed / totalDuration * 100, 0), 100);
  
  const timeRemaining = estimatedEnd.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const getCurrentStage = () => {
    const currentStep = bake.currentStep || 0;
    const stages = ["Mix", "Bulk Rise", "Shape", "Final Rise", "Bake"];
    return stages[currentStep] || "Unknown";
  };

  return (
    <div className="p-4">
      <div className="bg-gradient-to-r from-sourdough-500 to-sourdough-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-display font-semibold text-xl mb-1">{bake.name}</h2>
            <p className="text-sourdough-100 text-sm">
              Started {formatDistanceToNow(startTime, { addSuffix: true })}
            </p>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1">
            <span className="text-sm font-medium">{getCurrentStage()}</span>
          </div>
        </div>
        
        {/* Timeline Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Next Step */}
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-sourdough-100">
                {timeRemaining > 0 ? "Next Step" : "Completed"}
              </p>
              <p className="font-medium">
                {timeRemaining > 0 ? getCurrentStage() : "Bake Complete!"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-sourdough-100">
                {timeRemaining > 0 ? "In" : "Finished"}
              </p>
              <p className="font-semibold text-lg">
                {timeRemaining > 0 
                  ? `${hoursRemaining}h ${minutesRemaining}m`
                  : "Done!"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
