import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Settings, BarChart3, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import SmartTimelineHeader from "@/components/smart-timeline-header";
import SmartTimelineRecommendations from "@/components/smart-timeline-recommendations";
import SmartTimelineStep from "@/components/smart-timeline-step";
import { useSmartTimeline, type SmartTimelineStep } from "@/hooks/use-smart-timeline";
import { safeMap } from "@/lib/safeArray";
import type { Bake } from "@shared/schema";

export default function SmartTimelinePage() {
  const [showEnvironmentPanel, setShowEnvironmentPanel] = useState(false);
  
  const { data: bakes } = useQuery<Bake[]>({
    queryKey: ["/api/bakes"],
  });

  // Get the first active bake
  const activeBake = bakes?.find(bake => bake.status === 'active');

  const {
    steps,
    recommendations,
    environmentFactors,
    adjustStepDuration,
    dismissRecommendation,
    applyRecommendation,
    setSteps
  } = useSmartTimeline({
    bakeId: activeBake?.id || '',
    autoAdjust: true,
    sensitivityLevel: 'balanced'
  });

  // Initialize demo steps when we have an active bake
  useEffect(() => {
    if (activeBake && steps.length === 0) {
      initializeDemoSteps();
    }
  }, [activeBake?.id, steps.length]);

  const initializeDemoSteps = () => {
    const now = new Date();
    const demoSteps: SmartTimelineStep[] = [
      {
        id: 'autolyse',
        name: 'Autolyse',
        originalDuration: 30,
        adjustedDuration: 30,
        startTime: new Date(now.getTime()),
        endTime: new Date(now.getTime() + 30 * 60 * 1000),
        status: 'completed',
        stepType: 'autolyse',
        isEnvironmentSensitive: false
      },
      {
        id: 'bulk-ferment',
        name: 'Bulk Fermentation',
        originalDuration: 240,
        adjustedDuration: 240,
        startTime: new Date(now.getTime() + 30 * 60 * 1000),
        endTime: new Date(now.getTime() + 270 * 60 * 1000),
        status: 'active',
        stepType: 'bulk_ferment',
        isEnvironmentSensitive: true
      },
      {
        id: 'pre-shape',
        name: 'Pre-shape',
        originalDuration: 20,
        adjustedDuration: 20,
        startTime: new Date(now.getTime() + 270 * 60 * 1000),
        endTime: new Date(now.getTime() + 290 * 60 * 1000),
        status: 'pending',
        stepType: 'pre_shape',
        isEnvironmentSensitive: true
      },
      {
        id: 'bench-rest',
        name: 'Bench Rest',
        originalDuration: 30,
        adjustedDuration: 30,
        startTime: new Date(now.getTime() + 290 * 60 * 1000),
        endTime: new Date(now.getTime() + 320 * 60 * 1000),
        status: 'pending',
        stepType: 'other',
        isEnvironmentSensitive: false
      },
      {
        id: 'final-proof',
        name: 'Final Proof',
        originalDuration: 120,
        adjustedDuration: 120,
        startTime: new Date(now.getTime() + 320 * 60 * 1000),
        endTime: new Date(now.getTime() + 440 * 60 * 1000),
        status: 'pending',
        stepType: 'final_proof',
        isEnvironmentSensitive: true
      },
      {
        id: 'bake',
        name: 'Bake',
        originalDuration: 45,
        adjustedDuration: 45,
        startTime: new Date(now.getTime() + 440 * 60 * 1000),
        endTime: new Date(now.getTime() + 485 * 60 * 1000),
        status: 'pending',
        stepType: 'bake',
        isEnvironmentSensitive: false
      }
    ];

    setSteps(demoSteps);
  };

  const currentStep = useMemo(() => {
    return steps.findIndex(step => step.status === 'active') + 1;
  }, [steps]);

  const estimatedEndTime = useMemo(() => {
    const lastStep = steps[steps.length - 1];
    return lastStep?.endTime || null;
  }, [steps]);

  const handleMarkDone = (stepId: string) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        return { ...step, status: 'completed' as const };
      }
      // Activate next step
      if (step.status === 'pending') {
        const completedIndex = prev.findIndex(s => s.id === stepId);
        const currentIndex = prev.findIndex(s => s.id === step.id);
        if (currentIndex === completedIndex + 1) {
          return { ...step, status: 'active' as const };
        }
      }
      return step;
    }));
  };

  const handleSkip = (stepId: string) => {
    setSteps(prev => prev.map(step => {
      if (step.id === stepId) {
        return { ...step, status: 'completed' as const };
      }
      // Activate next step
      if (step.status === 'pending') {
        const skippedIndex = prev.findIndex(s => s.id === stepId);
        const currentIndex = prev.findIndex(s => s.id === step.id);
        if (currentIndex === skippedIndex + 1) {
          return { ...step, status: 'active' as const };
        }
      }
      return step;
    }));
  };

  const handleOpenStepSheet = (stepId: string) => {
    console.log('Opening step sheet for:', stepId);
    // TODO: Implement step detail sheet modal
  };

  if (!activeBake) {
    return (
      <div className="min-h-screen bg-sourdough-50 pb-20">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100 safe-top">
          <div className="px-4 py-3 flex items-center space-x-3">
            <Link href="/">
              <button className="p-2 hover:bg-sourdough-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-sourdough-600" />
              </button>
            </Link>
            <div>
              <h1 className="font-display font-semibold text-lg text-sourdough-800">Smart Timeline</h1>
              <p className="text-sm text-sourdough-600">AI-powered baking control tower</p>
            </div>
          </div>
        </header>

        <div className="p-4">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-sourdough-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="font-display font-semibold text-xl text-sourdough-800 mb-2">
              No Active Bake
            </h3>
            <p className="text-sourdough-600 mb-6">
              Start a bake to experience the smart timeline with live environmental adjustments and intelligent recommendations.
            </p>
            <Link href="/">
              <button className="bg-sourdough-500 hover:bg-sourdough-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Start Baking
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sourdough-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100 safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/">
              <button className="p-2 hover:bg-sourdough-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-sourdough-600" />
              </button>
            </Link>
            <div>
              <h1 className="font-display font-semibold text-lg text-sourdough-800">Smart Timeline</h1>
              <p className="text-sm text-sourdough-600">AI-powered control tower</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEnvironmentPanel(!showEnvironmentPanel)}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Smart Timeline Header */}
      <SmartTimelineHeader
        bakeName={activeBake.name}
        recipeId={activeBake.recipeId || ''}
        startTime={activeBake.startTime}
        estimatedEndTime={estimatedEndTime}
        currentStep={currentStep}
        totalSteps={steps.length}
      />

      <div className="p-4 space-y-6">
        {/* Recommendations */}
        {recommendations.length > 0 && (
          <SmartTimelineRecommendations
            recommendations={recommendations}
            onApply={applyRecommendation}
            onDismiss={dismissRecommendation}
          />
        )}

        {/* Environment Panel */}
        {showEnvironmentPanel && (
          <div className="bg-white rounded-lg border border-sourdough-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sourdough-800">Environment Status</h3>
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-sourdough-600">Temperature Factor</div>
                <div className="font-medium">{environmentFactors.temperature.toFixed(2)}x</div>
              </div>
              <div>
                <div className="text-sourdough-600">Humidity Factor</div>
                <div className="font-medium">{environmentFactors.humidity.toFixed(2)}x</div>
              </div>
              <div>
                <div className="text-sourdough-600">Combined Factor</div>
                <div className="font-medium">{environmentFactors.combined.toFixed(2)}x</div>
              </div>
              <div>
                <div className="text-sourdough-600">Status</div>
                <div className={`font-medium capitalize ${
                  environmentFactors.status === 'optimal' ? 'text-green-600' :
                  environmentFactors.status === 'suboptimal' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {environmentFactors.status}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Steps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sourdough-800">Timeline Steps</h3>
            <div className="text-sm text-sourdough-600">
              {steps.filter(s => s.status === 'completed').length} of {steps.length} complete
            </div>
          </div>

          {safeMap(steps, (step) => (
            <SmartTimelineStep
              key={step.id}
              step={step}
              onMarkDone={handleMarkDone}
              onSkip={handleSkip}
              onAdjustDuration={adjustStepDuration}
              onOpenStepSheet={handleOpenStepSheet}
              isActive={step.status === 'active'}
            />
          ))}
        </div>

        {/* Timeline Controls */}
        <div className="bg-white rounded-lg border border-sourdough-200 p-4">
          <h3 className="font-medium text-sourdough-800 mb-3">Timeline Controls</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm">
              Pause Bake
            </Button>
            <Button variant="outline" size="sm">
              Recalibrate All
            </Button>
            <Button variant="outline" size="sm">
              Save as Template
            </Button>
            <Button variant="outline" size="sm">
              View Original
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}