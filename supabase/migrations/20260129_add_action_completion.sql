-- Sprint 7: Action Completion Workflow
-- Add completion tracking fields to remediation_actions table

-- Add completion fields
ALTER TABLE remediation_actions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Index for filtering/sorting by completion
CREATE INDEX IF NOT EXISTS idx_remediation_actions_completed_at
ON remediation_actions(completed_at);

-- Comments
COMMENT ON COLUMN remediation_actions.completed_at IS 'When the action was marked complete';
COMMENT ON COLUMN remediation_actions.completed_by IS 'User ID of person who completed the action';
COMMENT ON COLUMN remediation_actions.completion_notes IS 'Required notes documenting how the action was resolved (max 500 chars)';
