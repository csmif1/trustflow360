-- Fix trusts table
ALTER TABLE trusts 
ADD COLUMN IF NOT EXISTS trust_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure documents table exists with proper structure
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    document_type TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_trust_id ON documents(trust_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);

-- Create storage bucket for trust documents if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('trust-documents', 'trust-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents for their trusts" ON documents
FOR SELECT USING (
    trust_id IN (
        SELECT id FROM trusts WHERE attorney_id = auth.uid()
    )
);

CREATE POLICY "Users can insert documents for their trusts" ON documents
FOR INSERT WITH CHECK (
    trust_id IN (
        SELECT id FROM trusts WHERE attorney_id = auth.uid()
    )
);

CREATE POLICY "Users can delete documents for their trusts" ON documents
FOR DELETE USING (
    trust_id IN (
        SELECT id FROM trusts WHERE attorney_id = auth.uid()
    )
);

-- Fix beneficiaries table
ALTER TABLE beneficiaries 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Fix gifts table
ALTER TABLE gifts
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create new tables for expanded features
CREATE TABLE IF NOT EXISTS trustees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'trustee',
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trust_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL, -- 'insurance_policy', 'investment', 'real_estate', etc.
    asset_name TEXT NOT NULL,
    asset_value DECIMAL(15,2),
    last_valued_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_filings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
    filing_type TEXT NOT NULL, -- '709', '1041', etc.
    tax_year INTEGER NOT NULL,
    due_date DATE,
    filed_date DATE,
    status TEXT DEFAULT 'pending', -- 'pending', 'filed', 'extended'
    preparer_id UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    task_description TEXT,
    due_date DATE,
    completed_date DATE,
    assigned_to UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_trustees_trust_id ON trustees(trust_id);
CREATE INDEX IF NOT EXISTS idx_trust_assets_trust_id ON trust_assets(trust_id);
CREATE INDEX IF NOT EXISTS idx_tax_filings_trust_id ON tax_filings(trust_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_trust_id ON compliance_tasks(trust_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_due_date ON compliance_tasks(due_date);