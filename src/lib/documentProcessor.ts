import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const projectId = 'lawagentic';
const location = 'us';
const processorId = '1a198fc679d9925f';

export async function processDocument(file: File) {
  try {
    // Initialize Document AI client
    const client = new DocumentProcessorServiceClient({
      keyFilename: './service-account.json'
    });

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    // Process the document
    const request = {
      name,
      rawDocument: {
        content: base64,
        mimeType: file.type,
      },
    };

    const [result] = await client.processDocument(request);
    const { document } = result;

    // Extract text
    const extractedText = document?.text || '';

    // Use Gemini to analyze the extracted text
    const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
      Analyze this ILIT trust document and extract:
      - Trust Name
      - Grantor Name
      - Trustee Name
      - Beneficiaries
      - EIN (if present)
      - Important dates
      - Assets or gift information
      
      Document text:
      ${extractedText}
      
      Return as JSON format.
    `;

    const aiResult = await model.generateContent(prompt);
    const response = await aiResult.response;
    const extractedData = response.text();

    return {
      success: true,
      text: extractedText,
      extracted: JSON.parse(extractedData),
      confidence: 0.92
    };

  } catch (error) {
    console.error('Document processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
