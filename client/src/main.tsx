import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler for Date parsing issues in mobile app
const originalDate = Date;
const CustomDate = function(this: any, value?: any) {
  if (arguments.length === 0) return new originalDate();
  
  try {
    const date = new originalDate(value);
    if (isNaN(date.getTime()) && value !== undefined && value !== null) {
      console.warn('🐛 Invalid Date value detected:', value, typeof value);
      return new originalDate(); // Return current date as fallback
    }
    return date;
  } catch (error) {
    console.error('🚨 Date constructor error:', error, 'with value:', value);
    return new originalDate(); // Return current date as fallback
  }
} as any;

// Preserve all static methods from original Date
Object.setPrototypeOf(CustomDate, originalDate);
Object.getOwnPropertyNames(originalDate).forEach(name => {
  if (name !== 'length' && name !== 'name' && name !== 'prototype') {
    (CustomDate as any)[name] = (originalDate as any)[name];
  }
});

(globalThis as any).Date = CustomDate;

createRoot(document.getElementById("root")!).render(<App />);
