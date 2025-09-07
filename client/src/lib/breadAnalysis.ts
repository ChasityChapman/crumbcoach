// AI-powered bread analysis service using Claude Sonnet 4
import { apiRequest } from "./queryClient";

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

export interface BreadContext {
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
}

export async function analyzeBreadPhoto(imageBase64: string, context?: BreadContext): Promise<BreadAnalysis> {
  try {
    const response = await fetch('/api/analyze-bread', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        image: imageBase64,
        context: context || {} 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Analysis failed: ${response.status} ${response.statusText}`);
    }

    const analysis: BreadAnalysis = await response.json();
    
    // Validate the response structure
    if (!analysis || typeof analysis.overallScore !== 'number') {
      throw new Error('Invalid response format from analysis service');
    }

    return analysis;
  } catch (error) {
    console.error('Bread analysis error:', error);
    throw error instanceof Error ? error : new Error('Failed to analyze bread photo');
  }
}

export function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix to get just the base64 data
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(new Error('File reading failed'));
  });
}

/**
 * Validates image file for bread analysis
 * @param file The image file to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please upload a JPEG, PNG, or WebP image file.'
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image file must be smaller than 10MB.'
    };
  }

  return { isValid: true };
}