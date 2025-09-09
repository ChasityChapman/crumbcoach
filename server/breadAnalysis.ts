import Anthropic from '@anthropic-ai/sdk';
import { 
  DEFAULT_MODEL, 
  MODEL_CONFIG, 
  BREAD_ANALYSIS_SYSTEM_PROMPT, 
  buildBreadAnalysisPrompt 
} from './config/ai-models';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface BreadAnalysis {
  overallScore: number; // 1-10 rating
  crumb: {
    score: number; // 1-10
    feedback: string;
    structure: 'open' | 'tight' | 'uneven' | 'perfect';
    notes: string;
  };
  crust: {
    score: number; // 1-10
    feedback: string;
    color: 'pale' | 'golden' | 'dark' | 'perfect';
    thickness: 'thin' | 'medium' | 'thick';
    notes: string;
  };
  shape: {
    score: number; // 1-10
    feedback: string;
    symmetry: 'poor' | 'fair' | 'good' | 'excellent';
    notes: string;
  };
  strengths: string[];
  improvements: string[];
  tips: string[];
  confidence: number; // 0-1, AI confidence in analysis
}

interface BreadContext {
  // Environmental factors
  temperature?: number;
  humidity?: number;
  altitude?: number;
  
  // Recipe details
  recipe?: {
    name?: string;
    flourType?: string;
    hydration?: number;
    fermentationTime?: number;
    bakingTime?: number;
    bakingTemperature?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    totalTimeHours?: number;
    ingredients?: Array<{
      name?: string;
      amount?: number;
      unit?: string;
    }>;
    steps?: Array<{
      name?: string;
      duration?: number;
      description?: string;
    }>;
  };
  
  // Starter health information
  starterHealth?: {
    status?: 'healthy' | 'watch' | 'sluggish';
    stage?: 'just_fed' | 'peak' | 'collapsing' | 'sluggish';
    activityLevel?: 'low' | 'moderate' | 'high';
    riseTimeHours?: number;
    lastFeedingTime?: string;
    feedingRatio?: string;
  };
  
  // Timeline and process information
  timeline?: {
    currentStep?: string;
    completedSteps?: string[];
    totalDuration?: number;
    adjustments?: string[];
  };
  
  // Notes and observations
  bakeNotes?: string[];
  userNotes?: string;
  previousAttempts?: number;
  
  // Baking stage context
  bakingStage?: 'mixing' | 'bulk_fermentation' | 'shaping' | 'final_proof' | 'baking' | 'cooling' | 'finished';
  
  // Additional context
  notes?: string; // Keep for backward compatibility
}

export async function analyzeBreadFromImage(base64Image: string, context?: BreadContext): Promise<BreadAnalysis> {
  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MODEL_CONFIG.maxTokens,
      system: BREAD_ANALYSIS_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: buildBreadAnalysisPrompt(context)
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from AI');
    }
    
    const analysis = JSON.parse(content.text);
    
    // Validate the response structure
    if (!analysis.overallScore || !analysis.crumb || !analysis.crust || !analysis.shape) {
      throw new Error('Invalid analysis response structure');
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing bread:', error);
    throw new Error('Failed to analyze bread image');
  }
}