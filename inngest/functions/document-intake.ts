import { inngest } from '../client';

// Event payload type
interface DocumentUploadedEvent {
  name: 'document/uploaded';
  data: {
    documentUrl: string;
    userId: string;
    documentType: string;
  };
}

// Extracted data structure
interface ExtractedData {
  title: string;
  content: string;
  metadata: {
    pageCount: number;
    fileSize: string;
    extractedAt: string;
  };
  fields: Record<string, any>;
}

// Function return type
interface DocumentIntakeResult {
  success: boolean;
  confidence: number;
  action: 'auto-processed' | 'flagged-for-review';
  extractedData: ExtractedData;
}

export const documentIntakeFunction = inngest.createFunction(
  {
    id: 'document-intake',
    name: 'Process Document Upload',
  },
  { event: 'document/uploaded' },
  async ({ event, step }): Promise<DocumentIntakeResult> => {
    const { documentUrl, userId, documentType } = event.data;

    // Step 1: Extract data from document (mocked for now)
    const extractedData = await step.run('extract-document-data', async () => {
      // Mock extraction with random processing time
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

      const data: ExtractedData = {
        title: `${documentType} - ${new Date().toISOString()}`,
        content: `Extracted content from ${documentUrl}`,
        metadata: {
          pageCount: Math.floor(Math.random() * 20) + 1,
          fileSize: `${(Math.random() * 10 + 1).toFixed(2)} MB`,
          extractedAt: new Date().toISOString(),
        },
        fields: {
          documentType,
          url: documentUrl,
          userId,
          extractedText: 'Sample extracted text content...',
          entities: ['Entity 1', 'Entity 2', 'Entity 3'],
        },
      };

      return data;
    });

    // Step 2: Calculate confidence score (random between 0.80-0.99)
    const confidence = await step.run('calculate-confidence', async () => {
      const score = 0.8 + Math.random() * 0.19; // 0.80 to 0.99
      return Number(score.toFixed(2));
    });

    // Step 3: Process based on confidence score
    if (confidence > 0.9) {
      // Auto-process and update database
      await step.run('auto-process-document', async () => {
        console.log(`Auto-processing document for user ${userId} with confidence ${confidence}`);

        // TODO: Add actual database update logic here
        // Example: await db.documents.create({ userId, data: extractedData, confidence })

        return {
          processed: true,
          timestamp: new Date().toISOString(),
        };
      });

      return {
        success: true,
        confidence,
        action: 'auto-processed',
        extractedData,
      };
    } else {
      // Flag for attorney review
      await step.run('flag-for-review', async () => {
        console.log(`Flagging document for attorney review - user ${userId}, confidence ${confidence}`);

        // TODO: Add actual flagging logic here
        // Example: await db.reviewQueue.create({ userId, documentUrl, confidence, extractedData })

        return {
          flagged: true,
          reason: 'Low confidence score',
          timestamp: new Date().toISOString(),
        };
      });

      return {
        success: true,
        confidence,
        action: 'flagged-for-review',
        extractedData,
      };
    }
  }
);
