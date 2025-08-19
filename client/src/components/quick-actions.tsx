import { Camera, StickyNote, Clock } from "lucide-react";

interface QuickActionsProps {
  onOpenCamera: () => void;
  onOpenNotes: () => void;
  onAdjustTimeline?: () => void;
}

export default function QuickActions({ 
  onOpenCamera, 
  onOpenNotes, 
  onAdjustTimeline 
}: QuickActionsProps) {
  return (
    <div className="px-4 mb-6">
      <h3 className="font-semibold text-sourdough-800 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-3">
        <button 
          onClick={onOpenCamera}
          className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100 text-center hover:bg-sourdough-50 transition-colors"
        >
          <Camera className="w-6 h-6 text-accent-orange-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-sourdough-800">Photo</p>
        </button>
        
        <button 
          onClick={onOpenNotes}
          className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100 text-center hover:bg-sourdough-50 transition-colors"
        >
          <StickyNote className="w-6 h-6 text-sourdough-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-sourdough-800">Notes</p>
        </button>
        
        <button 
          onClick={onAdjustTimeline}
          className="bg-white rounded-xl p-4 shadow-sm border border-sourdough-100 text-center hover:bg-sourdough-50 transition-colors"
        >
          <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-sourdough-800">Timer</p>
        </button>
      </div>
    </div>
  );
}
