import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - now supports email/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Insert schema for user registration
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  totalTimeHours: integer("total_time_hours").notNull(),
  difficulty: text("difficulty").notNull(), // 'beginner', 'intermediate', 'advanced'
  ingredients: jsonb("ingredients").notNull(), // Array of {name: string, amount: string}
  steps: jsonb("steps").notNull(), // Array of {id: string, name: string, duration: number, description: string}
  createdAt: timestamp("created_at").defaultNow(),
});

export const bakes = pgTable("bakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  recipeId: varchar("recipe_id").notNull().references(() => recipes.id),
  name: text("name").notNull(),
  status: text("status").notNull(), // 'active', 'completed', 'paused'
  currentStep: integer("current_step").default(0),
  startTime: timestamp("start_time").defaultNow(),
  estimatedEndTime: timestamp("estimated_end_time"),
  actualEndTime: timestamp("actual_end_time"),
  environmentalData: jsonb("environmental_data"), // {temperature: number, humidity: number}
  timelineAdjustments: jsonb("timeline_adjustments"), // Array of adjustments made
  createdAt: timestamp("created_at").defaultNow(),
});

export const timelineSteps = pgTable("timeline_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bakeId: varchar("bake_id").notNull().references(() => bakes.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  estimatedDuration: integer("estimated_duration_minutes").notNull(),
  actualDuration: integer("actual_duration_minutes"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: text("status").notNull(), // 'pending', 'active', 'completed'
  autoAdjustments: jsonb("auto_adjustments"), // Tracking recalibrations
});

export const bakeNotes = pgTable("bake_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bakeId: varchar("bake_id").notNull().references(() => bakes.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bakePhotos = pgTable("bake_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bakeId: varchar("bake_id").notNull().references(() => bakes.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index"),
  filename: text("filename").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tutorials = pgTable("tutorials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  difficulty: text("difficulty").notNull(),
  steps: jsonb("steps").notNull(), // Array of tutorial steps with images/videos
  duration: integer("duration_minutes"),
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sensorReadings = pgTable("sensor_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bakeId: varchar("bake_id").references(() => bakes.id, { onDelete: "cascade" }),
  temperature: integer("temperature"), // Celsius * 10 for precision
  humidity: integer("humidity"), // Percentage
  timestamp: timestamp("timestamp").defaultNow(),
});

// Multi-recipe timeline plans
export const timelinePlans = pgTable("timeline_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetEndTime: timestamp("target_end_time").notNull(),
  recipeIds: jsonb("recipe_ids").notNull(), // Array of recipe IDs
  calculatedSchedule: jsonb("calculated_schedule"), // Timeline calculation results
  status: text("status").default("planned").notNull(), // 'planned', 'active', 'completed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  recipes: many(recipes),
  bakes: many(bakes),
  passwordResetTokens: many(passwordResetTokens),
  timelinePlans: many(timelinePlans),
}));

export const passwordResetTokenRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const recipeRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, {
    fields: [recipes.userId],
    references: [users.id],
  }),
  bakes: many(bakes),
}));

export const bakeRelations = relations(bakes, ({ one, many }) => ({
  user: one(users, {
    fields: [bakes.userId],
    references: [users.id],
  }),
  recipe: one(recipes, {
    fields: [bakes.recipeId],
    references: [recipes.id],
  }),
  timelineSteps: many(timelineSteps),
  notes: many(bakeNotes),
  photos: many(bakePhotos),
}));

export const timelineStepRelations = relations(timelineSteps, ({ one }) => ({
  bake: one(bakes, {
    fields: [timelineSteps.bakeId],
    references: [bakes.id],
  }),
}));

export const bakeNoteRelations = relations(bakeNotes, ({ one }) => ({
  bake: one(bakes, {
    fields: [bakeNotes.bakeId],
    references: [bakes.id],
  }),
}));

export const bakePhotoRelations = relations(bakePhotos, ({ one }) => ({
  bake: one(bakes, {
    fields: [bakePhotos.bakeId],
    references: [bakes.id],
  }),
}));

export const timelinePlanRelations = relations(timelinePlans, ({ one }) => ({
  user: one(users, {
    fields: [timelinePlans.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true });
export const insertBakeSchema = createInsertSchema(bakes)
  .omit({ id: true, createdAt: true })
  .extend({
    startTime: z.union([z.date(), z.string().datetime().transform((str) => new Date(str))]).optional(),
    estimatedEndTime: z.union([z.date(), z.string().datetime().transform((str) => new Date(str))]).optional(),
    actualEndTime: z.union([z.date(), z.string().datetime().transform((str) => new Date(str))]).optional().nullable(),
  });
export const insertTimelineStepSchema = createInsertSchema(timelineSteps)
  .omit({ id: true })
  .extend({
    startTime: z.union([z.date(), z.string().datetime().transform((str) => new Date(str))]).optional().nullable(),
    endTime: z.union([z.date(), z.string().datetime().transform((str) => new Date(str))]).optional().nullable(),
  });
export const insertBakeNoteSchema = createInsertSchema(bakeNotes).omit({ id: true, createdAt: true });
export const insertBakePhotoSchema = createInsertSchema(bakePhotos).omit({ id: true, createdAt: true });
export const insertTutorialSchema = createInsertSchema(tutorials).omit({ id: true, createdAt: true });
export const insertSensorReadingSchema = createInsertSchema(sensorReadings).omit({ id: true, timestamp: true });
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export const insertTimelinePlanSchema = createInsertSchema(timelinePlans).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Bake = typeof bakes.$inferSelect;
export type InsertBake = z.infer<typeof insertBakeSchema>;
export type TimelineStep = typeof timelineSteps.$inferSelect;
export type InsertTimelineStep = z.infer<typeof insertTimelineStepSchema>;
export type BakeNote = typeof bakeNotes.$inferSelect;
export type InsertBakeNote = z.infer<typeof insertBakeNoteSchema>;
export type BakePhoto = typeof bakePhotos.$inferSelect;
export type InsertBakePhoto = z.infer<typeof insertBakePhotoSchema>;
export type Tutorial = typeof tutorials.$inferSelect;
export type InsertTutorial = z.infer<typeof insertTutorialSchema>;
export type SensorReading = typeof sensorReadings.$inferSelect;
export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type TimelinePlan = typeof timelinePlans.$inferSelect;
export type InsertTimelinePlan = z.infer<typeof insertTimelinePlanSchema>;
