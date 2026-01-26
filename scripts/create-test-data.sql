-- Test Data Creation Script for TrustFlow360
-- Run this with: npx supabase db execute -f scripts/create-test-data.sql
-- Or paste into Supabase SQL Editor

-- First, get or create a test user (you'll need to be logged in)
-- This script assumes you're running it as an authenticated user

DO $$
DECLARE
    v_user_id UUID;
    v_trust_id UUID;
    v_policy_id UUID;
    v_ben1_id UUID;
    v_ben2_id UUID;
BEGIN
    -- Get current user ID (will fail if not authenticated)
    -- If running via SQL editor while logged in, this will use your user
    -- Otherwise, you'll need to replace this with a specific user_id
    SELECT auth.uid() INTO v_user_id;

    -- If no user found, use a default test user ID
    -- You should replace this with your actual user ID
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user found. Please log in or set v_user_id manually.';
    END IF;

    RAISE NOTICE 'Using user_id: %', v_user_id;

    -- 1. Create Test Trust
    INSERT INTO trusts (
        user_id,
        trust_name,
        grantor_name,
        grantor_email,
        trustee_name,
        trust_type,
        status,
        created_at
    ) VALUES (
        v_user_id,
        'Test Family ILIT',
        'Robert Test',
        'chris@ssgrowthadvisors.com',
        'Professional Trustee Services LLC',
        'ILIT',
        'active',
        NOW()
    ) RETURNING id INTO v_trust_id;

    RAISE NOTICE 'Created trust_id: %', v_trust_id;

    -- 2. Create Beneficiaries
    INSERT INTO beneficiaries (
        trust_id,
        name,
        relationship,
        email,
        created_at
    ) VALUES (
        v_trust_id,
        'John Test',
        'Child',
        'john.test@example.com',
        NOW()
    ) RETURNING id INTO v_ben1_id;

    RAISE NOTICE 'Created beneficiary 1 (John Test): %', v_ben1_id;

    INSERT INTO beneficiaries (
        trust_id,
        name,
        relationship,
        email,
        created_at
    ) VALUES (
        v_trust_id,
        'Jane Test',
        'Child',
        'jane.test@example.com',
        NOW()
    ) RETURNING id INTO v_ben2_id;

    RAISE NOTICE 'Created beneficiary 2 (Jane Test): %', v_ben2_id;

    -- 3. Create Test Policy (due in 45 days)
    INSERT INTO insurance_policies (
        user_id,
        trust_id,
        policy_number,
        carrier_name,
        death_benefit,
        annual_premium,
        premium_due_date,
        next_premium_due,
        policy_status,
        created_at
    ) VALUES (
        v_user_id,
        v_trust_id,
        'TEST-POL-' || FLOOR(RANDOM() * 1000000)::TEXT,
        'Test Insurance Company',
        500000,
        2000,
        (CURRENT_DATE + INTERVAL '45 days')::DATE,
        (CURRENT_DATE + INTERVAL '45 days')::DATE,
        'active',
        NOW()
    ) RETURNING id INTO v_policy_id;

    RAISE NOTICE 'Created policy_id: %', v_policy_id;

    -- Output summary
    RAISE NOTICE '=== TEST DATA CREATED SUCCESSFULLY ===';
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Trust ID: %', v_trust_id;
    RAISE NOTICE 'Policy ID: %', v_policy_id;
    RAISE NOTICE 'Beneficiary 1 (John Test): %', v_ben1_id;
    RAISE NOTICE 'Beneficiary 2 (Jane Test): %', v_ben2_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Trust: Test Family ILIT';
    RAISE NOTICE 'Grantor: Robert Test (chris@ssgrowthadvisors.com)';
    RAISE NOTICE 'Policy: $500,000 death benefit, $2,000 annual premium';
    RAISE NOTICE 'Premium due: % (45 days from now)', (CURRENT_DATE + INTERVAL '45 days')::DATE;
    RAISE NOTICE '======================================';

END $$;
