import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.mjs';

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/standard_fonts/'
  }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText;
}

async function extractTextFromDOCX(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function classifyDocument(text: string, model: any) {
  const prompt = `Analyze this document and classify its type.

Document types (choose ONE):
- "ILIT": Irrevocable Life Insurance Trust agreement - a trust specifically created to own and be the beneficiary of life insurance policies, removing them from the grantor's taxable estate
- "POLICY": Insurance policy document - life insurance, term insurance, or other insurance policy contracts with premiums, death benefits, and policy terms
- "GIFT_LETTER": Gift documentation - letters or agreements documenting monetary or asset gifts to trusts or individuals, including gift amounts, dates, and parties involved
- "UNKNOWN": Document does not clearly fit into ILIT, POLICY, or GIFT_LETTER categories

Provide your analysis in JSON format:
{
  "documentType": "ILIT" | "POLICY" | "GIFT_LETTER" | "UNKNOWN",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why you classified it this way"
}

Document text (first 3000 characters):
${text.substring(0, 3000)}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const responseText = response.text();

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const classification = JSON.parse(jsonMatch[0]);
    return {
      documentType: classification.documentType,
      confidence: classification.confidence,
      reasoning: classification.reasoning
    };
  }

  // Fallback if parsing fails
  return {
    documentType: "UNKNOWN",
    confidence: 0.0,
    reasoning: "Failed to parse classification response"
  };
}

function getILITPrompt(text: string): string {
  return `Extract ALL information from this trust document:

FIND THESE PEOPLE:
- Grantor/Settlor (person creating trust)
- Trustee (person managing trust - different from grantor)
- Beneficiaries (all of them)

FIND THESE AMOUNTS:
- Initial seed gift
- Annual gift amounts
- Gift schedule by year

Return complete JSON with ALL fields (use null if not found):
{
  "trustName": "full trust name",
  "grantorName": "grantor name",
  "trusteeName": "trustee name",
  "beneficiaries": ["all", "beneficiaries"],
  "ein": "XX-XXXXXXX",
  "dateEstablished": "YYYY-MM-DD",
  "donorName": "donor name",
  "giftAmount": "amount",
  "giftDate": "YYYY-MM-DD",
  "giftType": "type",
  "initialSeedGift": "initial amount",
  "annualGiftAmount": "annual amount",
  "giftSchedule": [{"year": "YYYY", "amount": "XXXXX"}]
}

Document text:
${text}`;
}

function getPolicyPrompt(text: string): string {
  return `Extract life insurance policy information from this document.

Required fields:
{
  "policyNumber": "policy number",
  "carrier": "insurance company name",
  "insuredName": "person whose life is insured",
  "deathBenefit": number,
  "annualPremium": number,
  "premiumDueDate": "YYYY-MM-DD",
  "policyOwner": "who owns the policy",
  "cashValue": number or null
}

Return JSON only, use null for fields not found.

Document text:
${text}`;
}

function getGiftLetterPrompt(text: string): string {
  return `Extract Crummey notice / gift letter information.

Required fields:
{
  "trustReference": "trust name mentioned",
  "giftDate": "YYYY-MM-DD",
  "totalGiftAmount": number,
  "beneficiaryShares": [{"name": "...", "amount": number}],
  "withdrawalDeadline": "YYYY-MM-DD",
  "purpose": "reason for gift"
}

Return JSON only, use null for fields not found.

Document text:
${text}`;
}

export async function processDocumentInBrowser(file: File) {
  try {
    console.log('Processing file:', file.name);
    let text = '';
    
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      text = await extractTextFromPDF(file);
    } else if (file.name.endsWith('.docx')) {
      text = await extractTextFromDOCX(file);
    } else {
      throw new Error('Only PDF and DOCX files supported');
    }
    
    // Log first 2000 chars to see what we're getting
    console.log('EXTRACTED TEXT PREVIEW:', text.substring(0, 2000));
    
    // Check if key people are in the text
    console.log('Contains Seth Ellis?', text.includes('Seth Ellis'));
    console.log('Contains Jack Johnson?', text.includes('Jack Johnson'));
    console.log('Contains $25,000?', text.includes('25,000'));
    
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // Classify document first
    const classification = await classifyDocument(text, model);
    console.log('DOCUMENT CLASSIFIED AS:', classification.documentType);
    console.log('Classification confidence:', classification.confidence);
    console.log('Classification reasoning:', classification.reasoning);
    
    // Use appropriate prompt based on document type
    let prompt;
    if (classification.documentType === 'POLICY') {
      prompt = getPolicyPrompt(text);
    } else if (classification.documentType === 'GIFT_LETTER') {
      prompt = getGiftLetterPrompt(text);
    } else {
      prompt = getILITPrompt(text);
    }
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Log the full response to see what Gemini found
    console.log('GEMINI FULL RESPONSE:', responseText);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    // Log what we extracted
    console.log('EXTRACTED DATA:', extracted);
    
    return {
      success: true,
      documentType: classification.documentType,
      extracted: extracted,
      confidence: classification.confidence
    };
    
  } catch (error) {
    console.error('Processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}