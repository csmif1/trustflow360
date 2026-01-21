import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Extract ALL information from this trust document:

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
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    // Log the full response to see what Gemini found
    console.log('GEMINI FULL RESPONSE:', responseText);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    // Log what we extracted
    console.log('EXTRACTED DATA:', extracted);
    console.log('Trustee found:', extracted.trusteeName);
    console.log('Beneficiaries found:', extracted.beneficiaries);
    console.log('Initial seed gift found:', extracted.initialSeedGift);
    
    return {
      success: true,
      extracted: extracted,
      confidence: 0.95
    };
    
  } catch (error) {
    console.error('Processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
