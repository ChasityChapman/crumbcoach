// Starter Tab Domain Models
export type Flour = {
  id: string;
  name: string; // Bread, AP, Whole Rye, Whole Wheat, etc.
  createdAt: string;
  updatedAt: string;
};

export type Starter = {
  id: string;
  name: string;
  avatar?: string; // emoji or URI
  unitMass: 'g' | 'oz';
  unitTemp: 'C' | 'F';
  defaults: StarterDefaults;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StarterDefaults = {
  flourMix: { flourId: string; pct: number }[]; // sums to 100
  ratio: { s: number; f: number; w: number };
  totalGrams: number;
  hydrationTargetPct?: number; // optional override
  reminderHours?: number; // e.g., 24
  quietHours?: { start: string; end: string }; // 22:00–07:00
};

export type StarterEntry = {
  id: string;
  starterId: string;
  timestamp: string; // ISO
  flourMix: { flourId: string; pct: number }[];
  ratio: { s: number; f: number; w: number };
  totalGrams: number;
  hydrationPct: number;
  riseTimeHrs?: number;
  ambientTemp?: number; // in C
  discardUse?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthSnapshot = {
  starterId: string;
  status: 'healthy' | 'watch' | 'sluggish';
  computedAt: string;
  reason: string;
};

export type InsertStarter = Omit<Starter, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertFlour = Omit<Flour, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertStarterEntry = Omit<StarterEntry, 'id' | 'createdAt' | 'updatedAt'>;

// Utility types for forms
export type StarterEntryForm = {
  timestamp: Date;
  flourMix: { flourId: string; pct: number }[];
  ratio: { s: number; f: number; w: number };
  totalGrams: number;
  riseTimeHrs?: number;
  ambientTemp?: number;
  discardUse?: string;
  notes?: string;
};

// Health status helpers
export const getHealthStatusColor = (status: HealthSnapshot['status']) => {
  switch (status) {
    case 'healthy': return 'text-green-600 bg-green-100';
    case 'watch': return 'text-amber-600 bg-amber-100';
    case 'sluggish': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export const getHealthStatusEmoji = (status: HealthSnapshot['status']) => {
  switch (status) {
    case 'healthy': return '🟢';
    case 'watch': return '🟡';
    case 'sluggish': return '🔴';
    default: return '⚪';
  }
};

// Hydration calculation utilities
export const calculateHydration = (flourGrams: number, waterGrams: number): number => {
  if (flourGrams <= 0) return 0;
  return Math.round((waterGrams / flourGrams) * 100);
};

export const calculateGramsFromRatio = (
  ratio: { s: number; f: number; w: number },
  totalGrams: number
) => {
  const totalParts = ratio.s + ratio.f + ratio.w;
  const perPart = totalGrams / totalParts;
  
  return {
    starter: Math.round(ratio.s * perPart),
    flour: Math.round(ratio.f * perPart),
    water: Math.round(ratio.w * perPart)
  };
};

export const parseRatioString = (ratioStr: string): { s: number; f: number; w: number } | null => {
  const cleaned = ratioStr.replace(/[^\d:.-]/g, '');
  const parts = cleaned.split(/[:-]/).map(p => parseFloat(p.trim()));
  
  if (parts.length === 3 && parts.every(p => !isNaN(p) && p >= 0)) {
    return { s: parts[0], f: parts[1], w: parts[2] };
  }
  return null;
};

// Default flour types
export const DEFAULT_FLOURS: Omit<Flour, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Bread Flour' },
  { name: 'All-Purpose Flour' },
  { name: 'Whole Wheat Flour' },
  { name: 'Whole Rye Flour' },
  { name: 'Spelt Flour' },
  { name: 'Einkorn Flour' },
];

// Default discard usage options
export const DISCARD_OPTIONS = [
  'Pancakes',
  'Waffles', 
  'Crackers',
  'Pizza Dough',
  'Flatbread',
  'Compost',
  'Discarded',
  'Other'
];