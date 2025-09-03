import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Debug: Check if all imports are functions/components
console.log("Import type checks:", {
  useState: typeof useState,
  Dialog: typeof Dialog,
  DialogContent: typeof DialogContent,
  DialogHeader: typeof DialogHeader,
  DialogTitle: typeof DialogTitle,
  Button: typeof Button,
  Textarea: typeof Textarea,
  Sparkles: typeof Sparkles,
  Send: typeof Send,
  Loader2: typeof Loader2,
  useToast: typeof useToast
});

interface AskGeminiProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: string;
}

function AskGemini({ open, onOpenChange, context }: AskGeminiProps) {
  console.log('🔍 DEBUG: AskGemini function start');
  
  console.log('🔍 DEBUG: About to call useState for question');
  const [question, setQuestion] = useState?.("") ?? "";
  console.log('🔍 DEBUG: useState question completed');
  
  console.log('🔍 DEBUG: About to call useState for response');
  const [response, setResponse] = useState?.("") ?? "";
  console.log('🔍 DEBUG: useState response completed');
  
  console.log('🔍 DEBUG: About to call useState for isLoading');
  const [isLoading, setIsLoading] = useState?.(false) ?? false;
  console.log('🔍 DEBUG: useState isLoading completed');
  
  console.log('🔍 DEBUG: About to call useToast');
  const toastHook = useToast?.() ?? {};
  console.log('🔍 DEBUG: useToast completed, result:', toastHook, typeof toastHook?.toast);
  
  console.log('🔍 DEBUG: About to destructure toast');
  const { toast } = toastHook;
  console.log('🔍 DEBUG: Toast destructured:', typeof toast);

  // Defensive checks for required functions
  const safeToast = (options: any) => {
    try {
      return toast?.(options);
    } catch (error) {
      console.error('Toast function error:', error);
    }
  };

  const safeOnOpenChange = (open: boolean) => {
    try {
      return onOpenChange?.(open);
    } catch (error) {
      console.error('onOpenChange callback error:', error);
    }
  };

  // Defensive checks for state setters using optional chaining
  const safeSetQuestion = (value: string) => {
    try {
      return setQuestion?.(value);
    } catch (error) {
      console.error('setQuestion error:', error);
    }
  };

  const safeSetResponse = (value: string) => {
    try {
      return setResponse?.(value);
    } catch (error) {
      console.error('setResponse error:', error);
    }
  };

  const safeSetIsLoading = (value: boolean) => {
    try {
      return setIsLoading?.(value);
    } catch (error) {
      console.error('setIsLoading error:', error);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      safeToast({
        title: "Please enter a question",
        description: "Ask me anything about sourdough baking!",
        variant: "destructive",
      });
      return;
    }

    safeSetIsLoading(true);
    try {
      // Simulate AI response for now
      await new Promise(resolve => setTimeout?.(resolve, 1000));
      
      // Mock response based on context
      const mockResponse = `Based on your question "${question}", here's what I can help with:

This is a demo response from the AI assistant. In a full implementation, this would connect to Google's Gemini API to provide intelligent sourdough baking advice.

${context ? `Context: ${context}` : ""}

For now, I recommend checking your starter health, monitoring fermentation temperature, and ensuring proper hydration levels for your dough.`;

      safeSetResponse(mockResponse);
      safeToast({
        title: "AI Response Ready",
        description: "I've analyzed your question and provided recommendations.",
      });
    } catch (error) {
      console.error('Ask Gemini error:', error);
      safeToast({
        title: "Unable to get response",
        description: "There was an issue connecting to the AI assistant.",
        variant: "destructive",
      });
    } finally {
      safeSetIsLoading(false);
    }
  };

  const handleClose = () => {
    safeSetQuestion("");
    safeSetResponse("");
    safeOnOpenChange(false);
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    console.log('Dialog onOpenChange called with:', isOpen, typeof isOpen);
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
              onChange={(e) => safeSetQuestion?.(e?.target?.value)}
              placeholder="Ask me about starter maintenance, fermentation timing, shaping techniques, troubleshooting issues..."
              className="min-h-[100px]"
            />
          </div>

          <Button 
            onClick={() => handleAskQuestion?.()}
            disabled={isLoading || !question?.trim?.()}
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

// Set display name for debugging
AskGemini.displayName = "AskGemini";

// Debug the export
console.log('AskGemini export debug:', {
  typeof: typeof AskGemini,
  isFunction: typeof AskGemini === 'function',
  displayName: AskGemini.displayName,
  name: AskGemini.name
});

// Default export - matches import AskGemini from "./ask-gemini"
export default AskGemini;