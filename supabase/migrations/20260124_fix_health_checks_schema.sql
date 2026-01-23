-- =====================================================================
-- Fix policy_health_checks schema to match production
-- The production schema uses trusts directly, not an ilits table
-- =====================================================================

-- Drop the incorrect foreign key constraint
ALTER TABLE policy_health_checks
DROP CONSTRAINT IF EXISTS policy_health_checks_ilit_id_fkey;

-- Rename the column to match actual schema
ALTER TABLE policy_health_checks
RENAME COLUMN ilit_id TO trust_id;

-- Add correct foreign key constraint to trusts table
ALTER TABLE policy_health_checks
ADD CONSTRAINT policy_health_checks_trust_id_fkey
FOREIGN KEY (trust_id) REFERENCES trusts(id) ON DELETE CASCADE;

-- Update comment to reflect correct schema
COMMENT ON COLUMN policy_health_checks.trust_id IS 'Reference to trusts table (trust IS the ILIT in this schema)';

-- Update the index name to match
DROP INDEX IF EXISTS idx_health_checks_ilit;
CREATE INDEX IF NOT EXISTS idx_health_checks_trust ON policy_health_checks(trust_id);

-- Update RLS policy to use trust_id
DROP POLICY IF EXISTS "Users can view health checks for their ILITs" ON policy_health_checks;

CREATE POLICY "Users can view health checks for their trusts"
  ON policy_health_checks FOR SELECT
  USING (
    trust_id IN (
      SELECT id FROM trusts WHERE user_id = auth.uid()
    )
  );
