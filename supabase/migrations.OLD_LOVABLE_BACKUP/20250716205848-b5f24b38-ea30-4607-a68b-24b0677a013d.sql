-- Create comprehensive ILIT administration database schema

-- Trusts table
CREATE TABLE public.trusts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    grantor_name TEXT NOT NULL,
    trust_name TEXT NOT NULL,
    trust_date DATE NOT NULL,
    trust_type TEXT DEFAULT 'ILIT',
    status TEXT DEFAULT 'active',
    crm_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trust documents table
CREATE TABLE public.trust_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID NOT NULL REFERENCES public.trusts(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'trust_agreement', 'amendment', 'annual_report', etc.
    document_name TEXT NOT NULL,
    file_path TEXT,
    review_status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'approved'
    reviewed_by TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insurance policies table
CREATE TABLE public.insurance_policies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID NOT NULL REFERENCES public.trusts(id) ON DELETE CASCADE,
    policy_number TEXT NOT NULL,
    insurance_company TEXT NOT NULL,
    policy_type TEXT,
    death_benefit DECIMAL(15,2),
    annual_premium DECIMAL(15,2),
    premium_frequency TEXT DEFAULT 'annual', -- 'annual', 'semi-annual', 'quarterly', 'monthly'
    next_premium_due DATE,
    policy_status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Beneficiaries table
CREATE TABLE public.beneficiaries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID NOT NULL REFERENCES public.trusts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    relationship TEXT,
    percentage DECIMAL(5,2),
    is_primary BOOLEAN DEFAULT true,
    notification_preferences JSONB DEFAULT '{"email": true, "mail": false}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contributions table
CREATE TABLE public.contributions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID NOT NULL REFERENCES public.trusts(id) ON DELETE CASCADE,
    contributor_name TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    contribution_date DATE NOT NULL,
    contribution_type TEXT DEFAULT 'cash', -- 'cash', 'gift', 'loan'
    status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'reconciled'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Premium payments table
CREATE TABLE public.premium_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'paid', 'overdue', 'failed'
    payment_method TEXT,
    confirmation_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tax filings table
CREATE TABLE public.tax_filings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID NOT NULL REFERENCES public.trusts(id) ON DELETE CASCADE,
    tax_year INTEGER NOT NULL,
    form_type TEXT NOT NULL, -- '1041', '709', 'state_return'
    filing_status TEXT DEFAULT 'pending', -- 'pending', 'prepared', 'filed', 'amended'
    due_date DATE NOT NULL,
    filed_date DATE,
    prepared_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workflow tasks table
CREATE TABLE public.workflow_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID NOT NULL REFERENCES public.trusts(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL, -- 'document_review', 'annual_report', 'beneficiary_notification', etc.
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
    assigned_to TEXT,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Communications table
CREATE TABLE public.communications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID NOT NULL REFERENCES public.trusts(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL, -- 'beneficiary', 'grantor', 'advisor', 'insurance_company'
    recipient_id UUID,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    communication_type TEXT DEFAULT 'email', -- 'email', 'letter', 'phone', 'meeting'
    status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'delivered', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Annual reports table
CREATE TABLE public.annual_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID NOT NULL REFERENCES public.trusts(id) ON DELETE CASCADE,
    report_year INTEGER NOT NULL,
    report_status TEXT DEFAULT 'draft', -- 'draft', 'prepared', 'sent', 'acknowledged'
    total_contributions DECIMAL(15,2) DEFAULT 0,
    total_premiums_paid DECIMAL(15,2) DEFAULT 0,
    trust_balance DECIMAL(15,2) DEFAULT 0,
    report_data JSONB,
    generated_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.trusts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_reports ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (for now, allowing all authenticated users)
-- In production, you'd want more specific role-based policies

CREATE POLICY "Allow all for authenticated users" ON public.trusts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.trust_documents
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.insurance_policies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.beneficiaries
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.contributions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.premium_payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.tax_filings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.workflow_tasks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.communications
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON public.annual_reports
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_trusts_updated_at
    BEFORE UPDATE ON public.trusts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trust_documents_updated_at
    BEFORE UPDATE ON public.trust_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_policies_updated_at
    BEFORE UPDATE ON public.insurance_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beneficiaries_updated_at
    BEFORE UPDATE ON public.beneficiaries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contributions_updated_at
    BEFORE UPDATE ON public.contributions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_premium_payments_updated_at
    BEFORE UPDATE ON public.premium_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_filings_updated_at
    BEFORE UPDATE ON public.tax_filings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_tasks_updated_at
    BEFORE UPDATE ON public.workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communications_updated_at
    BEFORE UPDATE ON public.communications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_annual_reports_updated_at
    BEFORE UPDATE ON public.annual_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_trust_documents_trust_id ON public.trust_documents(trust_id);
CREATE INDEX idx_insurance_policies_trust_id ON public.insurance_policies(trust_id);
CREATE INDEX idx_beneficiaries_trust_id ON public.beneficiaries(trust_id);
CREATE INDEX idx_contributions_trust_id ON public.contributions(trust_id);
CREATE INDEX idx_premium_payments_policy_id ON public.premium_payments(policy_id);
CREATE INDEX idx_tax_filings_trust_id ON public.tax_filings(trust_id);
CREATE INDEX idx_workflow_tasks_trust_id ON public.workflow_tasks(trust_id);
CREATE INDEX idx_communications_trust_id ON public.communications(trust_id);
CREATE INDEX idx_annual_reports_trust_id ON public.annual_reports(trust_id);

-- Create indexes for common queries
CREATE INDEX idx_workflow_tasks_status ON public.workflow_tasks(status);
CREATE INDEX idx_workflow_tasks_due_date ON public.workflow_tasks(due_date);
CREATE INDEX idx_premium_payments_due_date ON public.premium_payments(due_date);
CREATE INDEX idx_tax_filings_due_date ON public.tax_filings(due_date);