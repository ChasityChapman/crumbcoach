# SourDough Pro - Smart Sourdough Baking Assistant

## Overview

SourDough Pro is a smart sourdough baking application that provides real-time environmental monitoring, automated timeline adjustments, and comprehensive baking guidance. The app uses sensor data to optimize baking schedules based on temperature and humidity conditions, while providing features for recipe management, progress tracking, photo documentation, and note-taking throughout the baking process.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui components for consistent design
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with custom design system using CSS variables
- **Mobile-First Design**: Responsive layout optimized for mobile devices with bottom navigation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **API Pattern**: RESTful API with structured route handlers in `/server/routes.ts`
- **Data Layer**: Storage abstraction pattern with interface-based design allowing for multiple storage implementations
- **Request Handling**: Express middleware for JSON parsing, URL encoding, and comprehensive request/response logging
- **Error Handling**: Centralized error handling middleware with structured error responses

### Database & Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: Configured for PostgreSQL with Neon Database serverless connection
- **Schema Design**: Comprehensive schema for recipes, bakes, timeline steps, notes, photos, tutorials, and sensor readings
- **Migrations**: Drizzle Kit for database schema management and migrations
- **Data Validation**: Zod schema validation integrated with Drizzle for type-safe data operations

### Core Features Architecture
- **Real-time Sensor Integration**: Browser-based sensor APIs with fallback simulation for temperature and humidity monitoring
- **Timeline Calculation Engine**: Smart algorithm that adjusts baking schedules based on environmental conditions
- **Photo Management**: Camera integration using MediaDevices API for progress documentation
- **Recipe Management**: CRUD operations for sourdough recipes with ingredient and step tracking
- **Bake Tracking**: Complete baking session management with status tracking and timeline steps
- **Note System**: Contextual note-taking linked to specific baking steps or general bake sessions

### Authentication & Security
- **Session Management**: Express sessions with PostgreSQL session store using connect-pg-simple
- **Environment Variables**: Secure configuration management for database connections and API keys
- **CORS & Security**: Standard Express security practices for API endpoint protection

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production database
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI & Styling Libraries
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix UI primitives

### Development & Build Tools
- **Vite**: Fast build tool and development server with HMR
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS & Autoprefixer**: CSS processing and vendor prefixing

### Data Management
- **TanStack React Query**: Server state management, caching, and synchronization
- **date-fns**: Date manipulation and formatting utilities
- **Zod**: Runtime type validation and schema definition

### Replit Integration
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development environment enhancements

### Sensor & Hardware Integration
- **MediaDevices API**: Camera access for photo capture
- **Generic Sensor API**: Environmental sensor readings (with simulation fallback)
- **Device Motion Events**: Alternative sensor data access on mobile devices