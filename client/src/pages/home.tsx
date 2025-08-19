import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Bake, Recipe, SensorReading } from "@shared/schema";
import ActiveBakeCard from "@/components/active-bake-card";
import SensorWidget from "@/components/sensor-widget";
import QuickActions from "@/components/quick-actions";
import TimelineView from "@/components/timeline-view";
import TutorialPreview from "@/components/tutorial-preview";
import RecentBakes from "@/components/recent-bakes";
import BottomNavigation from "@/components/bottom-navigation";
import CameraModal from "@/components/camera-modal";
import NotesModal from "@/components/notes-modal";
import StartBakeModal from "@/components/start-bake-modal";
import { useState } from "react";
import { Wheat, Bell } from "lucide-react";

export default function Home() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [startBakeOpen, setStartBakeOpen] = useState(false);

  const { data: activeBake } = useQuery<Bake | null>({
    queryKey: ["/api/bakes/active"],
  });

  const { data: latestSensor } = useQuery<SensorReading | null>({
    queryKey: ["/api/sensors/latest"],
    refetchInterval: 30000, // Refresh every 30 seconds
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
            <h1 className="font-display font-semibold text-lg text-sourdough-800">SourDough Pro</h1>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-sourdough-600">Live</span>
            <button className="p-2 text-sourdough-600">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="pb-20">
        {/* Active Bake Card */}
        {activeBake && <ActiveBakeCard bake={activeBake} />}

        {/* Sensor Data */}
        <SensorWidget reading={latestSensor} />

        {/* Quick Actions */}
        <QuickActions
          onOpenCamera={() => setCameraOpen(true)}
          onOpenNotes={() => setNotesOpen(true)}
          onStartBake={() => setStartBakeOpen(true)}
          hasActiveBake={!!activeBake}
        />

        {/* Timeline */}
        {activeBake && <TimelineView bakeId={activeBake.id} />}

        {/* Tutorial Preview */}
        <TutorialPreview />

        {/* Recent Bakes */}
        <RecentBakes />
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation currentPath="/" />

      {/* Modals */}
      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        bakeId={activeBake?.id}
      />
      <NotesModal
        isOpen={notesOpen}
        onClose={() => setNotesOpen(false)}
        bakeId={activeBake?.id}
      />
      <StartBakeModal
        isOpen={startBakeOpen}
        onClose={() => setStartBakeOpen(false)}
      />
    </div>
  );
}
