interface ParsedIngredient {
  name: string;
  amount: number;
  unit: string;
  type: 'flour' | 'water' | 'other';
}

// Common flour keywords to identify flour ingredients
const FLOUR_KEYWORDS = [
  'flour', 'whole wheat', 'rye', 'spelt', 'einkorn', 'emmer', 
  'bread flour', 'all-purpose', 'ap flour', 'strong flour',
  'tipo 00', 't55', 't65', 't80', 'semolina'
];

// Common water/liquid keywords
const WATER_KEYWORDS = [
  'water', 'milk', 'buttermilk', 'cream', 'liquid', 'h2o',
  'warm water', 'cold water', 'filtered water'
];

/**
 * Parse ingredient amount string and extract numeric value
 * Handles various formats: "500g", "2 cups", "1.5kg", "375ml"
 */
function parseAmount(amountStr: string): { amount: number; unit: string } {
  if (!amountStr) return { amount: 0, unit: '' };
  
  // Remove spaces and convert to lowercase for parsing
  const cleaned = amountStr.trim().toLowerCase();
  
  // Extract number and unit using regex
  const match = cleaned.match(/^(\d*\.?\d+)\s*([a-z]*)/);
  if (!match) return { amount: 0, unit: '' };
  
  const amount = parseFloat(match[1]);
  const unit = match[2] || 'g'; // Default to grams
  
  return { amount, unit };
}

/**
 * Convert various units to grams for consistent calculation
 */
function convertToGrams(amount: number, unit: string): number {
  const conversions: Record<string, number> = {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'kilograms': 1000,
    'lb': 453.592,
    'pound': 453.592,
    'pounds': 453.592,
    'oz': 28.3495,
    'ounce': 28.3495,
    'ounces': 28.3495,
    // Volume to weight approximations for flour and water
    'ml': 1, // Assuming water density
    'milliliter': 1,
    'milliliters': 1,
    'l': 1000,
    'liter': 1000,
    'liters': 1000,
    'cup': 120, // Approximate for flour
    'cups': 120,
    'tbsp': 8,
    'tablespoon': 8,
    'tablespoons': 8,
    'tsp': 3,
    'teaspoon': 3,
    'teaspoons': 3
  };
  
  return amount * (conversions[unit] || 1);
}

/**
 * Determine ingredient type based on name
 */
function categorizeIngredient(name: string): 'flour' | 'water' | 'other' {
  const lowerName = name.toLowerCase();
  
  if (FLOUR_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'flour';
  }
  
  if (WATER_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'water';
  }
  
  return 'other';
}

/**
 * Parse ingredients and categorize them
 */
export function parseIngredients(ingredients: { name: string; amount: string }[]): ParsedIngredient[] {
  return ingredients.map(ingredient => {
    const { amount, unit } = parseAmount(ingredient.amount);
    const amountInGrams = convertToGrams(amount, unit);
    const type = categorizeIngredient(ingredient.name);
    
    return {
      name: ingredient.name,
      amount: amountInGrams,
      unit,
      type
    };
  });
}

/**
 * Calculate hydration percentage from parsed ingredients
 */
export function calculateHydration(ingredients: { name: string; amount: string }[]): {
  hydrationPercentage: number;
  totalFlour: number;
  totalWater: number;
  isValid: boolean;
} {
  const parsed = parseIngredients(ingredients);
  
  const totalFlour = parsed
    .filter(ing => ing.type === 'flour')
    .reduce((sum, ing) => sum + ing.amount, 0);
    
  const totalWater = parsed
    .filter(ing => ing.type === 'water')
    .reduce((sum, ing) => sum + ing.amount, 0);
  
  const hydrationPercentage = totalFlour > 0 ? (totalWater / totalFlour) * 100 : 0;
  const isValid = totalFlour > 0 && totalWater > 0;
  
  return {
    hydrationPercentage: Math.round(hydrationPercentage * 10) / 10, // Round to 1 decimal
    totalFlour,
    totalWater,
    isValid
  };
}

/**
 * Get hydration level category and color
 */
export function getHydrationLevel(percentage: number): {
  level: string;
  description: string;
  color: string;
  textColor: string;
} {
  if (percentage < 60) {
    return {
      level: "Very Low",
      description: "Unusually low for sourdough",
      color: "bg-red-100",
      textColor: "text-red-700"
    };
  } else if (percentage < 70) {
    return {
      level: "Low",
      description: "Dense, easier to handle",
      color: "bg-orange-100", 
      textColor: "text-orange-700"
    };
  } else if (percentage < 80) {
    return {
      level: "Normal",
      description: "Good balance",
      color: "bg-green-100",
      textColor: "text-green-700"
    };
  } else if (percentage < 90) {
    return {
      level: "High",
      description: "Open crumb, harder to handle",
      color: "bg-blue-100",
      textColor: "text-blue-700"
    };
  } else {
    return {
      level: "Very High",
      description: "Very challenging, artisan style",
      color: "bg-purple-100",
      textColor: "text-purple-700"
    };
  }
}