# Route Modules

This directory contains modular route handlers organized by functional domain. Each module focuses on a specific aspect of the application.

## Structure

```
routes/
├── README.md              # This file
├── auth.ts               # Authentication & user management
├── recipes.ts            # Recipe CRUD operations
├── bakes.ts              # Bake management & timeline steps
├── timeline-plans.ts     # Multi-recipe timeline planning
├── starter-logs.ts       # Sourdough starter maintenance logs
├── tutorials.ts          # Tutorial content (public)
├── user-entitlements.ts  # Subscription & entitlement management
├── analytics.ts          # Event tracking & user sessions
└── health.ts             # Health checks & monitoring
```

## Route Modules

### `auth.ts`
- `POST /api/register` - User registration with bcrypt password hashing
- `POST /api/login` - User authentication
- `POST /api/forgot-password` - Password reset initiation
- `DELETE /api/delete-account` - Account deletion (authenticated)

### `recipes.ts`
- `GET /api/recipes` - List user's recipes
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe (with ownership verification)
- `DELETE /api/recipes/:id` - Delete recipe (with ownership verification)

### `bakes.ts`
- `GET /api/bakes` - List user's baking sessions
- `POST /api/bakes` - Start new baking session
- `PATCH /api/bakes/:id` - Update baking session
- `DELETE /api/bakes/:id` - Delete baking session
- `GET /api/timeline-steps` - Get timeline steps for a bake
- `POST /api/timeline-steps` - Create timeline step
- `PATCH /api/timeline-steps/:id` - Update timeline step
- `POST /api/notes` - Add bake notes
- `POST /api/photos` - Upload bake photos

### `timeline-plans.ts`
- `GET /api/timeline-plans` - List user's timeline plans
- `POST /api/timeline-plans` - Create multi-recipe timeline plan
- `DELETE /api/timeline-plans/:id` - Delete timeline plan

### `starter-logs.ts`
- `GET /api/starter-logs` - List starter maintenance logs
- `POST /api/starter-logs` - Log starter feeding/maintenance
- `PATCH /api/starter-logs/:id` - Update starter log entry

### `tutorials.ts`
- `GET /api/tutorials` - Get all tutorial content (public endpoint)

### `user-entitlements.ts`
- `GET /api/user-entitlements` - Get user's subscription status
- `POST /api/user-entitlements` - Update user entitlements (upsert)

### `analytics.ts`
- `POST /api/analytics/events` - Track user events
- `POST /api/analytics/sessions` - Track user sessions

### `health.ts`
- `GET /api/health` - Basic health check
- `GET /api/deployment-status` - Comprehensive deployment readiness
- `GET /api/metrics` - Performance metrics
- `GET /test` - Simple test endpoint

## Authentication

Most endpoints use the `authenticateUser` middleware from `../middleware/auth.ts`. This middleware:

1. Extracts the Bearer token from Authorization header
2. Validates the token (currently placeholder implementation)
3. Sets `req.userId` for downstream route handlers
4. Ensures proper user isolation for all operations

## Ownership Verification

Routes that access user-specific resources (recipes, bakes, logs, etc.) include ownership verification:

```typescript
// Verify ownership before allowing operations
const existingItem = await db.select().from(table)
  .where(and(eq(table.id, itemId), eq(table.userId, userId)))
  .limit(1);

if (existingItem.length === 0) {
  return res.status(404).json({ error: 'Item not found' });
}
```

## Benefits of This Structure

1. **Separation of Concerns**: Each module handles one functional domain
2. **Maintainability**: Easy to locate and modify specific functionality
3. **Testability**: Each module can be tested independently
4. **Scalability**: New routes can be added without affecting existing modules
5. **Code Navigation**: Reduced cognitive load with focused, smaller files
6. **Team Collaboration**: Multiple developers can work on different modules simultaneously

## Adding New Routes

To add a new route module:

1. Create a new file in `routes/` (e.g., `reports.ts`)
2. Export a setup function: `export function setupReportsRoutes(router: Router)`
3. Import and register in `../routes.ts`:
   ```typescript
   import { setupReportsRoutes } from "./routes/reports";
   // ...
   setupReportsRoutes(router);
   ```

This ensures consistent patterns and maintainable code organization.