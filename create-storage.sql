-- Create storage bucket for trust documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('trust-documents', 'trust-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
CREATE POLICY "Users can upload their own trust documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'trust-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own trust documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'trust-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own trust documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'trust-documents' AND auth.uid() IS NOT NULL);