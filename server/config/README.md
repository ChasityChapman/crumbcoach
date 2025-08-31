# Configuration Files

This directory contains configuration files for various system components, keeping settings organized and easily maintainable.

## Files

### `ai-models.ts`
Configuration for AI model settings used in bread analysis features.

**Contents:**
- `AI_MODELS`: Available model constants (Claude Sonnet variants)
- `DEFAULT_MODEL`: Current model for bread analysis  
- `MODEL_CONFIG`: Token limits and temperature settings
- `BREAD_ANALYSIS_SYSTEM_PROMPT`: System prompt for bread evaluation
- `buildBreadAnalysisPrompt()`: Dynamic prompt builder with context

**Usage:**
```typescript
import { DEFAULT_MODEL, BREAD_ANALYSIS_SYSTEM_PROMPT } from './config/ai-models';
```

## Design Principles

1. **Centralization**: All related settings in one place
2. **Type Safety**: Full TypeScript support with const assertions
3. **Documentation**: Clear comments explaining each setting
4. **Flexibility**: Easy to modify without touching core logic
5. **Maintainability**: Version control friendly with clear diffs

## Adding New Configurations

When adding new configuration files:

1. **Create focused files**: One concern per file (e.g., `email-settings.ts`, `payment-config.ts`)
2. **Use TypeScript**: Leverage type safety and const assertions
3. **Export cleanly**: Use named exports for clarity
4. **Document thoroughly**: Include usage examples and explanations
5. **Update this README**: Keep the documentation current