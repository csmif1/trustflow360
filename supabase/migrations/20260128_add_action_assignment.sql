-- Sprint 6: Action Assignment
-- Add assignment fields to remediation_actions table

-- Add assignment fields
ALTER TABLE remediation_actions
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_to_email TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

-- Index for filtering by assignee
CREATE INDEX IF NOT EXISTS idx_remediation_actions_assigned_to
ON remediation_actions(assigned_to);

-- Comments
COMMENT ON COLUMN remediation_actions.assigned_to IS 'User ID of person assigned to this action';
COMMENT ON COLUMN remediation_actions.assigned_to_name IS 'Name of person assigned (for display)';
COMMENT ON COLUMN remediation_actions.assigned_to_email IS 'Email of person assigned (for notifications)';
COMMENT ON COLUMN remediation_actions.assigned_at IS 'When the action was assigned';
COMMENT ON COLUMN remediation_actions.assigned_by IS 'User ID of person who assigned the action';
