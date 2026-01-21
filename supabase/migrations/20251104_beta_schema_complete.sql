-- LAWGENTIC BETA SCHEMA - Complete database structure for ILIT administration
-- Created: 2025-11-04
-- Purpose: Add all tables needed for Seth demo and BETA launch

-- ============================================================================
-- CORE TABLES EXPANSION
-- ============================================================================

-- Complete insurance_policies table
CREATE TABLE IF NOT EXISTS insurance_policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
    
    -- Policy identification
    policy_number TEXT NOT NULL UNIQUE,
    carrier TEXT NOT NULL,
    policy_type TEXT,
    
    -- Insured information
    insured_name TEXT NOT NULL,
    insured_dob DATE,
    
    -- Policy details
    death_benefit DECIMAL(15,2),
    cash_value DECIMAL(15,2),
    policy_owner TEXT,
    
    -- Premium information
    annual_premium DECIMAL(12,2),
    premium_frequency TEXT DEFAULT 'annual',
    premium_due_date DATE,
    next_premium_due DATE,
    
    -- Status
    policy_status TEXT DEFAULT 'active',
    issue_date DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Premium payment tracking
CREATE TABLE IF NOT EXISTS premium_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID REFERENCES insurance_policies(id) ON DELETE CASCADE,
    
    payment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT,
    paid_from_trust BOOLEAN DEFAULT true,
    gift_id UUID REFERENCES gifts(id),
    status TEXT DEFAULT 'completed',
    confirmation_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upcoming premium tracking
CREATE TABLE IF NOT EXISTS upcoming_premiums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID REFERENCES insurance_policies(id) ON DELETE CASCADE,
    trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
    next_due_date DATE NOT NULL,
    amount_due DECIMAL(12,2) NOT NULL,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    days_until_due INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fund sufficiency checks
CREATE TABLE IF NOT EXISTS fund_sufficiency_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    total_annual_premiums DECIMAL(15,2) NOT NULL,
    total_trust_assets DECIMAL(15,2) NOT NULL,
    sufficiency_ratio DECIMAL(5,2),
    is_sufficient BOOLEAN NOT NULL,
    shortfall_amount DECIMAL(15,2),
    months_of_coverage INTEGER,
    recommended_gift_amount DECIMAL(15,2),
    notes TEXT,
    checked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crummey notices
CREATE TABLE IF NOT EXISTS crummey_notices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gift_id UUID REFERENCES gifts(id) ON DELETE CASCADE,
    trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE CASCADE,
    notice_date DATE NOT NULL,
    withdrawal_deadline DATE NOT NULL,
    withdrawal_amount DECIMAL(12,2) NOT NULL,
    withdrawal_period_days INTEGER DEFAULT 30,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    withdrawal_exercised BOOLEAN DEFAULT false,
    document_generated BOOLEAN DEFAULT false,
    document_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email delivery logs
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    trust_id UUID REFERENCES trusts(id) ON DELETE SET NULL,
    crummey_notice_id UUID REFERENCES crummey_notices(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    email_service_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_insurance_policies_trust_id ON insurance_policies(trust_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_policy_number ON insurance_policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_premium_payments_policy_id ON premium_payments(policy_id);
CREATE INDEX IF NOT EXISTS idx_upcoming_premiums_trust_id ON upcoming_premiums(trust_id);
CREATE INDEX IF NOT EXISTS idx_upcoming_premiums_next_due_date ON upcoming_premiums(next_due_date);
CREATE INDEX IF NOT EXISTS idx_fund_sufficiency_trust_id ON fund_sufficiency_checks(trust_id);
CREATE INDEX IF NOT EXISTS idx_crummey_notices_trust_id ON crummey_notices(trust_id);
CREATE INDEX IF NOT EXISTS idx_crummey_notices_status ON crummey_notices(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_trust_id ON email_logs(trust_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_premiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_sufficiency_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crummey_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view policies" ON insurance_policies 
FOR SELECT USING (trust_id IN (SELECT id FROM trusts WHERE attorney_id = auth.uid()));

CREATE POLICY "Users can manage policies" ON insurance_policies 
FOR ALL USING (trust_id IN (SELECT id FROM trusts WHERE attorney_id = auth.uid()));

CREATE POLICY "Users can view payments" ON premium_payments 
FOR SELECT USING (policy_id IN (SELECT id FROM insurance_policies WHERE trust_id IN (SELECT id FROM trusts WHERE attorney_id = auth.uid())));

CREATE POLICY "Users can view upcoming premiums" ON upcoming_premiums 
FOR SELECT USING (trust_id IN (SELECT id FROM trusts WHERE attorney_id = auth.uid()));

CREATE POLICY "Users can view fund checks" ON fund_sufficiency_checks 
FOR SELECT USING (trust_id IN (SELECT id FROM trusts WHERE attorney_id = auth.uid()));

CREATE POLICY "Users can view notices" ON crummey_notices 
FOR SELECT USING (trust_id IN (SELECT id FROM trusts WHERE attorney_id = auth.uid()));

CREATE POLICY "Users can manage notices" ON crummey_notices 
FOR ALL USING (trust_id IN (SELECT id FROM trusts WHERE attorney_id = auth.uid()));

CREATE POLICY "Users can view email logs" ON email_logs 
FOR SELECT USING (trust_id IN (SELECT id FROM trusts WHERE attorney_id = auth.uid()) OR trust_id IS NULL);