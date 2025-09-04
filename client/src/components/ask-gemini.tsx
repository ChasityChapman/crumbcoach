import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AskGeminiProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  context?: string;
}

function AskGemini({ open, onOpenChange, context }: AskGeminiProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get toast function from useToast hook with fallback
  const toastHook = useToast();
  const toast = toastHook?.toast;

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      // Use optional chaining directly on the toast function.
      toast?.({
        title: "Please enter a question",
        description: "Ask me anything about sourdough baking!",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockResponse = `Based on your question "${question}", here's what I can help with:
This is a demo response from the AI assistant. In a full implementation, this would connect to Google's Gemini API to provide intelligent sourdough baking advice.
${context ? `Context: ${context}` : ""}
For now, I recommend checking your starter health, monitoring fermentation temperature, and ensuring proper hydration levels for your dough.`;

      setResponse(mockResponse);
      toast?.({
        title: "AI Response Ready",
        description: "I've analyzed your question and provided recommendations.",
      });
    } catch (error) {
      console.error('Ask Gemini error:', error);
      toast?.({
        title: "Unable to get response",
        description: "There was an issue connecting to the AI assistant.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setQuestion("");
    setResponse("");
    onOpenChange?.(false);
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Ask Gemini AI Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="question" className="block text-sm font-medium mb-2">
              What would you like to know about sourdough baking?
            </label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask me about starter maintenance, fermentation timing, shaping techniques, troubleshooting issues..."
              className="min-h-[100px]"
            />
          </div>

          <Button
            onClick={handleAskQuestion}
            disabled={isLoading || !question.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Ask Gemini
              </>
            )}
          </Button>

          {response && (
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <h4 className="font-medium text-blue-900 mb-2">AI Assistant Response:</h4>
              <div className="text-sm text-blue-800 whitespace-pre-wrap">
                {response}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

AskGemini.displayName = "AskGemini";
export default AskGemini;