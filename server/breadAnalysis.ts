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
  overallScore: number;
  crumbStructure: {
    score: number;
    feedback: string;
  };
  crust: {
    score: number;
    feedback: string;
  };
  shape: {
    score: number;
    feedback: string;
  };
  suggestions: string[];
  strengths: string[];
}

interface BreadContext {
  temperature?: number;
  humidity?: number;
  recipeName?: string;
  recipeHydration?: number;
  starterAge?: string;
  starterHydration?: number;
  proofingTime?: string;
  additionalNotes?: string;
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
    if (!analysis.overallScore || !analysis.crumbStructure || !analysis.crust || !analysis.shape) {
      throw new Error('Invalid analysis response structure');
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing bread:', error);
    throw new Error('Failed to analyze bread image');
  }
}