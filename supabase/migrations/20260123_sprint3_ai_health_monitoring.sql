-- =====================================================================
-- TrustFlow360 - Sprint 3: AI-Powered Policy Health Monitoring
-- Migration: 20260123_sprint3_ai_health_monitoring.sql
-- Date: January 23, 2026
--
-- PURPOSE:
-- This migration creates the database infrastructure for AI-powered
-- policy health monitoring, including audit trails, health analysis
-- storage, and remediation tracking.
--
-- TABLES CREATED (in order):
-- 1. ai_processing_log - Audit trail for all AI operations
-- 2. ai_prediction_feedback - User corrections to AI predictions
-- 3. policy_health_checks - Policy health analysis results
-- 4. remediation_actions - Remediation task tracking
-- 5. health_check_templates - Customizable health check configurations
--
-- DESIGN DECISIONS:
-- - AI audit tables created FIRST to establish logging foundation
-- - All AI operations must log to ai_processing_log for compliance
-- - JSONB used for flexible issue/recommendation storage
-- - Comprehensive indexes for query performance
-- - RLS policies for row-level security
-- =====================================================================

-- =====================================================================
-- TABLE 1: ai_processing_log
-- PURPOSE: Audit trail for all AI/LLM operations in the system
-- LOGS: Document extraction, health analysis, recommendations
-- RETENTION: Permanent (compliance requirement)
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai_processing_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Entity Reference
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'document',           -- AI document extraction
    'policy_health',      -- Policy health analysis
    'recommendation',     -- AI-generated recommendations
    'validation',         -- AI validation checks
    'other'
  )),
  entity_id UUID,         -- Reference to specific entity (policy, document, etc)

  -- AI Model Info
  model_name TEXT NOT NULL,  -- 'gemini-2.5-flash', 'gemini-pro', etc
  model_version TEXT,        -- Model version for reproducibility
  prompt_type TEXT,          -- 'classification', 'extraction', 'health_analysis', etc

  -- AI Input/Output
  prompt_text TEXT,          -- Optional: store prompt for debugging
  ai_response JSONB NOT NULL,  -- Full AI response (structured)
  confidence_score NUMERIC(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT,            -- AI's explanation/reasoning

  -- Performance Metrics
  processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
  tokens_used INTEGER CHECK (tokens_used >= 0),
  cost_usd NUMERIC(10,6),    -- Estimated cost in USD

  -- Status & Error Handling
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed', 'timeout')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Audit Trail
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb  -- Flexible storage for extra context
);

COMMENT ON TABLE ai_processing_log IS 'Audit trail for all AI/LLM operations. Required for compliance, debugging, and model improvement. All AI operations MUST log here.';
COMMENT ON COLUMN ai_processing_log.entity_type IS 'Type of entity being processed by AI';
COMMENT ON COLUMN ai_processing_log.ai_response IS 'Full structured response from AI (JSONB for flexible querying)';
COMMENT ON COLUMN ai_processing_log.confidence_score IS 'AI confidence score (0.0-1.0). Threshold: >0.70 for auto-acceptance';
COMMENT ON COLUMN ai_processing_log.processing_time_ms IS 'Processing time in milliseconds for performance monitoring';
COMMENT ON COLUMN ai_processing_log.tokens_used IS 'Token count for cost tracking and optimization';

-- =====================================================================
-- TABLE 2: ai_prediction_feedback
-- PURPOSE: Track user corrections to AI predictions for model improvement
-- USAGE: When users modify AI-extracted data or reject AI recommendations
-- BENEFIT: Enables continuous improvement of AI accuracy
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai_prediction_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_log_id UUID NOT NULL REFERENCES ai_processing_log(id) ON DELETE CASCADE,

  -- User Feedback
  user_accepted BOOLEAN,     -- Did user accept AI prediction as-is?
  accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),  -- 1=terrible, 5=perfect
  corrections_made JSONB,    -- What fields did user change? {field: {old: X, new: Y}}
  user_feedback TEXT,        -- Free-text feedback from user

  -- Correction Context
  correction_reason TEXT CHECK (correction_reason IN (
    'incorrect_value',
    'missing_data',
    'wrong_classification',
    'formatting_issue',
    'outdated_info',
    'other'
  )),

  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ai_prediction_feedback IS 'User feedback on AI predictions. Critical for measuring and improving AI accuracy over time.';
