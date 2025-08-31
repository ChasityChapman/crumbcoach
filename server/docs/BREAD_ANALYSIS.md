# AI-Powered Bread Analysis System

This document explains the AI-powered bread analysis feature in Crumb Coach, which uses Anthropic's Claude models to provide expert feedback on sourdough bread.

## Overview

The bread analysis system analyzes uploaded bread images and provides detailed feedback on:
- **Crumb Structure**: Texture, hole distribution, density
- **Crust Development**: Color, thickness, crackling
- **Shape & Rise**: Symmetry, overall appearance
- **Overall Score**: Comprehensive 1-10 rating

## Model Selection

### Current Model: Claude Sonnet 4
- **Model ID**: `claude-sonnet-4-20250514`
- **Why**: Latest and most capable model for visual analysis
- **Capabilities**: Advanced image understanding, detailed feedback generation

### Model Evolution
1. **Claude 3 Sonnet** (`claude-3-sonnet-20240229`) - Initial implementation
2. **Claude 3.5 Sonnet** (`claude-3-5-sonnet-20241022`) - Improved analysis
3. **Claude 3.7 Sonnet** (`claude-3-7-sonnet-20250219`) - Better context understanding
4. **Claude Sonnet 4** (`claude-sonnet-4-20250514`) - **Current** - Best-in-class

### Configuration Notes
- **Max Tokens**: 1500 (sufficient for detailed analysis)
- **Temperature**: 0.7 (balanced creativity for consistent yet nuanced feedback)
- **Fallback Strategy**: If primary model fails, system can fall back to previous versions

## Context-Aware Analysis

The system considers baking context to provide more accurate feedback:

### Environmental Factors
- **Room Temperature**: Affects fermentation speed and dough development
- **Humidity**: Influences crust formation and proofing conditions

### Recipe Information
- **Dough Hydration**: Higher hydration = more open crumb expected
- **Recipe Name**: Provides context for expected characteristics

### Starter Details
- **Starter Age/Status**: Mature starters provide different flavor/rise profiles
- **Starter Hydration**: Affects final dough consistency

### Process Information
- **Proofing Time**: Longer proofing = more complex flavor, different texture
- **Additional Notes**: Any special techniques or observations

## Analysis Output Structure

```typescript
interface BreadAnalysis {
  overallScore: number;        // 1-10 comprehensive rating
  crumbStructure: {
    score: number;             // 1-10 crumb quality
    feedback: string;          // Detailed crumb analysis
  };
  crust: {
    score: number;             // 1-10 crust quality  
    feedback: string;          // Crust development feedback
  };
  shape: {
    score: number;             // 1-10 shape/rise quality
    feedback: string;          // Shape and rise analysis
  };
  suggestions: string[];       // Actionable improvement tips
  strengths: string[];         // What the baker did well
}
```

## Implementation Guidelines

### Model Updates
When updating to a newer model:
1. Update `DEFAULT_MODEL` in `config/ai-models.ts`
2. Test extensively with various bread images
3. Compare analysis quality with previous model
4. Document any prompt adjustments needed

### Prompt Engineering
The system prompt is designed to:
- Position Claude as an expert sourdough baker
- Request structured JSON output
- Consider environmental/recipe context
- Provide constructive, actionable feedback
- Balance criticism with positive reinforcement

### Error Handling
- **API Failures**: Graceful degradation with user-friendly messages
- **Invalid JSON**: Retry with simpler prompt or return generic feedback
- **Model Unavailable**: Automatic fallback to previous model version
- **Rate Limits**: Queue requests and provide estimated wait times

## Usage Examples

### Basic Analysis
```typescript
const analysis = await analyzeBreadFromImage(base64Image);
```

### Context-Rich Analysis
```typescript
const analysis = await analyzeBreadFromImage(base64Image, {
  temperature: 22,
  humidity: 65,
  recipeName: "Classic Country Sourdough",
  recipeHydration: 75,
  starterAge: "peak activity",
  starterHydration: 100,
  proofingTime: "4 hours bulk + 12 hours cold retard",
  additionalNotes: "First attempt with new starter"
});
```

## Future Enhancements

### Potential Features
- **Multi-image Analysis**: Compare crumb and crust in separate images
- **Progress Tracking**: Compare current bake to user's previous attempts
- **Recipe Suggestions**: Recommend specific recipes based on analysis
- **Video Analysis**: Analyze dough handling and shaping techniques
- **Community Learning**: Learn from highly-rated community bread images

### Model Considerations
- **Specialized Models**: Future bread-specific fine-tuned models
- **Multi-modal**: Integration with text-based recipe analysis
- **Real-time**: Faster models for instant feedback during baking process

## Best Practices

### For Developers
1. Always use the configured model constants, never hardcode model names
2. Include comprehensive error handling for API calls
3. Log analysis requests for debugging and improvement
4. Cache successful analyses to reduce API costs
5. Validate all user inputs before sending to AI model

### For Users
1. **Image Quality**: Well-lit, clear photos work best
2. **Multiple Angles**: Include both crumb and crust shots if possible
3. **Context Information**: More context = more accurate feedback
4. **Realistic Expectations**: AI feedback supplements, doesn't replace, baker intuition

## Security & Privacy

- **No Image Storage**: Images are processed and immediately discarded
- **API Key Security**: Anthropic API keys stored in secure environment variables
- **Rate Limiting**: Prevent abuse through request throttling
- **Content Filtering**: Basic validation to ensure images are bread-related

## Troubleshooting

### Common Issues
1. **"Failed to analyze bread image"**: Check API key configuration
2. **Inconsistent analysis**: Verify image quality and context data
3. **Slow responses**: Consider implementing request queuing
4. **JSON parsing errors**: Model output validation and retry logic

### Debug Steps
1. Check Anthropic API key validity
2. Verify image base64 encoding
3. Test with minimal context data
4. Review API response raw content
5. Check network connectivity and timeouts