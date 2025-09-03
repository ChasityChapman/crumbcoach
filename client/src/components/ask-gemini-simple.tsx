// Minimal Ask Gemini component to isolate the export issue
import React from "react";

interface AskGeminiProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: string;
}

function AskGemini({ open, onOpenChange, context }: AskGeminiProps) {
  // Minimal implementation without external dependencies
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full m-4">
        <h2 className="text-lg font-semibold mb-4">Ask Gemini AI</h2>
        <p className="mb-4">AI assistant is ready to help with sourdough questions.</p>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (typeof onOpenChange === 'function') {
                onOpenChange(false);
              }
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
        {context && (
          <p className="text-xs text-gray-500 mt-2">Context: {context}</p>
        )}
      </div>
    </div>
  );
}

// Set display name for debugging
AskGemini.displayName = "AskGeminiSimple";

export default AskGemini;