COMMENT ON COLUMN ai_prediction_feedback.corrections_made IS 'JSON object showing what user changed: {field_name: {ai_value: X, user_value: Y}}';
COMMENT ON COLUMN ai_prediction_feedback.accuracy_rating IS 'User rating of AI accuracy (1-5 scale) for quantitative tracking';

-- =====================================================================
-- TABLE 3: policy_health_checks
-- PURPOSE: Store results of AI-powered policy health analysis
-- FREQUENCY: Daily automated checks + on-demand manual checks
-- RETENTION: Keep full history for trend analysis
-- =====================================================================

CREATE TABLE IF NOT EXISTS policy_health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  ilit_id UUID NOT NULL REFERENCES ilits(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Overall Health Status
  overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'warning', 'critical', 'unknown')),
  health_score NUMERIC(5,2) NOT NULL CHECK (health_score >= 0 AND health_score <= 100),

  -- Component Health Scores (weighted components of overall score)
  component_scores JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {premium_payment: 85, coverage: 90, compliance: 95}

  -- Specific Status Indicators
  premium_payment_status TEXT CHECK (premium_payment_status IN ('current', 'late', 'delinquent', 'grace_period', 'lapsed', 'unknown')),
  days_until_next_premium INTEGER,
  days_overdue INTEGER,
  coverage_adequacy_score NUMERIC(5,2),
  trust_funding_runway_years NUMERIC(5,2),  -- Years of premiums covered by trust assets
  beneficiary_designation_status TEXT CHECK (beneficiary_designation_status IN ('valid', 'needs_review', 'invalid', 'unknown')),
  ownership_verification_status TEXT CHECK (ownership_verification_status IN ('verified', 'needs_verification', 'failed', 'unknown')),

  -- AI Analysis Results
  ai_log_id UUID REFERENCES ai_processing_log(id) ON DELETE SET NULL,  -- Link to AI audit log
  ai_analysis_summary TEXT NOT NULL,  -- 2-3 sentence executive summary from AI
  ai_model_version TEXT DEFAULT 'gemini-2.5-flash',
  ai_confidence_score NUMERIC(5,4) CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),

  -- Issues & Recommendations (from AI + rule-based logic)
  issues_detected JSONB DEFAULT '[]'::jsonb,  -- [{type, severity, description, requires_remediation}]
  recommendations JSONB DEFAULT '[]'::jsonb,  -- [{action, priority, description}]

  -- Remediation Status
  remediation_required BOOLEAN DEFAULT false,
  remediation_priority TEXT CHECK (remediation_priority IN ('low', 'medium', 'high', 'urgent')),
  remediation_deadline DATE,
  remediation_status TEXT DEFAULT 'pending' CHECK (remediation_status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- Metadata
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  check_trigger TEXT NOT NULL DEFAULT 'scheduled' CHECK (check_trigger IN ('manual', 'scheduled', 'alert', 'api')),
  check_duration_ms INTEGER,  -- Processing time for performance monitoring

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE policy_health_checks IS 'AI-powered policy health analysis results. Hybrid scoring: 70% rule-based + 30% AI. Daily automated checks + on-demand manual.';
COMMENT ON COLUMN policy_health_checks.component_scores IS 'Breakdown: {premium_payment: 40%, coverage_adequacy: 30%, compliance: 30%}';
COMMENT ON COLUMN policy_health_checks.issues_detected IS 'Array of detected issues: [{type: "payment_pattern", severity: "high", description: "...", requires_remediation: true}]';
COMMENT ON COLUMN policy_health_checks.recommendations IS 'AI + rule-based recommendations: [{action: "contact_trustee", priority: "urgent", description: "..."}]';
COMMENT ON COLUMN policy_health_checks.trust_funding_runway_years IS 'Years of premiums covered at current rate. <1 year = critical, <2 years = warning';

-- =====================================================================
-- TABLE 4: remediation_actions
-- PURPOSE: Track remediation tasks generated from health check issues
-- WORKFLOW: Critical issues auto-create actions → assigned → tracked → completed
-- ALERTS: Urgent actions trigger email/SMS notifications
-- =====================================================================

CREATE TABLE IF NOT EXISTS remediation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  health_check_id UUID NOT NULL REFERENCES policy_health_checks(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,

  -- Action Details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'contact_trustee',      -- Trustee communication needed
    'update_beneficiary',   -- Beneficiary designation fix
    'pay_premium',          -- Premium payment required
    'fund_trust',           -- Trust funding needed
    'verify_ownership',     -- Ownership verification required
    'review_compliance',    -- Compliance review needed
    'update_policy_info',   -- Policy information update
    'escalate_issue',       -- Escalate to attorney/advisor
    'custom'                -- Custom action type
  )),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,

  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completion_notes TEXT,

  -- AI Recommendations
  ai_suggested BOOLEAN DEFAULT false,  -- Was this action AI-suggested?
  ai_recommendation_text TEXT,
  ai_confidence_score NUMERIC(5,4),

  -- Alert Configuration
  email_alert_sent BOOLEAN DEFAULT false,
  email_alert_sent_at TIMESTAMP WITH TIME ZONE,
  sms_alert_sent BOOLEAN DEFAULT false,
  sms_alert_sent_at TIMESTAMP WITH TIME ZONE,

  -- Follow-up
  requires_follow_up BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE remediation_actions IS 'Remediation tasks generated from policy health issues. Auto-created for critical issues, manually triaged for warnings.';
