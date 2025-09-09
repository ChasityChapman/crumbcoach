import { AlertTriangle, Info, CheckCircle, Clock, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SmartRecommendation } from "@/hooks/use-smart-timeline";

interface SmartTimelineRecommendationsProps {
  recommendations: SmartRecommendation[];
  onApply: (recommendationId: string) => void;
  onDismiss: (recommendationId: string) => void;
  className?: string;
}

export default function SmartTimelineRecommendations({
  recommendations,
  onApply,
  onDismiss,
  className = ""
}: SmartTimelineRecommendationsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  const getRecommendationIcon = (rec: SmartRecommendation) => {
    switch (rec.severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getRecommendationColors = (rec: SmartRecommendation) => {
    switch (rec.severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getRecommendationBadge = (rec: SmartRecommendation) => {
    switch (rec.type) {
      case 'duration_adjustment':
        return (
          <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            <span>Duration</span>
          </div>
        );
      case 'environment_warning':
        return (
          <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            <span>Environment</span>
          </div>
        );
      case 'readiness_check':
        return (
          <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            <span>Check</span>
          </div>
        );
      case 'action_required':
        return (
          <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <AlertTriangle className="w-3 h-3" />
            <span>Action</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sourdough-800 text-sm">
          Smart Recommendations ({recommendations.length})
        </h3>
        {recommendations.length > 2 && (
          <Button variant="ghost" size="sm" className="text-xs text-sourdough-600">
            View All
          </Button>
        )}
      </div>

      {recommendations.slice(0, 3).map((rec) => (
        <div
          key={rec.id}
          className={`border rounded-lg p-3 ${getRecommendationColors(rec)}`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getRecommendationIcon(rec)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-sm truncate">
                    {rec.title}
                  </h4>
                  {getRecommendationBadge(rec)}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-white/50"
                  onClick={() => onDismiss(rec.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              
              <p className="text-sm opacity-90 mb-3">
                {rec.description}
              </p>

              {rec.autoApplied && (
                <div className="flex items-center space-x-1 text-xs opacity-75 mb-2">
                  <CheckCircle className="w-3 h-3" />
                  <span>Auto-applied</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                {rec.actionLabel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 bg-white/50 hover:bg-white/75 text-xs font-medium"
                    onClick={() => onApply(rec.id)}
                  >
                    {rec.actionLabel}
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
                
                {rec.stepId && (
                  <div className="text-xs opacity-75">
                    Related to step
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {recommendations.length > 3 && (
        <div className="text-center pt-2">
          <Button variant="ghost" size="sm" className="text-xs text-sourdough-600">
            +{recommendations.length - 3} more recommendations
          </Button>
        </div>
      )}
    </div>
  );
}