-- Create storage bucket for trust documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('trust-documents', 'trust-documents', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trust_id UUID REFERENCES trusts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents for their trusts" ON documents
  FOR SELECT USING (trust_id IN (
    SELECT id FROM trusts WHERE attorney_id = auth.uid()
  ));

CREATE POLICY "Users can upload documents to their trusts" ON documents
  FOR INSERT WITH CHECK (trust_id IN (
    SELECT id FROM trusts WHERE attorney_id = auth.uid()
  ));

CREATE POLICY "Users can delete their documents" ON documents
  FOR DELETE USING (trust_id IN (
    SELECT id FROM trusts WHERE attorney_id = auth.uid()
  ));