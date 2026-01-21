#!/bin/bash

# Find the line number where mock data starts
LINE_NUM=$(grep -n "Simulated AI extraction results" src/pages/attorney/DocumentUpload.tsx | cut -d: -f1)

if [ -z "$LINE_NUM" ]; then
  echo "Mock data section not found"
  exit 1
fi

# Calculate line numbers for replacement
START=$((LINE_NUM - 2))
END=$((LINE_NUM + 10))

# Create the new processing code
cat > /tmp/new-processing.txt << 'PROCESSING'
      // Step 2: Real AI Processing with Gemini
      setProcessingStatus(prev => ({ ...prev, ai: 'processing' }));
      
      try {
        const { processDocumentInBrowser } = await import('@/lib/browserDocumentProcessor');
        const result = await processDocumentInBrowser(file);
        
        if (result.success && result.extracted) {
          const extracted: ExtractedData = {
            trustName: result.extracted.trustName || 'Unknown Trust',
            ein: result.extracted.ein || '',
            donorName: result.extracted.grantorName || '',
            giftAmount: parseFloat(result.extracted.giftAmount) || 0,
            giftDate: result.extracted.dateEstablished || new Date().toISOString().split('T')[0],
            giftType: result.extracted.giftType || 'cash',
            confidence: result.confidence || 0.85
          };
          setExtractedData(extracted);
        } else {
          throw new Error(result.error || 'Failed to extract data');
        }
      } catch (aiError) {
        console.error('AI processing error:', aiError);
        // Fall back to empty form for manual entry
        setExtractedData({
          trustName: '',
          ein: '',
          donorName: '',
          giftAmount: 0,
          giftDate: new Date().toISOString().split('T')[0],
          giftType: 'cash',
          confidence: 0
        });
      }
PROCESSING

echo "Updating DocumentUpload.tsx to use real AI processing..."
head -n $START src/pages/attorney/DocumentUpload.tsx > /tmp/updated.tsx
cat /tmp/new-processing.txt >> /tmp/updated.tsx
tail -n +$END src/pages/attorney/DocumentUpload.tsx >> /tmp/updated.tsx
mv /tmp/updated.tsx src/pages/attorney/DocumentUpload.tsx

echo "Update complete!"