COMMENT ON COLUMN remediation_actions.action_type IS 'Type of remediation action required. Maps to automated workflows and assignment rules.';
COMMENT ON COLUMN remediation_actions.ai_suggested IS 'TRUE if AI recommended this action (vs rule-based generation). Track AI recommendation accuracy.';
COMMENT ON COLUMN remediation_actions.due_date IS 'Calculated based on issue severity: urgent=3 days, high=7 days, medium=14 days, low=30 days';

-- =====================================================================
-- TABLE 5: health_check_templates
-- PURPOSE: Configurable health check templates for different policy types
-- USAGE: Enterprise tier can customize check criteria and scoring weights
-- DEFAULT: System provides baseline template for all policies
-- =====================================================================

CREATE TABLE IF NOT EXISTS health_check_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Check Configuration
  check_criteria JSONB NOT NULL,  -- Rules for what to check and how
  scoring_weights JSONB NOT NULL DEFAULT '{"premium_payment": 0.40, "coverage_adequacy": 0.30, "compliance": 0.30}'::jsonb,

  -- Thresholds
  critical_threshold NUMERIC(5,2) DEFAULT 50 CHECK (critical_threshold >= 0 AND critical_threshold <= 100),
  warning_threshold NUMERIC(5,2) DEFAULT 75 CHECK (warning_threshold >= 0 AND warning_threshold <= 100),

  -- Template Usage
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tier_required TEXT CHECK (tier_required IN ('starter', 'professional', 'enterprise')) DEFAULT 'starter',

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE health_check_templates IS 'Customizable health check configurations. Enterprise tier can create custom templates with specific criteria and weights.';
COMMENT ON COLUMN health_check_templates.check_criteria IS 'JSON defining what to check: {premium: {max_days_late: 30}, funding: {min_runway_years: 2}, ...}';
COMMENT ON COLUMN health_check_templates.scoring_weights IS 'Component weights that sum to 1.0: {premium_payment: 0.40, coverage_adequacy: 0.30, compliance: 0.30}';
COMMENT ON COLUMN health_check_templates.critical_threshold IS 'Score below this = critical status (default 50). Triggers urgent remediation actions.';

-- Insert default template
INSERT INTO health_check_templates (name, description, check_criteria, scoring_weights, is_default, is_active)
VALUES (
  'Standard ILIT Health Check',
  'Default health check template for all ILIT policies. Balanced weighting across premium payments, coverage adequacy, and compliance.',
  '{
    "premium_payment": {
      "max_days_late_warning": 15,
      "max_days_late_critical": 30,
      "pattern_lookback_months": 12
    },
    "coverage_adequacy": {
      "min_runway_years_warning": 2,
      "min_runway_years_critical": 1,
      "check_trust_funding": true
    },
    "compliance": {
      "crummey_notice_threshold": 0.80,
      "check_beneficiary_designations": true,
      "check_ownership": true
    }
  }'::jsonb,
  '{"premium_payment": 0.40, "coverage_adequacy": 0.30, "compliance": 0.30}'::jsonb,
  true,
  true
) ON CONFLICT (name) DO NOTHING;

-- =====================================================================
-- INDEXES: Performance optimization for common queries
-- =====================================================================

-- ai_processing_log indexes
CREATE INDEX IF NOT EXISTS idx_ai_log_entity ON ai_processing_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_created ON ai_processing_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_log_status ON ai_processing_log(status);
CREATE INDEX IF NOT EXISTS idx_ai_log_model ON ai_processing_log(model_name);

