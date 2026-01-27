import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANNUAL_GIFT_EXCLUSION: Record<number, number> = {
  2023: 17000,
  2024: 18000,
  2025: 19000,
  2026: 19000,
};

const getAnnualExclusion = (year: number): number => {
  return ANNUAL_GIFT_EXCLUSION[year] || ANNUAL_GIFT_EXCLUSION[2024];
};

interface GiftSummaryRow {
  donor_name: string;
  donor_email: string | null;
  beneficiary_name: string;
  trust_name: string;
  tax_year: number;
  total_gifts: number;
  gift_count: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ENDPOINT 1: Get gift tax summary with filters
    if (path.includes('/summary') && req.method === 'GET') {
      const year = url.searchParams.get('year');
      const donor = url.searchParams.get('donor');
      const trustId = url.searchParams.get('trust_id');

      // Build query
      let query = supabase
        .from('gifts')
        .select(`
          donor_name,
          donor_email,
          gift_date,
          amount,
          ilit_id,
          ilits!inner (
            id,
            trust_id,
            trusts!inner (
              id,
              trust_name
            )
          )
        `);

      // Apply filters
      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte('gift_date', startDate).lte('gift_date', endDate);
      }

      if (donor) {
        query = query.ilike('donor_name', `%${donor}%`);
      }

      if (trustId) {
        query = query.eq('ilits.trust_id', trustId);
      }

      const { data: gifts, error } = await query;

      if (error) {
        console.error('Error fetching gifts:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch gifts', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!gifts || gifts.length === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            tax_year: year ? parseInt(year) : new Date().getFullYear(),
            annual_exclusion: getAnnualExclusion(year ? parseInt(year) : new Date().getFullYear()),
            summary: [],
            totals: {
              total_donors: 0,
              total_beneficiaries: 0,
              total_gift_amount: 0,
              gifts_exceeding_exclusion: 0
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Group gifts by donor, beneficiary, trust, and year
      const groupedGifts = new Map<string, GiftSummaryRow>();

      gifts.forEach((gift: any) => {
        const giftYear = new Date(gift.gift_date).getFullYear();
        const trustName = gift.ilits.trusts.trust_name;
        const key = `${gift.donor_name}|${trustName}|${giftYear}`;

        if (groupedGifts.has(key)) {
          const existing = groupedGifts.get(key)!;
          existing.total_gifts += parseFloat(gift.amount);
          existing.gift_count += 1;
        } else {
          groupedGifts.set(key, {
            donor_name: gift.donor_name,
            donor_email: gift.donor_email,
            beneficiary_name: 'N/A',
            trust_name: trustName,
            tax_year: giftYear,
            total_gifts: parseFloat(gift.amount),
            gift_count: 1
          });
        }
      });

      // Calculate annual exclusion status for each group
      const taxYear = year ? parseInt(year) : new Date().getFullYear();
      const annualExclusion = getAnnualExclusion(taxYear);

      const summary = Array.from(groupedGifts.values()).map(row => {
        const exceedsExclusion = row.total_gifts > annualExclusion;
        const excessAmount = exceedsExclusion ? row.total_gifts - annualExclusion : 0;

        return {
          ...row,
          exceeds_exclusion: exceedsExclusion,
          excess_amount: excessAmount
        };
      });

      // Calculate totals
      const uniqueDonors = new Set(summary.map(s => s.donor_name)).size;
      const uniqueBeneficiaries = new Set(summary.map(s => s.beneficiary_name)).size;
      const totalGiftAmount = summary.reduce((sum, s) => sum + s.total_gifts, 0);
      const giftsExceedingExclusion = summary.filter(s => s.exceeds_exclusion).length;

      return new Response(
        JSON.stringify({
          success: true,
          tax_year: taxYear,
          annual_exclusion: annualExclusion,
          summary: summary.sort((a, b) => {
            if (a.donor_name !== b.donor_name) return a.donor_name.localeCompare(b.donor_name);
            return a.beneficiary_name.localeCompare(b.beneficiary_name);
          }),
          totals: {
            total_donors: uniqueDonors,
            total_beneficiaries: uniqueBeneficiaries,
            total_gift_amount: totalGiftAmount,
            gifts_exceeding_exclusion: giftsExceedingExclusion
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ENDPOINT 2: CSV export
    if (path.includes('/export') && req.method === 'GET') {
      const year = url.searchParams.get('year');
      const donor = url.searchParams.get('donor');
      const trustId = url.searchParams.get('trust_id');

      // Build query (same as summary endpoint)
      let query = supabase
        .from('gifts')
        .select(`
          donor_name,
          donor_email,
          gift_date,
          amount,
          ilit_id,
          ilits!inner (
            id,
            trust_id,
            trusts!inner (
              id,
              trust_name
            )
          )
        `);

      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte('gift_date', startDate).lte('gift_date', endDate);
      }

      if (donor) {
        query = query.ilike('donor_name', `%${donor}%`);
      }

      if (trustId) {
        query = query.eq('ilits.trust_id', trustId);
      }

      const { data: gifts, error } = await query;

      if (error) {
        console.error('Error fetching gifts:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch gifts', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!gifts || gifts.length === 0) {
        // Return empty CSV
        const csvHeader = 'Tax Year,Donor Name,Donor Email,Beneficiary,Trust,Total Gifts,Gift Count,Annual Exclusion,Excess Amount,Requires 709\n';
        return new Response(csvHeader, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="gift-tax-summary-${year || 'all'}.csv"`
          }
        });
      }

      // Group gifts (same logic as summary)
      const groupedGifts = new Map<string, GiftSummaryRow>();

      gifts.forEach((gift: any) => {
        const giftYear = new Date(gift.gift_date).getFullYear();
        const trustName = gift.ilits.trusts.trust_name;
        const key = `${gift.donor_name}|${trustName}|${giftYear}`;

        if (groupedGifts.has(key)) {
          const existing = groupedGifts.get(key)!;
          existing.total_gifts += parseFloat(gift.amount);
          existing.gift_count += 1;
        } else {
          groupedGifts.set(key, {
            donor_name: gift.donor_name,
            donor_email: gift.donor_email,
            beneficiary_name: 'N/A',
            trust_name: trustName,
            tax_year: giftYear,
            total_gifts: parseFloat(gift.amount),
            gift_count: 1
          });
        }
      });

      // Build CSV
      const csvHeader = 'Tax Year,Donor Name,Donor Email,Beneficiary,Trust,Total Gifts,Gift Count,Annual Exclusion,Excess Amount,Requires 709\n';

      const csvRows = Array.from(groupedGifts.values()).map(row => {
        const annualExclusion = getAnnualExclusion(row.tax_year);
        const exceedsExclusion = row.total_gifts > annualExclusion;
        const excessAmount = exceedsExclusion ? row.total_gifts - annualExclusion : 0;
        const requires709 = exceedsExclusion ? 'Yes' : 'No';

        return [
          row.tax_year,
          row.donor_name,
          row.donor_email || '',
          row.beneficiary_name,
          row.trust_name,
          row.total_gifts.toFixed(2),
          row.gift_count,
          annualExclusion,
          excessAmount.toFixed(2),
          requires709
        ].join(',');
      });

      const csv = csvHeader + csvRows.join('\n');

      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="gift-tax-summary-${year || 'all'}.csv"`
        }
      });
    }

    // Default response for unknown endpoints
    return new Response(
      JSON.stringify({ error: 'Endpoint not found. Use /summary or /export' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
