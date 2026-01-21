import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { documentIntakeFunction } from '@/inngest/functions/document-intake';

// Create an API route that serves your Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    documentIntakeFunction,
  ],
});