-- ai_prediction_feedback indexes
CREATE INDEX IF NOT EXISTS idx_ai_feedback_log ON ai_prediction_feedback(ai_log_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_accepted ON ai_prediction_feedback(user_accepted);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created ON ai_prediction_feedback(created_at DESC);

-- policy_health_checks indexes
CREATE INDEX IF NOT EXISTS idx_health_checks_policy ON policy_health_checks(policy_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_ilit ON policy_health_checks(ilit_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_date ON policy_health_checks(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON policy_health_checks(overall_status);
CREATE INDEX IF NOT EXISTS idx_health_checks_remediation ON policy_health_checks(remediation_required, remediation_status);
CREATE INDEX IF NOT EXISTS idx_health_checks_created ON policy_health_checks(created_at DESC);

-- remediation_actions indexes
CREATE INDEX IF NOT EXISTS idx_remediation_health_check ON remediation_actions(health_check_id);
CREATE INDEX IF NOT EXISTS idx_remediation_policy ON remediation_actions(policy_id);
CREATE INDEX IF NOT EXISTS idx_remediation_status ON remediation_actions(status);
CREATE INDEX IF NOT EXISTS idx_remediation_assigned ON remediation_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_remediation_priority ON remediation_actions(priority, status);
CREATE INDEX IF NOT EXISTS idx_remediation_due_date ON remediation_actions(due_date) WHERE status IN ('pending', 'in_progress');

-- health_check_templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_active ON health_check_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_default ON health_check_templates(is_default);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- SECURITY MODEL: Users can only access data for their own policies/ILITs
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE ai_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prediction_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_templates ENABLE ROW LEVEL SECURITY;

-- ai_processing_log RLS policies
-- Match existing pattern: users access via attorney_id in trusts table
CREATE POLICY "Users can view AI logs for their own entities"
  ON ai_processing_log FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Service role can insert AI logs"
  ON ai_processing_log FOR INSERT
  WITH CHECK (true);  -- Service role bypasses RLS

CREATE POLICY "Service role can view AI logs"
  ON ai_processing_log FOR SELECT
  USING (true);  -- Service role bypasses RLS

-- ai_prediction_feedback RLS policies
CREATE POLICY "Users can provide feedback on their own AI predictions"
  ON ai_prediction_feedback FOR ALL
  USING (auth.uid() = created_by);

-- policy_health_checks RLS policies
-- Users access via ilit_id -> trust_id -> user_id chain (matching existing pattern)
CREATE POLICY "Users can view health checks for their ILITs"
  ON policy_health_checks FOR SELECT
  USING (
    ilit_id IN (
      SELECT id FROM ilits WHERE trust_id IN (
        SELECT id FROM trusts WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can manage health checks"
  ON policy_health_checks FOR ALL
  USING (true);  -- Service role bypasses RLS

-- remediation_actions RLS policies
-- Users access via policy_id -> trust_id -> user_id chain (matching existing pattern)
CREATE POLICY "Users can view remediation actions for their policies"
  ON remediation_actions FOR SELECT
  USING (
    policy_id IN (
      SELECT id FROM insurance_policies WHERE trust_id IN (
        SELECT id FROM trusts WHERE user_id = auth.uid()
      )
    ) OR auth.uid() = assigned_to
  );

CREATE POLICY "Assigned users can update their remediation actions"
  ON remediation_actions FOR UPDATE
  USING (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to);

CREATE POLICY "Service role can manage remediation actions"
  ON remediation_actions FOR ALL
  USING (true);  -- Service role bypasses RLS

-- health_check_templates RLS policies
CREATE POLICY "Everyone can view active templates"
  ON health_check_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage templates"
  ON health_check_templates FOR ALL
  USING (true);  -- Service role bypasses RLS

-- =====================================================================
-- TRIGGERS: Auto-update timestamps
-- =====================================================================

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_policy_health_checks_updated_at
  BEFORE UPDATE ON policy_health_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remediation_actions_updated_at
  BEFORE UPDATE ON remediation_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_check_templates_updated_at
  BEFORE UPDATE ON health_check_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- VERIFICATION QUERIES (for post-migration testing)
-- =====================================================================

-- These are informational queries, not executed during migration

-- Verify tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE '%health%' OR table_name LIKE '%ai_%';

-- Verify indexes
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE tablename IN ('ai_processing_log', 'policy_health_checks', 'remediation_actions');

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE tablename IN ('ai_processing_log', 'policy_health_checks', 'remediation_actions');

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
