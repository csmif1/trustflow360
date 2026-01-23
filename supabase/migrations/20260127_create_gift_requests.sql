-- Sprint 5: Gift Request Generator
-- Create gift_requests table for tracking gift contribution requests to grantors

CREATE TABLE IF NOT EXISTS gift_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_id UUID REFERENCES trusts(id) NOT NULL,
  policy_id UUID REFERENCES insurance_policies(id) NOT NULL,
  grantor_name TEXT NOT NULL,
  grantor_email TEXT,
  amount_requested DECIMAL(12,2) NOT NULL,
  premium_due_date DATE,
  request_due_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'reminded', 'received', 'expired')),
  sent_at TIMESTAMPTZ,
  sent_via TEXT CHECK (sent_via IN ('email', 'mail', 'both')),
  reminder_sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  received_amount DECIMAL(12,2),
  notes TEXT,
  letter_html TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gift_requests_trust ON gift_requests(trust_id);
CREATE INDEX IF NOT EXISTS idx_gift_requests_policy ON gift_requests(policy_id);
CREATE INDEX IF NOT EXISTS idx_gift_requests_status ON gift_requests(status);
CREATE INDEX IF NOT EXISTS idx_gift_requests_due_date ON gift_requests(request_due_date);

-- Enable Row Level Security
ALTER TABLE gift_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gift_requests' AND policyname = 'Service role can manage all gift requests'
  ) THEN
    CREATE POLICY "Service role can manage all gift requests" ON gift_requests FOR ALL USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gift_requests' AND policyname = 'Authenticated users can view gift requests'
  ) THEN
    CREATE POLICY "Authenticated users can view gift requests" ON gift_requests FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gift_requests' AND policyname = 'Authenticated users can insert gift requests'
  ) THEN
    CREATE POLICY "Authenticated users can insert gift requests" ON gift_requests FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gift_requests' AND policyname = 'Authenticated users can update gift requests'
  ) THEN
    CREATE POLICY "Authenticated users can update gift requests" ON gift_requests FOR UPDATE USING (true);
  END IF;
END $$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gift_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gift_requests_updated_at ON gift_requests;
CREATE TRIGGER gift_requests_updated_at
  BEFORE UPDATE ON gift_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_gift_requests_updated_at();

-- Comments
COMMENT ON TABLE gift_requests IS 'Tracks gift contribution requests sent to grantors for trust funding';
COMMENT ON COLUMN gift_requests.status IS 'Request lifecycle: draft → sent → reminded → received or expired';
COMMENT ON COLUMN gift_requests.amount_requested IS 'Amount requested from grantor (typically premium ÷ number of grantors)';
COMMENT ON COLUMN gift_requests.letter_html IS 'Generated HTML letter content for preview and sending';
