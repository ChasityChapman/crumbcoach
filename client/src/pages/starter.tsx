import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Starter, HealthSnapshot } from "@shared/schema";
import { safeStarterLogQueries } from "@/lib/safeQueries";
import { safeMap } from "@/lib/safeArray";
import { getHealthStatusColor, getHealthStatusEmoji } from "@shared/src/lib/starterTypes";
import BottomNavigation from "@/components/bottom-navigation";
import StarterNewEntryForm from "@/components/starter-new-entry-form";
import StarterHistory from "@/components/starter-history";
import StarterProfileModal from "@/components/starter-profile-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Clock, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export default function Starter() {
  const { user } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState("new-entry");
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Get user's primary starter (first non-archived)
  // Mock starter data for now
  const starters = [{
    id: 'demo-starter-1',
    name: 'My Sourdough Starter',
    archived: false,
    unitMass: 'g',
    unitTemp: 'C'
  }];
  const startersLoading = false;

  const primaryStarter = useMemo(() => {
    if (!starters?.length) return null;
    return starters.find(s => !s.archived) || starters[0];
  }, [starters]);

  // Mock latest entry data
  const latestEntry = null;

  // Mock health status data
  const healthStatus = { status: 'healthy', reason: 'All good!' };

  if (startersLoading) {
    return (
      <div className="min-h-screen bg-muted/30 safe-x">
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-border safe-top">
          <div className="px-4 safe-top pb-3 min-h-[60px] flex items-center">
            <h1 className="font-display font-semibold text-lg text-foreground">Starter Health</h1>
          </div>
        </header>
        <div className="p-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-border animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
        <BottomNavigation currentPath="/starter" />
      </div>
    );
  }

  if (!primaryStarter) {
    return (
      <div className="min-h-screen bg-muted/30 safe-x">
        <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-border safe-top">
          <div className="px-4 safe-top pb-3 min-h-[60px] flex items-center">
            <h1 className="font-display font-semibold text-lg text-foreground">Starter Health</h1>
          </div>
        </header>
        
        <div className="p-4 pb-20">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🧬</span>
            </div>
            <h3 className="font-display font-semibold text-lg text-foreground mb-2">
              No Starter Yet
            </h3>
            <p className="text-muted-foreground mb-6">Create your first sourdough starter to begin tracking its health and feeding schedule.</p>
            <Button 
              onClick={() => setShowProfileModal(true)}
              className="bg-muted/300  text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Starter
            </Button>
          </div>
        </div>

        <BottomNavigation currentPath="/starter" />
        
        <StarterProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          starter={null}
        />
      </div>
    );
  }

  const timeSinceLastFeed = latestEntry 
    ? formatDistanceToNow(new Date(latestEntry.timestamp), { addSuffix: true })
    : null;

  return (
    <div className="min-h-screen bg-muted/30 safe-x">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-border safe-top">
        <div className="px-4 safe-top pb-3 min-h-[60px] flex flex-col">
          <h1 className="font-display font-semibold text-lg text-foreground mb-2">Starter Health</h1>
          
          {/* Starter Card */}
          <Card 
            className="cursor-pointer border-border bg-card"
            onClick={() => setShowProfileModal(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted/300 rounded-full flex items-center justify-center text-white font-medium">
                    {primaryStarter.avatar || primaryStarter.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{primaryStarter.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      {timeSinceLastFeed && (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Fed {timeSinceLastFeed}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {healthStatus && (
                    <Badge className={`text-xs ${getHealthStatusColor(healthStatus.status)}`}>
                      {getHealthStatusEmoji(healthStatus.status)} {healthStatus.status}
                    </Badge>
                  )}
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              
              {/* Next Feed ETA */}
              {primaryStarter.defaults?.reminderHours && latestEntry && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Next feed ETA in {Math.max(0, primaryStarter.defaults.reminderHours - 
                      Math.round((Date.now() - new Date(latestEntry.timestamp).getTime()) / (1000 * 60 * 60)))}h
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="new-entry" className="text-sm">New Entry</TabsTrigger>
            <TabsTrigger value="history" className="text-sm">History & Trends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="new-entry" className="space-y-4">
            <StarterNewEntryForm starter={primaryStarter} />
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <StarterHistory starter={primaryStarter} />
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation currentPath="/starter" />
      
      <StarterProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        starter={primaryStarter}
      />
    </div>
  );
}