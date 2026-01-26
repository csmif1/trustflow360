// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Document type definitions
type DocumentType =
  | 'ILIT'
  | 'POLICY'
  | 'GIFT_LETTER'
  | 'CRUMMEY_NOTICE'
  | 'PREMIUM_NOTICE'
  | 'BENEFICIARY_INFO'
  | 'TRUST_AMENDMENT'
  | 'POLICY_CHANGE'
  | 'BANK_STATEMENT'
  | 'POLICY_STATEMENT'
  | 'BENEFICIARY_ACK'
  | 'OTHER';

interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  reasoning: string;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return encodeBase64(new Uint8Array(buffer));
}

/**
 * STEP 1: Classify document type using Gemini Vision API
 * Uses direct PDF processing without text extraction
 */
async function classifyDocument(pdfBase64: string, apiKey: string): Promise<ClassificationResult> {
  console.log('[STEP 1] Starting document classification...');

  const prompt = `Analyze this PDF document and classify its type with high precision.

DOCUMENT TYPES (choose the BEST match):

1. "ILIT" - Irrevocable Life Insurance Trust Agreement
   - Trust specifically created to own life insurance policies
   - Contains grantor, trustee, beneficiary designations
   - May include Crummey powers and gift provisions
   - Often references life insurance ownership structure

2. "POLICY" - Life Insurance Policy Document
   - Insurance policy contract with policy number
   - Shows carrier/insurance company, insured person
   - Contains death benefit, premiums, cash value
   - Policy owner and beneficiary information

3. "GIFT_LETTER" - Gift Letter/Documentation
   - Formal letter documenting a gift to trust or individual
   - Shows donor, recipient, gift amount and date
   - May reference IRS gift tax rules
   - Purpose is gift documentation, not withdrawal rights

4. "CRUMMEY_NOTICE" - Crummey Withdrawal Rights Notice
   - Notice sent to beneficiaries about withdrawal rights
   - References specific gift amount and trust
   - Includes withdrawal deadline (typically 30 days)
   - Purpose is notifying beneficiaries of Crummey rights

5. "PREMIUM_NOTICE" - Insurance Premium Payment Notice
   - Notice of insurance premium due
   - Shows policy number, amount due, due date
   - From insurance carrier or servicing company

6. "BENEFICIARY_INFO" - Beneficiary Designation Form
   - Form designating or updating beneficiaries
   - Shows beneficiary names, relationships, percentages
   - May be primary or contingent beneficiaries

7. "TRUST_AMENDMENT" - Trust Amendment Document
   - Formal amendment to existing trust
   - References original trust being amended
   - Shows amendment number, date, specific changes

8. "POLICY_CHANGE" - Insurance Policy Change Form
   - Request to change policy details
   - Shows policy number and type of change
   - May be beneficiary change, coverage adjustment, etc.

9. "BANK_STATEMENT" - Bank Account Statement
   - Statement for trust bank account
   - Shows account number, transactions, balance
   - From financial institution

10. "POLICY_STATEMENT" - Insurance Policy Statement
    - Periodic statement from insurance carrier
    - Shows policy values, cash value, death benefit
    - Not a premium notice, but status report

11. "BENEFICIARY_ACK" - Beneficiary Acknowledgment
    - Beneficiary's response to Crummey notice
    - Acknowledges receipt and withdrawal decision
    - May indicate if withdrawal rights exercised

12. "OTHER" - None of the above categories fit
    - Document doesn't clearly match any specific type
    - May be correspondence, forms, or miscellaneous docs

RESPONSE FORMAT (JSON only):
{
  "documentType": "ILIT" | "POLICY" | "GIFT_LETTER" | "CRUMMEY_NOTICE" | "PREMIUM_NOTICE" | "BENEFICIARY_INFO" | "TRUST_AMENDMENT" | "POLICY_CHANGE" | "BANK_STATEMENT" | "POLICY_STATEMENT" | "BENEFICIARY_ACK" | "OTHER",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of classification decision and key identifying features"
}

Analyze the entire PDF document carefully.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: pdfBase64
                }
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API classification error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('[STEP 1] Classification response received');

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const classification = JSON.parse(jsonMatch[0]);
      console.log('[STEP 1] Classification result:', classification);

      return {
        documentType: classification.documentType,
        confidence: classification.confidence,
        reasoning: classification.reasoning
      };
    }

    // Fallback if parsing fails
    console.warn('[STEP 1] Failed to parse classification response');
    return {
      documentType: 'OTHER',
      confidence: 0.0,
      reasoning: 'Failed to parse classification response'
    };
  } catch (error) {
    console.error('[STEP 1] Classification error:', error);
    throw new Error(`Document classification failed: ${error.message}`);
  }
}

/**
 * STEP 2: Get extraction prompt based on document type
 * Returns type-specific extraction instructions
 */
function getExtractionPrompt(documentType: DocumentType): string {
  const prompts: Record<DocumentType, string> = {
    ILIT: `Extract ALL trust information from this Irrevocable Life Insurance Trust document.

REQUIRED FIELDS (use null for any field not found):
{
  "trustName": "full legal name of trust",
  "grantorName": "person creating/funding the trust",
  "trusteeName": "person managing the trust",
  "beneficiaries": ["array", "of", "all", "beneficiaries"],
  "ein": "XX-XXXXXXX format",
  "dateEstablished": "YYYY-MM-DD",
  "jurisdiction": "state where trust established"
}

Return ONLY valid JSON. Be thorough - extract ALL people and dates mentioned.`,

    POLICY: `Extract life insurance policy information from this document.

REQUIRED FIELDS (use null for any field not found):
{
  "policyNumber": "policy number",
  "carrier": "insurance company name",
  "insuredName": "person whose life is insured",
  "deathBenefit": number,
  "annualPremium": number,
  "issueDate": "YYYY-MM-DD",
  "policyOwner": "who owns the policy"
}

Return ONLY valid JSON with all available policy details.`,

    GIFT_LETTER: `Extract gift letter information.

REQUIRED FIELDS (use null for any field not found):
{
  "trustReference": "trust name mentioned",
  "donorName": "person making the gift",
  "giftAmount": number,
  "giftDate": "YYYY-MM-DD",
  "giftType": "cash, securities, property, etc."
}

Return ONLY valid JSON.`,

    CRUMMEY_NOTICE: `Extract Crummey withdrawal rights notice information.

REQUIRED FIELDS (use null for any field not found):
{
  "trustName": "trust name",
  "beneficiaryName": "beneficiary receiving notice",
  "giftAmount": number,
  "withdrawalDeadline": "YYYY-MM-DD",
  "noticeDate": "YYYY-MM-DD"
}

Return ONLY valid JSON. The deadline is critical - typically 30 days from notice.`,

    PREMIUM_NOTICE: `Extract insurance premium payment notice information.

REQUIRED FIELDS (use null for any field not found):
{
  "policyNumber": "policy number",
  "carrier": "insurance company",
  "amountDue": number,
  "dueDate": "YYYY-MM-DD",
  "policyOwner": "policy owner name"
}

Return ONLY valid JSON.`,

    BENEFICIARY_INFO: `Extract beneficiary designation information.

REQUIRED FIELDS (use null for any field not found):
{
  "beneficiaryName": "beneficiary name",
  "relationship": "relationship to insured/grantor",
  "sharePercentage": number (0-100),
  "address": "beneficiary address"
}

Return ONLY valid JSON. Include all beneficiaries if multiple.`,

    TRUST_AMENDMENT: `Extract trust amendment information.

REQUIRED FIELDS (use null for any field not found):
{
  "trustName": "original trust being amended",
  "amendmentNumber": "amendment number or identifier",
  "amendmentDate": "YYYY-MM-DD",
  "changesDescription": "summary of changes made"
}

Return ONLY valid JSON.`,

    POLICY_CHANGE: `Extract insurance policy change request information.

REQUIRED FIELDS (use null for any field not found):
{
  "policyNumber": "policy number",
  "changeType": "beneficiary, coverage, owner, etc.",
  "changeDescription": "description of requested change",
  "effectiveDate": "YYYY-MM-DD"
}

Return ONLY valid JSON.`,

    BANK_STATEMENT: `Extract trust bank account statement information.

REQUIRED FIELDS (use null for any field not found):
{
  "trustName": "trust name on account",
  "accountNumber": "account number (last 4 digits OK)",
  "statementDate": "YYYY-MM-DD",
  "balance": number
}

Return ONLY valid JSON.`,

    POLICY_STATEMENT: `Extract insurance policy statement information.

REQUIRED FIELDS (use null for any field not found):
{
  "policyNumber": "policy number",
  "statementDate": "YYYY-MM-DD",
  "cashValue": number,
  "deathBenefit": number
}

Return ONLY valid JSON.`,

    BENEFICIARY_ACK: `Extract beneficiary acknowledgment information.

REQUIRED FIELDS (use null for any field not found):
{
  "beneficiaryName": "beneficiary acknowledging",
  "crummeyNoticeReference": "reference to original Crummey notice",
  "acknowledgmentDate": "YYYY-MM-DD",
  "withdrawalExercised": boolean (true if withdrew, false if declined)
}

Return ONLY valid JSON.`,

    OTHER: `Extract any identifiable information from this document.

REQUIRED FIELDS (use null for any field not found):
{
  "documentTitle": "title or subject",
  "date": "YYYY-MM-DD",
  "parties": ["involved", "parties"],
  "summary": "brief description of document content"
}

Return ONLY valid JSON.`
  };

  return prompts[documentType] || prompts.OTHER;
}

/**
 * STEP 2: Extract structured data using Gemini Vision API
 * Uses type-specific prompts based on classification
 */
async function extractStructuredData(
  pdfBase64: string,
  documentType: DocumentType,
  apiKey: string
): Promise<Record<string, any>> {
  console.log(`[STEP 2] Starting field extraction for type: ${documentType}`);

  const prompt = getExtractionPrompt(documentType);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: pdfBase64
                }
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API extraction error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('[STEP 2] Extraction response received');

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extractedData = JSON.parse(jsonMatch[0]);
      console.log('[STEP 2] Extracted fields:', Object.keys(extractedData));
      return extractedData;
    }

    console.warn('[STEP 2] Failed to parse extraction response');
    return {};
  } catch (error) {
    console.error('[STEP 2] Extraction error:', error);
    throw new Error(`Field extraction failed: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('=== DOCUMENT PROCESSING REQUEST STARTED ===');

    // Validate Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }
    console.log('✓ Gemini API key validated');

    // Parse multipart/form-data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('✗ No file provided in request');
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      console.error('✗ Invalid file type:', file.type);
      return new Response(
        JSON.stringify({ error: 'Only PDF files are supported' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✓ File received:', file.name, `(${file.size} bytes)`);

    // Convert PDF to base64 for Gemini Vision API
    const arrayBuffer = await file.arrayBuffer();
    const pdfBase64 = arrayBufferToBase64(arrayBuffer);
    console.log('✓ PDF converted to base64');

    // STEP 1: Classify document type
    console.log('\n--- STEP 1: CLASSIFICATION ---');
    const classification = await classifyDocument(pdfBase64, geminiApiKey);
    console.log(`✓ Classification complete: ${classification.documentType} (confidence: ${classification.confidence})`);
    console.log(`  Reasoning: ${classification.reasoning}`);

    // STEP 2: Extract structured data based on classification
    console.log('\n--- STEP 2: EXTRACTION ---');
    const extractedData = await extractStructuredData(
      pdfBase64,
      classification.documentType,
      geminiApiKey
    );
    console.log('✓ Extraction complete');

    const processingTime = Date.now() - startTime;
    console.log(`\n=== PROCESSING COMPLETE (${processingTime}ms) ===\n`);

    // Return agentic response
    return new Response(
      JSON.stringify({
        documentType: classification.documentType,
        extractedData,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        processingTimeMs: processingTime
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('\n=== PROCESSING FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack,
        processingTimeMs: processingTime
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-document' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: multipart/form-data' \
    --form 'file=@/path/to/document.pdf'

*/
