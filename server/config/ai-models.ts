/**
 * AI Model Configuration for Crumb Coach
 * 
 * This file contains model settings, prompts, and configuration for AI-powered
 * bread analysis features.
 */

// Model Selection Configuration
export const AI_MODELS = {
  // Primary model for bread analysis - latest Claude Sonnet 4
  CLAUDE_SONNET_4: "claude-sonnet-4-20250514",
  
  // Alternative models (for fallback or specific use cases)
  CLAUDE_3_7_SONNET: "claude-3-7-sonnet-20250219", 
  CLAUDE_3_5_SONNET: "claude-3-5-sonnet-20241022",
  CLAUDE_3_SONNET: "claude-3-sonnet-20240229"
} as const;

// Default model for bread analysis
export const DEFAULT_MODEL = AI_MODELS.CLAUDE_SONNET_4;

// Model configuration settings
export const MODEL_CONFIG = {
  maxTokens: 1500,
  temperature: 0.7, // Balanced creativity for analysis
} as const;

// System prompt for bread analysis
export const BREAD_ANALYSIS_SYSTEM_PROMPT = `You are an expert sourdough baker and bread evaluator with years of professional experience. Analyze the bread image and provide detailed, constructive feedback to help the baker improve their technique. Focus on crumb structure, crust development, shape, and overall appearance.

When evaluating the bread, consider the environmental conditions, recipe details, and baking context provided to give more accurate and personalized feedback. Take into account how these factors should influence the expected outcome.

Return your analysis as a JSON object with this exact structure:
{
  "overallScore": number (1-10),
  "crumb": {
    "score": number (1-10),
    "feedback": "detailed feedback about the crumb texture, holes, density",
    "structure": "open" | "tight" | "uneven" | "perfect",
    "notes": "additional technical observations"
  },
  "crust": {
    "score": number (1-10), 
    "feedback": "feedback about crust color, thickness, crackling",
    "color": "pale" | "golden" | "dark" | "perfect",
    "thickness": "thin" | "medium" | "thick",
    "notes": "additional crust observations"
  },
  "shape": {
    "score": number (1-10),
    "feedback": "feedback about bread shape, rise, symmetry",
    "symmetry": "poor" | "fair" | "good" | "excellent",
    "notes": "additional shape observations"
  },
  "strengths": ["what the baker did well"],
  "improvements": ["specific actionable improvements"],
  "tips": ["expert tips for next bake"],
  "confidence": number (0-1, your confidence in this analysis)
}`;

// User prompt template for bread analysis
export function buildBreadAnalysisPrompt(context?: {
  temperature?: number;
  humidity?: number;
  recipe?: {
    name?: string;
    flourType?: string;
    hydration?: number;
    fermentationTime?: number;
    bakingTime?: number;
    bakingTemperature?: number;
  };
  bakingStage?: string;
  notes?: string;
}): string {
  const basePrompt = `Please analyze this sourdough bread and provide detailed feedback on how to improve it. Look at the crumb structure, crust development, shape, and overall appearance.`;
  
  if (!context) {
    return basePrompt;
  }

  const contextDetails = [
    context.temperature ? `- Room Temperature: ${context.temperature}°C` : '',
    context.humidity ? `- Humidity: ${context.humidity}%` : '',
    context.recipe?.name ? `- Recipe Used: ${context.recipe.name}` : '',
    context.recipe?.flourType ? `- Flour Type: ${context.recipe.flourType}` : '',
    context.recipe?.hydration ? `- Dough Hydration: ${context.recipe.hydration}%` : '',
    context.recipe?.fermentationTime ? `- Fermentation Time: ${context.recipe.fermentationTime} hours` : '',
    context.recipe?.bakingTime ? `- Baking Time: ${context.recipe.bakingTime} minutes` : '',
    context.recipe?.bakingTemperature ? `- Baking Temperature: ${context.recipe.bakingTemperature}°C` : '',
    context.bakingStage ? `- Baking Stage: ${context.bakingStage}` : '',
    context.notes ? `- Additional Notes: ${context.notes}` : ''
  ].filter(Boolean);

  if (contextDetails.length === 0) {
    return basePrompt;
  }

  return `${basePrompt}

BAKING CONTEXT:
${contextDetails.join('\n')}

Please consider how these conditions may have affected the bread's development and adjust your analysis accordingly. For example:
- Lower temperatures typically require longer fermentation times
- High humidity can affect crust formation  
- Higher hydration doughs create more open crumb structures
- Starter maturity affects flavor development and rise
- Proofing time affects texture and flavor development`;
}