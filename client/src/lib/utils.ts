import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse a date value, returning null if invalid
 * This prevents "Invalid time value" RangeError crashes
 */
export function safeParseDate(value: any): Date | null {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', value);
      return null;
    }
    return date;
  } catch (error) {
    console.warn('Date parsing error:', error, 'for value:', value);
    return null;
  }
}
