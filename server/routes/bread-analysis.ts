import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { analyzeBreadFromImage, type BreadAnalysis } from '../breadAnalysis';

// Rate limiting for AI analysis endpoint (expensive API calls)
const analysisRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many analysis requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request validation schema
const BreadAnalysisRequestSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  context: z.object({
    // Environmental factors
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    altitude: z.number().optional(),
    
    // Recipe details
    recipe: z.object({
      name: z.string().optional(),
      flourType: z.string().optional(),
      hydration: z.number().optional(),
      fermentationTime: z.number().optional(),
      bakingTime: z.number().optional(),
      bakingTemperature: z.number().optional(),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
      totalTimeHours: z.number().optional(),
      ingredients: z.array(z.object({
        name: z.string().optional(),
        amount: z.number().optional(),
        unit: z.string().optional()
      })).optional(),
      steps: z.array(z.object({
        name: z.string().optional(),
        duration: z.number().optional(),
        description: z.string().optional()
      })).optional()
    }).optional(),
    
    // Starter health information
    starterHealth: z.object({
      status: z.enum(['healthy', 'watch', 'sluggish']).optional(),
      stage: z.enum(['just_fed', 'peak', 'collapsing', 'sluggish']).optional(),
      activityLevel: z.enum(['low', 'moderate', 'high']).optional(),
      riseTimeHours: z.number().optional(),
      lastFeedingTime: z.string().optional(),
      feedingRatio: z.string().optional()
    }).optional(),
    
    // Timeline and process information
    timeline: z.object({
      currentStep: z.string().optional(),
      completedSteps: z.array(z.string()).optional(),
      totalDuration: z.number().optional(),
      adjustments: z.array(z.string()).optional()
    }).optional(),
    
    // Notes and observations
    bakeNotes: z.array(z.string()).optional(),
    userNotes: z.string().optional(),
    previousAttempts: z.number().optional(),
    
    // Baking stage context
    bakingStage: z.enum(['mixing', 'bulk_fermentation', 'shaping', 'final_proof', 'baking', 'cooling', 'finished']).optional(),
    
    // Additional context (backward compatibility)
    notes: z.string().optional()
  }).optional()
});

type BreadAnalysisRequest = z.infer<typeof BreadAnalysisRequestSchema>;

export function setupBreadAnalysisRoutes(router: Router): void {
  /**
   * POST /api/analyze-bread
   * Analyzes a bread photo using AI (Claude Sonnet 4)
   */
  router.post('/api/analyze-bread', analysisRateLimit, async (req, res) => {
    try {
      // Validate request body
      const validationResult = BreadAnalysisRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }

      const { image, context }: BreadAnalysisRequest = validationResult.data;

      // Validate base64 image format
      if (!image.match(/^[A-Za-z0-9+/]+=*$/)) {
        return res.status(400).json({
          error: 'Invalid image format. Please provide a valid base64 encoded image.'
        });
      }

      // Check if Anthropic API key is configured
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY not configured');
        return res.status(500).json({
          error: 'AI analysis service is not configured. Please try again later.'
        });
      }

      console.log('Starting bread analysis with context:', context ? 'provided' : 'none');
      
      // Perform the AI analysis
      const analysis: BreadAnalysis = await analyzeBreadFromImage(image, context);
      
      console.log('Bread analysis completed successfully');
      
      // Return the analysis result
      return res.json(analysis);

    } catch (error) {
      console.error('Bread analysis error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return res.status(500).json({
            error: 'AI service authentication failed. Please try again later.'
          });
        }
        
        if (error.message.includes('rate limit') || error.message.includes('quota')) {
          return res.status(429).json({
            error: 'AI service is currently busy. Please try again in a few minutes.'
          });
        }
        
        if (error.message.includes('Invalid') || error.message.includes('parse')) {
          return res.status(400).json({
            error: 'Unable to analyze the provided image. Please ensure it shows bread clearly.'
          });
        }
      }
      
      // Generic error response
      return res.status(500).json({
        error: 'Failed to analyze bread image. Please try again later.'
      });
    }
  });

  /**
   * GET /api/analyze-bread/status
   * Check if the bread analysis service is available
   */
  router.get('/api/analyze-bread/status', (req, res) => {
    const isConfigured = !!process.env.ANTHROPIC_API_KEY;
    
    res.json({
      available: isConfigured,
      model: isConfigured ? 'claude-sonnet-4-20250514' : null,
      message: isConfigured 
        ? 'Bread analysis service is available'
        : 'Bread analysis service is not configured'
    });
  });
}