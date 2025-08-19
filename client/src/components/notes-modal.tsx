import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BakeNote } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  bakeId?: string;
}

export default function NotesModal({ isOpen, onClose, bakeId }: NotesModalProps) {
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const { data: notes } = useQuery<BakeNote[]>({
    queryKey: ["/api/bakes", bakeId, "notes"],
    enabled: !!bakeId,
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData: { bakeId: string; content: string; stepIndex?: number }) =>
      apiRequest("POST", "/api/notes", noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bakes", bakeId, "notes"] });
      setNewNote("");
      toast({
        title: "Note saved!",
        description: "Your bake note has been recorded.",
      });
    },
  });

  const handleSaveNote = () => {
    if (!bakeId || !newNote.trim()) {
      toast({
        title: "Cannot save note",
        description: bakeId ? "Please enter some text." : "No active bake found.",
        variant: "destructive",
      });
      return;
    }

    createNoteMutation.mutate({
      bakeId,
      content: newNote.trim(),
      stepIndex: 1, // Current step - in a real app, this would be dynamic
    });
  };

  const handleAddPhoto = () => {
    toast({
      title: "Photo capture",
      description: "Camera would open to add a photo to this note.",
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-auto max-h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="font-display text-sourdough-800">Bake Notes</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Current Note Input */}
          <div className="bg-sourdough-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-sourdough-600">Current Step</span>
              <span className="text-xs text-sourdough-500">Now</span>
            </div>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="bg-white rounded-lg border-sourdough-200 resize-none text-black"
              rows={3}
              placeholder="Add your observations..."
            />
          </div>

          {/* Previous Notes */}
          {notes && notes.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sourdough-800">Previous Notes</h4>
              {notes.map((note) => (
                <div key={note.id} className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-green-700 font-medium">
                      Step {note.stepIndex || 'Unknown'}
                    </span>
                    <span className="text-xs text-green-600">
                      {note.createdAt ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: true }) : 'Unknown time'}
                    </span>
                  </div>
                  <p className="text-sm text-sourdough-700">{note.content}</p>
                </div>
              ))}
            </div>
          )}

          {notes && notes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sourdough-500">No notes yet for this bake</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t">
          <Button
            onClick={handleSaveNote}
            disabled={!newNote.trim() || createNoteMutation.isPending}
            className="flex-1 bg-sourdough-500 hover:bg-sourdough-600 text-white"
          >
            {createNoteMutation.isPending ? "Saving..." : "Save Note"}
          </Button>
          <Button
            variant="outline"
            onClick={handleAddPhoto}
            className="px-6 border-sourdough-200 text-sourdough-600 hover:bg-sourdough-50"
          >
            <Camera className="w-4 h-4 mr-2" />
            Photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
