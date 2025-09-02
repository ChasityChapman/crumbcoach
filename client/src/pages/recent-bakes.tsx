import { useQuery } from "@tanstack/react-query";
import { safeBakeQueries, safeBakeNoteQueries, safeBakePhotoQueries, safeTimelineStepQueries, safeRecipeQueries } from "@/lib/safeQueries";
import type { Bake, BakeNote, BakePhoto, TimelineStep, Recipe } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { ArrowLeft, Clock, FileText, Camera, X, Brain, RotateCcw, Thermometer, Plus } from "lucide-react";
import crumbCoachLogo from "@assets/Coaching Business Logo Crumb Coach_1756224893332.png";
import BottomNavigation from "@/components/bottom-navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import PhotoGallery from "@/components/photo-gallery";
import StartBakeModal from "@/components/start-bake-modal";

interface BakeDetailModalProps {
  bake: Bake;
  isOpen: boolean;
  onClose: () => void;
}

function BakeDetailModal({ bake, isOpen, onClose }: BakeDetailModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const { toast } = useToast();

  const { data: notes } = useQuery<BakeNote[]>({
    queryKey: ["bake_notes", bake?.id],
    queryFn: () => safeBakeNoteQueries.getByBakeId(bake!.id),
    enabled: isOpen && !!bake?.id,
  });

  const { data: photos } = useQuery<BakePhoto[]>({
    queryKey: ["bake_photos", bake?.id],
    queryFn: () => safeBakePhotoQueries.getByBakeId(bake!.id),
    enabled: isOpen && !!bake?.id,
  });

  const { data: timelineSteps } = useQuery<TimelineStep[]>({
    queryKey: ["timeline_steps", bake?.id],
    queryFn: () => safeTimelineStepQueries.getByBakeId(bake!.id),
    enabled: isOpen && !!bake?.id,
  });

  const { data: recipe } = useQuery<Recipe | undefined>({
    queryKey: ["recipe", bake?.recipeId],
    queryFn: () => bake?.recipeId ? safeRecipeQueries.getById(bake.recipeId) : Promise.resolve(undefined),
    enabled: isOpen && !!bake?.recipeId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async ({ photoId, imageData }: { photoId: string; imageData: string }) => {
      // Photo analysis temporarily disabled during migration
      return { analysis: 'Photo analysis coming soon!' };
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze the photo. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAnalyzePhoto = async (photo: BakePhoto) => {
    if (!photo.filename) return;
    
    try {
      // Convert file to base64 for analysis
      const response = await fetch(`/api/photos/${photo.filename}`);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        analyzeMutation.mutate({ photoId: photo.id, imageData: base64Data });
      };
      reader.readAsDataURL(blob);
      setSelectedPhoto(photo.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Unable to process the photo for analysis.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen || !bake) return null;

  // Parse environmental data
  const envData = bake.environmentalData ? 
    (typeof bake.environmentalData === 'string' ? 
      JSON.parse(bake.environmentalData) : 
      bake.environmentalData) : 
    null;

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
          {/* Recipe Information */}
          {recipe && (
            <div className="p-4 border-b border-sourdough-100">
              <h3 className="font-medium text-sourdough-800 mb-3">Recipe Used</h3>
              <div className="bg-sourdough-50 rounded-lg p-3">
                <h4 className="font-medium text-sourdough-800">{recipe.name}</h4>
                {recipe.description && (
                  <p className="text-sm text-sourdough-600 mt-1">{recipe.description}</p>
                )}
                <div className="mt-2 text-sm text-sourdough-600">
                  <div className="flex justify-between">
                    <span>Difficulty:</span>
                    <span>{recipe.difficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Time:</span>
                    <span>{recipe.totalTimeHours}h</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Environmental Data */}
          {envData && (
            <div className="p-4 border-b border-sourdough-100">
              <h3 className="font-medium text-sourdough-800 mb-3">Environmental Conditions</h3>
              <div className="grid grid-cols-2 gap-4">
                {envData.temperature && (
                  <div className="bg-sourdough-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-semibold text-sourdough-800">
                      {Math.round(envData.temperature)}°F
                    </div>
                    <div className="text-sm text-sourdough-600">Temperature</div>
                  </div>
                )}
                {envData.humidity && (
                  <div className="bg-sourdough-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-semibold text-sourdough-800">
                      {Math.round(envData.humidity)}%
                    </div>
                    <div className="text-sm text-sourdough-600">Humidity</div>
                  </div>
                )}
              </div>
              {envData.notes && (
                <div className="mt-3 text-sm text-sourdough-600 bg-sourdough-50 rounded-lg p-3">
                  <strong>Environmental Notes:</strong> {envData.notes}
                </div>
              )}
            </div>
          )}

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

          {/* Photos Gallery */}
          <div className="p-4">
            <PhotoGallery bakeId={bake.id} className="" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecentBakesPage() {
  const [selectedBake, setSelectedBake] = useState<Bake | null>(null);
  const [showRestartOptions, setShowRestartOptions] = useState(false);
  const [startBakeModalOpen, setStartBakeModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bakes } = useQuery<Bake[]>({
    queryKey: ["bakes"],
    queryFn: safeBakeQueries.getAll,
  });

  // Restart bake mutation
  const restartBakeMutation = useMutation({
    mutationFn: async (bake: Bake) => {
      return safeBakeQueries.create({
        recipeId: bake.recipeId,
        name: `${bake.name} (Restart)`,
        status: "active",
        startTime: new Date(),
        currentStep: 0,
        estimatedEndTime: null,
        actualEndTime: null,
        environmentalData: null,
        timelineAdjustments: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bakes"] });
      toast({
        title: "Bake Restarted",
        description: "Your bake has been restarted successfully!",
      });
      setShowRestartOptions(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restart bake. Please try again.",
        variant: "destructive",
      });
    }
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
            <img 
              src={crumbCoachLogo} 
              alt="Crumb Coach" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Recent Bakes</h1>
          </div>
          <Button
            onClick={() => setStartBakeModalOpen(true)}
            className="bg-accent-orange-500 hover:bg-accent-orange-600 text-white flex items-center gap-2"
            data-testid="button-start-new-bake"
          >
            <Plus className="w-4 h-4" />
            Start Bake
          </Button>
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

      {/* Restart Bake Button - Bottom Left */}
      {completedBakes.length > 0 && (
        <div className="fixed bottom-20 left-4 z-40">
          {showRestartOptions ? (
            <div className="bg-white rounded-lg shadow-lg border border-sourdough-200 p-2 mb-2 max-h-60 overflow-y-auto">
              <div className="text-xs font-medium text-sourdough-700 p-2 border-b border-sourdough-100">
                Choose a bake to restart:
              </div>
              {completedBakes.slice(0, 5).map((bake) => (
                <button
                  key={bake.id}
                  onClick={() => restartBakeMutation.mutate(bake)}
                  disabled={restartBakeMutation.isPending}
                  className="w-full text-left p-2 text-sm hover:bg-sourdough-50 rounded transition-colors disabled:opacity-50"
                  data-testid={`button-restart-bake-${bake.id}`}
                >
                  <div className="font-medium text-sourdough-800">{bake.name}</div>
                  <div className="text-xs text-sourdough-500 truncate">
                    {bake.actualEndTime 
                      ? `Completed ${formatDistanceToNow(new Date(bake.actualEndTime), { addSuffix: true })}`
                      : 'Completed recently'
                    }
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          
          <Button
            onClick={() => setShowRestartOptions(!showRestartOptions)}
            className="bg-sourdough-600 hover:bg-sourdough-700 text-white rounded-full w-14 h-14 shadow-lg"
            data-testid="button-restart-options"
          >
            <RotateCcw className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation currentPath="/recent-bakes" />

      {/* Start Bake Modal */}
      <StartBakeModal
        isOpen={startBakeModalOpen}
        onClose={() => setStartBakeModalOpen(false)}
        onBakeStarted={() => {
          setStartBakeModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["bakes"] });
        }}
      />

      {/* Bake Detail Modal */}
      <BakeDetailModal
        bake={selectedBake!}
        isOpen={!!selectedBake}
        onClose={() => setSelectedBake(null)}
      />
    </div>
  );
}