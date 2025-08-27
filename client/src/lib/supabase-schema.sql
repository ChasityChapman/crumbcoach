-- Create user_entitlements table to store RevenueCat entitlements in Supabase
CREATE TABLE IF NOT EXISTS user_entitlements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    entitlement_id VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    product_identifier VARCHAR,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one entitlement record per user per entitlement type
    UNIQUE(user_id, entitlement_id)
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own entitlements
CREATE POLICY "Users can view own entitlements" ON user_entitlements
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own entitlements (for app-side syncing)
CREATE POLICY "Users can insert own entitlements" ON user_entitlements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own entitlements
CREATE POLICY "Users can update own entitlements" ON user_entitlements
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own entitlements
CREATE POLICY "Users can delete own entitlements" ON user_entitlements
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user_id ON user_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entitlements_active ON user_entitlements(user_id, is_active, expires_at);

-- Create function to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_user_entitlements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_updated
CREATE TRIGGER update_user_entitlements_updated_at
    BEFORE UPDATE ON user_entitlements
    FOR EACH ROW
    EXECUTE FUNCTION update_user_entitlements_updated_at();