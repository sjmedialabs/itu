-- Migration: Create user_fcm_tokens table for Firebase Cloud Messaging push notifications

CREATE TABLE IF NOT EXISTS user_fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'android',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_fcm_tokens_token_key UNIQUE (fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);

ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert/update their own FCM tokens
CREATE POLICY "Users can manage their own FCM tokens"
  ON user_fcm_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on user_fcm_tokens"
  ON user_fcm_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON user_fcm_tokens TO authenticated;
GRANT ALL ON user_fcm_tokens TO service_role;
GRANT ALL ON user_fcm_tokens TO postgres;
