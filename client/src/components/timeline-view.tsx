import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TimelineStep, BakeNote } from "@shared/schema";
import { Check, Clock, Hand, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface TimelineViewProps {
  bakeId: string;
}

export default function TimelineView({ bakeId }: TimelineViewProps) {
  const { data: steps } = useQuery<TimelineStep[]>({
    queryKey: ["/api/bakes", bakeId, "timeline"],
  });

  const { data: notes } = useQuery<BakeNote[]>({
    queryKey: ["/api/bakes", bakeId, "notes"],
  });

  const recalibrateMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bakes/${bakeId}/recalibrate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bakes"] });
    },
  });

  const getStepStatus = (step: TimelineStep) => {
    if (step.status === 'completed') return 'completed';
    if (step.status === 'active') return 'active';
    return 'pending';
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-white" />;
      case 'active':
        return <Clock className="w-4 h-4 text-white" />;
      default:
        return <Hand className="w-4 h-4 text-sourdough-500" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-accent-orange-500';
      default:
        return 'bg-sourdough-200';
    }
  };

  const getStepBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'active':
        return 'bg-accent-orange-50 border-accent-orange-200';
      default:
        return 'bg-white border-sourdough-100';
    }
  };

  const getStepNotes = (stepIndex: number) => {
    return notes?.filter(note => note.stepIndex === stepIndex) || [];
  };

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sourdough-800">Timeline</h3>
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => recalibrateMutation.mutate()}
          disabled={recalibrateMutation.isPending}
          className="text-accent-orange-500 hover:text-accent-orange-600"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${recalibrateMutation.isPending ? 'animate-spin' : ''}`} />
          Recalibrate
        </Button>
      </div>
      
      {steps && steps.length > 0 ? (
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step);
            const stepNotes = getStepNotes(step.stepIndex);
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="flex space-x-4">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 ${getStepColor(status)} rounded-full flex items-center justify-center`}>
                    {getStepIcon(status)}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 h-16 mt-2 ${
                      status === 'completed' ? 'bg-green-200' : 
                      status === 'active' ? 'bg-accent-orange-200' : 'bg-sourdough-100'
                    }`} />
                  )}
                </div>
                
                <div className="flex-1 pb-6">
                  <div className={`rounded-lg p-4 border ${getStepBgColor(status)}`}>
                    <h4 className="font-medium text-sourdough-800 mb-1">{step.name}</h4>
                    
                    {status === 'completed' && step.endTime && (
                      <p className="text-sm text-green-600 mb-2">
                        Completed {formatDistanceToNow(new Date(step.endTime), { addSuffix: true })}
                      </p>
                    )}
                    
                    {status === 'active' && (
                      <p className="text-sm text-accent-orange-600 mb-2">
                        In progress • {step.estimatedDuration} min estimated
                      </p>
                    )}
                    
                    {status === 'pending' && step.estimatedDuration && (
                      <p className="text-sm text-sourdough-500 mb-2">
                        Estimated duration: {step.estimatedDuration} minutes
                      </p>
                    )}

                    {step.description && (
                      <p className="text-sm text-sourdough-600 mb-2">{step.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      {status === 'active' && (
                        <span className="text-sm text-sourdough-600">
                          Auto-recalibrated recently
                        </span>
                      )}
                      
                      {stepNotes.length > 0 && (
                        <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          {stepNotes.length} note{stepNotes.length > 1 ? 's' : ''}
                        </div>
                      )}
                      
                      {status === 'pending' && (
                        <Button variant="ghost" size="sm" className="text-sourdough-500 hover:text-sourdough-700">
                          <Plus className="w-4 h-4 mr-1" />
                          Note
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-sourdough-300 mx-auto mb-2" />
          <p className="text-sourdough-600">No timeline steps available</p>
        </div>
      )}
    </div>
  );
}
