/**
 * Color constants for server-side use, mirroring the client-side palette
 * Ensures consistent branding across all email templates and server communications
 */

export const colors = {
  // Primary brand colors - matches CSS --primary: hsl(44 92% 57%)
  primary: '#f7c12d',
  primaryForeground: '#ffffff',
  
  // Secondary colors
  secondary: '#f7c12d', // Same as primary for current design
  secondaryForeground: '#ffffff',
  
  // Neutral colors for text and backgrounds
  foreground: '#2e2e2e',      // Dark text
  background: '#ffffff',       // White background
  muted: '#f5f5f5',           // Light gray backgrounds
  mutedForeground: '#666666',  // Gray text
  border: '#e5e5e5',          // Border colors
  
  // Status colors
  destructive: '#dc2626',      // Red for errors/destructive actions
  success: '#16a34a',          // Green for success states
  warning: '#d97706',          // Orange for warnings
  info: '#0ea5e9',            // Blue for informational messages
  
  // Email-specific colors
  email: {
    // Card/container backgrounds
    cardBackground: '#f9f9f9',
    lightBackground: '#fafafa',
    
    // Alert/notice backgrounds  
    warningBackground: '#fff3cd',
    warningBorder: '#ffeaa7',
    successBackground: '#d4edda',
    successBorder: '#c3e6cb',
    
    // Text colors
    title: '#f7c12d',          // Primary brand color for titles
    subtitle: '#666666',       // Gray for subtitles  
    body: '#333333',           // Dark gray for body text
    footer: '#666666',         // Gray for footer text
    
    // Legacy color (to be phased out)
    oldBrown: '#8B4513',       // Old hardcoded brown - replace with primary
  }
} as const;

export default colors;