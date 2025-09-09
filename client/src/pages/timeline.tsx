import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TimelineView from "@/components/timeline-view";
import { Bake } from "@shared/schema";
import { ArrowLeft, Clock, CheckCircle, Calendar } from "lucide-react";
import { Link } from "wouter";
import { safeParseDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TimelinePage() {
  const [activeTab, setActiveTab] = useState("current");
  
  const { data: bakes } = useQuery<Bake[]>({
    queryKey: ["/api/bakes"],
  });

  // Get the first active bake
  const activeBake = bakes?.find(bake => bake.status === 'active');
  
  // Get recent completed bakes for history
  const recentBakes = bakes?.filter(bake => bake.status === 'completed')
    .sort((a, b) => {
      const aTime = safeParseDate(a.actualEndTime || a.estimatedEndTime || a.startTime) || new Date(0);
      const bTime = safeParseDate(b.actualEndTime || b.estimatedEndTime || b.startTime) || new Date(0);
      return bTime.getTime() - aTime.getTime();
    })
    .slice(0, 10) || [];

  return (
    <div className="min-h-screen bg-sourdough-50 pb-20 safe-x">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-sourdough-100 safe-top">
        <div className="px-4 py-3 flex items-center space-x-3">
          <Link href="/">
            <button className="p-2 hover:bg-sourdough-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-sourdough-600" />
            </button>
          </Link>
          <div>
            <h1 className="font-display font-semibold text-lg text-sourdough-800">Timeline</h1>
            <p className="text-sm text-sourdough-600">Manage your baking schedule</p>
          </div>
        </div>
      </header>

      <div className="p-4">
        {activeBake ? (
          <div>
            {/* Active Bake Info */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-sourdough-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-xl text-sourdough-800 mb-1">
                    {activeBake.name}
                  </h2>
                  <p className="text-sourdough-600 text-sm">
                    Started {(() => {
                      const startDate = safeParseDate(activeBake.startTime);
                      return startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleDateString() : 'Unknown date';
                    })()} at{' '}
                    {(() => {
                      const startDate = safeParseDate(activeBake.startTime);
                      return startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Unknown time';
                    })()}
                  </p>
                </div>
                <div className="bg-sourdough-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                  Active
                </div>
              </div>
            </div>

            {/* Timeline View Component */}
            <TimelineView 
              items={[]} 
              now={new Date()} 
              onMarkDone={(stepId) => console.log('Mark done:', stepId)}
              onSkip={(stepId) => console.log('Skip:', stepId)}
              onOpenRecalibrate={(stepId) => console.log('Recalibrate:', stepId)}
              onOpenStepSheet={(stepId) => console.log('Open step sheet:', stepId)}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-sourdough-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">⏱️</span>
            </div>
            <h3 className="font-display font-semibold text-xl text-sourdough-800 mb-2">
              No Active Bake
            </h3>
            <p className="text-sourdough-600 mb-6">
              Start a new bake to see your timeline and manage your baking schedule
            </p>
            <Link href="/">
              <button className="bg-sourdough-500 hover:bg-sourdough-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Start Baking
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}