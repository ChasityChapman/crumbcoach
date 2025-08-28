-- Crumb Coach Database Setup for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User entitlements for subscription management
CREATE TABLE IF NOT EXISTS user_entitlements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_status VARCHAR DEFAULT 'free',
    entitlements JSONB DEFAULT '{}',
    revenue_cat_customer_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    total_time_hours INTEGER NOT NULL,
    difficulty TEXT NOT NULL, -- 'beginner', 'intermediate', 'advanced'
    ingredients JSONB NOT NULL, -- Array of {name: string, amount: string}
    steps JSONB NOT NULL, -- Array of {id: string, name: string, duration: number, description: string}
    oven_temp_profile JSONB, -- Array of {stepIndex: number, temperature: number, duration: number}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bakes
CREATE TABLE IF NOT EXISTS bakes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'active', 'completed', 'paused'
    current_step INTEGER DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estimated_end_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    environmental_data JSONB, -- {temperature: number, humidity: number}
    timeline_adjustments JSONB, -- Array of adjustments made
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline steps
CREATE TABLE IF NOT EXISTS timeline_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bake_id UUID NOT NULL REFERENCES bakes(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    estimated_duration_minutes INTEGER NOT NULL,
    actual_duration_minutes INTEGER,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL, -- 'pending', 'active', 'completed'
    auto_adjustments JSONB -- Tracking recalibrations
);

-- Bake notes
CREATE TABLE IF NOT EXISTS bake_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bake_id UUID NOT NULL REFERENCES bakes(id) ON DELETE CASCADE,
    step_index INTEGER,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bake photos
CREATE TABLE IF NOT EXISTS bake_photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bake_id UUID NOT NULL REFERENCES bakes(id) ON DELETE CASCADE,
    step_index INTEGER,
    filename TEXT NOT NULL,
    file_path TEXT, -- Path to stored image
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tutorials
CREATE TABLE IF NOT EXISTS tutorials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT NOT NULL,
    steps JSONB NOT NULL, -- Array of tutorial steps
    duration_minutes INTEGER,
    thumbnail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sensor readings
CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    bake_id UUID REFERENCES bakes(id) ON DELETE CASCADE,
    temperature INTEGER, -- Celsius * 10 for precision
    humidity INTEGER, -- Percentage
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline plans
CREATE TABLE IF NOT EXISTS timeline_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    recipe_ids JSONB NOT NULL, -- Array of recipe IDs
    calculated_schedule JSONB, -- Timeline calculation results
    status TEXT DEFAULT 'planned' NOT NULL, -- 'planned', 'active', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Starter logs for sourdough starter tracking
CREATE TABLE IF NOT EXISTS starter_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Core feeding data
    flour_types JSONB NOT NULL, -- Array of {type: string, percentage: number}
    feed_ratio JSONB NOT NULL, -- {starter: number, flour: number, water: number}
    hydration_percent INTEGER, -- Auto-calculated hydration percentage
    feed_amount_grams INTEGER NOT NULL, -- Total flour amount added
    
    -- Environmental conditions
    ambient_temp_f INTEGER, -- Temperature in Fahrenheit
    ambient_temp_c INTEGER, -- Temperature in Celsius
    
    -- Starter condition
    starter_stage VARCHAR, -- 'just_fed', 'peak', 'collapsing', 'sluggish'
    condition_notes TEXT, -- Smell, texture, bubbles, rise level
    
    -- Performance tracking
    rise_time_hours INTEGER, -- Time to double/triple in hours
    rise_time_minutes INTEGER, -- Additional minutes for precision
    peak_activity BOOLEAN DEFAULT false, -- Whether starter reached peak
    
    -- Discard usage
    discard_used BOOLEAN DEFAULT false,
    discard_recipe TEXT, -- What was made with discard
    
    -- Photo attachment
    photo_url TEXT, -- URL to attached photo
    
    -- Weather data for analytics
    weather_data JSONB, -- {humidity: number, pressure: number, weatherCondition: string}
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR,
    event_type VARCHAR NOT NULL,
    event_category VARCHAR NOT NULL,
    event_data JSONB,
    user_agent TEXT,
    ip_address VARCHAR,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_bakes_user_id ON bakes(user_id);
CREATE INDEX IF NOT EXISTS idx_bakes_status ON bakes(status);
CREATE INDEX IF NOT EXISTS idx_timeline_steps_bake_id ON timeline_steps(bake_id);
CREATE INDEX IF NOT EXISTS idx_bake_notes_bake_id ON bake_notes(bake_id);
CREATE INDEX IF NOT EXISTS idx_bake_photos_bake_id ON bake_photos(bake_id);
CREATE INDEX IF NOT EXISTS idx_starter_logs_user_id ON starter_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_starter_logs_date ON starter_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_timeline_plans_user_id ON timeline_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE bake_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bake_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE starter_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- User profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User entitlements: users can only access their own entitlements
CREATE POLICY "Users can access own entitlements" ON user_entitlements FOR ALL USING (auth.uid() = user_id);

-- Recipes: users can only access their own recipes
CREATE POLICY "Users can manage own recipes" ON recipes FOR ALL USING (auth.uid() = user_id);

-- Bakes: users can only access their own bakes
CREATE POLICY "Users can manage own bakes" ON bakes FOR ALL USING (auth.uid() = user_id);

-- Timeline steps: users can only access timeline steps for their own bakes
CREATE POLICY "Users can manage own timeline steps" ON timeline_steps FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM bakes WHERE id = timeline_steps.bake_id)
);

-- Bake notes: users can only access notes for their own bakes
CREATE POLICY "Users can manage own bake notes" ON bake_notes FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM bakes WHERE id = bake_notes.bake_id)
);

-- Bake photos: users can only access photos for their own bakes
CREATE POLICY "Users can manage own bake photos" ON bake_photos FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM bakes WHERE id = bake_photos.bake_id)
);

-- Starter logs: users can only access their own starter logs
CREATE POLICY "Users can manage own starter logs" ON starter_logs FOR ALL USING (auth.uid() = user_id);

-- Timeline plans: users can only access their own timeline plans
CREATE POLICY "Users can manage own timeline plans" ON timeline_plans FOR ALL USING (auth.uid() = user_id);

-- Analytics events: users can only access their own events
CREATE POLICY "Users can manage own analytics events" ON analytics_events FOR ALL USING (auth.uid() = user_id);

-- Tutorials: public read access for all authenticated users
CREATE POLICY "Authenticated users can read tutorials" ON tutorials FOR SELECT TO authenticated USING (true);

-- Sensor readings: public read access for all authenticated users (or modify based on your needs)
CREATE POLICY "Authenticated users can read sensors" ON sensor_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sensors" ON sensor_readings FOR INSERT TO authenticated WITH CHECK (true);

-- Create a function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, first_name, last_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql security definer;

-- Create a trigger to automatically create user profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();