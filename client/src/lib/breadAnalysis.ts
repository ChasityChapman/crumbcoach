// AI-powered bread analysis service
export interface BreadAnalysis {
  overallScore: number; // 1-10 rating
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

export async function analyzeBreadPhoto(imageBase64: string): Promise<BreadAnalysis> {
  try {
    const response = await fetch('/api/analyze-bread', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        image: imageBase64 
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze bread');
    }

    const analysis = await response.json();
    return analysis;
  } catch (error) {
    console.error('Bread analysis error:', error);
    throw error;
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
    reader.onerror = error => reject(error);
  });
}