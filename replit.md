# Crumb Coach - Mobile Sourdough Baking Assistant

## Overview

Crumb Coach is a comprehensive mobile-first sourdough baking application built with Capacitor for native iOS and Android deployment. The app provides real-time environmental monitoring, automated timeline adjustments, subscription-based feature access, and comprehensive baking guidance. Features include sensor data optimization for baking schedules, recipe management, progress tracking, photo documentation, push notifications for reminders, and tiered subscription access (Free vs Hobby Pro).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Mobile App Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **Mobile Platform**: Capacitor for native iOS and Android deployment with app store distribution
- **App Configuration**: Configured for com.crumbcoach.app with native splash screen, status bar, and camera permissions
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui components optimized for mobile interfaces
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with custom sourdough color palette and mobile-first responsive design

### Backend Services
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) policies for user data isolation
- **Authentication**: Supabase Auth for email/password authentication with user metadata support
- **API Layer**: Supabase client-side integration replacing Express.js server architecture
- **Real-time Features**: Supabase real-time subscriptions for live data updates

### Subscription & Monetization
- **In-App Purchases**: RevenueCat for subscription management through Apple App Store and Google Play Store
- **Subscription Tiers**: Free (limited features) and Hobby Pro (unlimited access) with feature gating
- **Payment Processing**: Native platform payment systems (Apple Pay, Google Pay) managed by RevenueCat

### Core Features Architecture
- **Real-time Sensor Integration**: Browser-based sensor APIs with fallback simulation for temperature and humidity monitoring
- **Timeline Calculation Engine**: Smart algorithm that adjusts baking schedules based on environmental conditions
- **Photo Management**: Camera integration using MediaDevices API for progress documentation
- **Recipe Management**: CRUD operations for sourdough recipes with ingredient and step tracking
- **Bake Tracking**: Complete baking session management with status tracking and timeline steps
- **Note System**: Contextual note-taking linked to specific baking steps or general bake sessions

### Mobile Services & Security
- **Push Notifications**: Capacitor Push Notifications for timeline reminders and baking alerts
- **Error Tracking**: Sentry integration for crash reporting and performance monitoring
- **Authentication**: Supabase Auth with secure JWT tokens and user session management
- **Data Security**: Row Level Security (RLS) policies ensuring users only access their own data
- **Environment Variables**: Secure configuration for API keys including Supabase, RevenueCat, and Sentry credentials

## External Dependencies

### Mobile Platform Services
- **Supabase**: Backend-as-a-Service providing PostgreSQL database, authentication, and real-time features
- **RevenueCat**: In-app purchase and subscription management platform
- **Sentry**: Error tracking and performance monitoring for mobile applications
- **Capacitor**: Native mobile app framework for iOS and Android deployment

### UI & Styling Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix UI primitives

### Mobile Development & Build Tools
- **Capacitor CLI**: Native mobile app building and deployment tools
- **Vite**: Fast build tool and development server optimized for mobile web views
- **TypeScript**: Type safety across client-side application and service integrations
- **ESBuild**: Fast JavaScript bundler for mobile app production builds
- **PostCSS & Autoprefixer**: CSS processing for cross-platform mobile compatibility

### Data Management
- **TanStack React Query**: Server state management, caching, and synchronization
- **date-fns**: Date manipulation and formatting utilities
- **Zod**: Runtime type validation and schema definition

### Replit Integration
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development environment enhancements

### Mobile Device Integration
- **Capacitor Camera**: Native camera access for photo capture and gallery storage
- **Capacitor Device**: Device information and platform detection
- **Capacitor Push Notifications**: Native push notification system for timeline reminders
- **Capacitor Status Bar**: Native status bar styling and configuration
- **MediaDevices API**: Environmental sensor readings with mobile device fallback
- **Native Storage**: Device storage for user preferences and offline capability