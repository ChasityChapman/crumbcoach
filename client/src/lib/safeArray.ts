/**
 * Safe array utilities to prevent "map is not a function" errors
 */

export function safeMap<T, R>(
  array: T[] | null | undefined, 
  mapFn: (item: T, index: number, array: T[]) => R
): R[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  return array.map(mapFn);
}

export function safeFilter<T>(
  array: T[] | null | undefined, 
  filterFn: (item: T, index: number, array: T[]) => boolean
): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  return array.filter(filterFn);
}

export function safeFind<T>(
  array: T[] | null | undefined, 
  findFn: (item: T, index: number, array: T[]) => boolean
): T | undefined {
  if (!array || !Array.isArray(array)) {
    return undefined;
  }
  return array.find(findFn);
}

export function safeSlice<T>(
  array: T[] | null | undefined, 
  start?: number, 
  end?: number
): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  return array.slice(start, end);
}

export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return (value && Array.isArray(value)) ? value : [];
}