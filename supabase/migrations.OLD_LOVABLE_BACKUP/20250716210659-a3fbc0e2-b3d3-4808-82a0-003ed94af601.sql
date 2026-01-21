-- Update RLS policies to allow anonymous access for development
-- In production, you should implement proper authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.trusts;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.trust_documents;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.insurance_policies;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.beneficiaries;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.contributions;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.premium_payments;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.tax_filings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.workflow_tasks;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.communications;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.annual_reports;

-- Create new policies that allow anonymous access for development
CREATE POLICY "Allow all operations" ON public.trusts
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.trust_documents
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.insurance_policies
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.beneficiaries
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.contributions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.premium_payments
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.tax_filings
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.workflow_tasks
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.communications
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations" ON public.annual_reports
    FOR ALL USING (true) WITH CHECK (true);