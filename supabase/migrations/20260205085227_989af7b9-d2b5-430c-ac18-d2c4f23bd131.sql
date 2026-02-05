-- Create rate limiting table for student login attempts
CREATE TABLE public.login_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ip text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create index for fast lookups by IP
CREATE INDEX idx_login_rate_limits_ip ON public.login_rate_limits(client_ip);

-- Create index for cleanup of old entries
CREATE INDEX idx_login_rate_limits_window ON public.login_rate_limits(window_start);

-- Enable RLS - service role bypasses it, no public policies needed
ALTER TABLE public.login_rate_limits ENABLE ROW LEVEL SECURITY;