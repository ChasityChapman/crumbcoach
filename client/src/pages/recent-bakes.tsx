import { useQuery } from "@tanstack/react-query";
import type { Bake, BakeNote, BakePhoto, TimelineStep } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Wheat, ArrowLeft, Clock, FileText, Camera, X } from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";

interface BakeDetailModalProps {
  bake: Bake;
  isOpen: boolean;
  onClose: () => void;
}

function BakeDetailModal({ bake, isOpen, onClose }: BakeDetailModalProps) {
  const { data: notes } = useQuery<BakeNote[]>({
    queryKey: [`/api/bakes/${bake?.id}/notes`],
    enabled: isOpen && !!bake?.id,
  });

  const { data: photos } = useQuery<BakePhoto[]>({
    queryKey: [`/api/bakes/${bake?.id}/photos`],
    enabled: isOpen && !!bake?.id,
  });

  const { data: timelineSteps } = useQuery<TimelineStep[]>({
    queryKey: [`/api/bakes/${bake?.id}/timeline`],
    enabled: isOpen && !!bake?.id,
  });

  if (!isOpen || !bake) return null;

  const startTime = new Date(bake.startTime || Date.now());
  const endTime = bake.actualEndTime ? new Date(bake.actualEndTime) : new Date(bake.estimatedEndTime || Date.now());
  const totalDuration = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(totalDuration / (1000 * 60 * 60));
  const minutes = Math.floor((totalDuration % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-md my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sourdough-100">
          <h2 className="font-semibold text-lg text-sourdough-800">{bake.name}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-sourdough-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {/* Timing Info */}
          <div className="p-4 border-b border-sourdough-100">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-5 h-5 text-sourdough-600" />
              <h3 className="font-medium text-sourdough-800">Timing</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-sourdough-600">Started:</span>
                <span className="text-sourdough-800">{startTime.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sourdough-600">Completed:</span>
                <span className="text-sourdough-800">{endTime.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sourdough-600">Total Time:</span>
                <span className="text-sourdough-800">{hours}h {minutes}m</span>
              </div>
            </div>
          </div>

          {/* Timeline Steps */}
          {timelineSteps && timelineSteps.length > 0 && (
            <div className="p-4 border-b border-sourdough-100">
              <h3 className="font-medium text-sourdough-800 mb-3">Steps Completed</h3>
              <div className="space-y-2">
                {timelineSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step.status === 'completed' ? 'bg-green-500 text-white' : 'bg-sourdough-200 text-sourdough-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-sourdough-800">{step.name}</p>
                      {step.actualDuration && (
                        <p className="text-xs text-sourdough-500">Took {step.actualDuration} min</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="p-4 border-b border-sourdough-100">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="w-5 h-5 text-sourdough-600" />
              <h3 className="font-medium text-sourdough-800">Notes</h3>
            </div>
            {notes && notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="bg-sourdough-50 rounded-lg p-3">
                    <p className="text-sm text-sourdough-800">{note.content}</p>
                    <p className="text-xs text-sourdough-500 mt-1">
                      {note.createdAt ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: true }) : 'Recently added'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-sourdough-500">No notes added during this bake</p>
            )}
          </div>

          {/* Photos */}
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Camera className="w-5 h-5 text-sourdough-600" />
              <h3 className="font-medium text-sourdough-800">Photos</h3>
            </div>
            {photos && photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="aspect-square bg-sourdough-100 rounded-lg flex items-center justify-center">
                    <Camera className="w-6 h-6 text-sourdough-400" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-sourdough-500">No photos taken during this bake</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecentBakesPage() {
  const [selectedBake, setSelectedBake] = useState<Bake | null>(null);

  const { data: bakes } = useQuery<Bake[]>({
    queryKey: ["/api/bakes"],
  });

  const completedBakes = bakes?.filter(bake => bake.status === 'completed') || [];
  
  // Sort bakes from newest to oldest based on completion time
  const sortedBakes = completedBakes.sort((a, b) => {
    const aTime = a.actualEndTime || a.estimatedEndTime || a.startTime;
    const bTime = b.actualEndTime || b.estimatedEndTime || b.startTime;
    if (!aTime || !bTime) return 0;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <div className="min-h-screen bg-sourdough-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sourdough-500 rounded-lg flex items-center justify-center">
              <Wheat className="text-white w-4 h-4" />
            </div>
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Recent Bakes</h1>
          </div>
        </div>
      </header>

      <div className="pb-20">
        {sortedBakes.length > 0 ? (
          <div className="p-4">
            <div className="space-y-4">
              {sortedBakes.map((bake) => (
                <div key={bake.id} className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100">
                  <div className="flex items-start space-x-4">
                    {/* Placeholder image */}
                    <img 
                      src="https://images.unsplash.com/photo-1549931319-a545dcf3bc73?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120" 
                      alt={bake.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-sourdough-800 mb-1">{bake.name}</h3>
                      <p className="text-sm text-sourdough-600 mb-2">
                        Completed {bake.actualEndTime 
                          ? formatDistanceToNow(new Date(bake.actualEndTime), { addSuffix: true })
                          : 'recently'
                        }
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setSelectedBake(bake)}
                          size="sm"
                          variant="outline"
                          className="text-sourdough-600 border-sourdough-200 hover:bg-sourdough-50"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-sourdough-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">🍞</span>
            </div>
            <h2 className="font-semibold text-xl text-sourdough-800 mb-2">No Completed Bakes</h2>
            <p className="text-sourdough-600 mb-4">Start your first bake to see it here when completed</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation currentPath="/recent-bakes" />

      {/* Bake Detail Modal */}
      <BakeDetailModal
        bake={selectedBake!}
        isOpen={!!selectedBake}
        onClose={() => setSelectedBake(null)}
      />
    </div>
  );
}