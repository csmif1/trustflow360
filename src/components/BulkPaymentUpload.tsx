import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';

interface PaymentRow {
  policy_number: string;
  amount: string;
  payment_date: string;
  payment_method: string;
  check_number?: string;
  notes?: string;
}

interface ValidationError {
  row: number;
  errors: string[];
}

export default function BulkPaymentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<PaymentRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadResults, setUploadResults] = useState<{success: number; failed: number} | null>(null);

  const downloadTemplate = () => {
    const template = `policy_number,amount,payment_date,payment_method,check_number,notes
NM-2025-001,4000,2025-08-01,check,5678,Monthly premium payment
NM-2025-001,4000,2025-09-01,ach,,Automated payment
NM-2025-001,4000,2025-10-01,wire,,Q4 premium`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_payment_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setParsedData([]);
      setValidationErrors([]);
      setUploadResults(null);
    } else {
      alert('Please select a CSV file');
    }
  };

  const validateRow = (row: PaymentRow, index: number): string[] => {
    const errors: string[] = [];
    
    if (!row.policy_number) errors.push('Policy number is required');
    if (!row.amount || isNaN(parseFloat(row.amount))) errors.push('Valid amount is required');
    if (!row.payment_date) errors.push('Payment date is required');
    if (!row.payment_method) errors.push('Payment method is required');
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (row.payment_date && !dateRegex.test(row.payment_date)) {
      errors.push('Date must be in YYYY-MM-DD format');
    }
    
    // Validate payment method
    const validMethods = ['check', 'ach', 'wire', 'cash'];
    if (row.payment_method && !validMethods.includes(row.payment_method.toLowerCase())) {
      errors.push('Payment method must be: check, ach, wire, or cash');
    }
    
    return errors;
  };

  const parseFile = () => {
    if (!file) return;
    
    setParsing(true);
    setValidationErrors([]);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as PaymentRow[];
        const errors: ValidationError[] = [];
        
        // Validate each row
        data.forEach((row, index) => {
          const rowErrors = validateRow(row, index);
          if (rowErrors.length > 0) {
            errors.push({ row: index + 2, errors: rowErrors }); // +2 for header and 0-index
          }
        });
        
        setParsedData(data);
        setValidationErrors(errors);
        setParsing(false);
      },
      error: (error) => {
        console.error('Parse error:', error);
        setParsing(false);
        alert('Error parsing CSV file');
      }
    });
  };

  const uploadPayments = async () => {
    if (validationErrors.length > 0) {
      alert('Please fix validation errors before uploading');
      return;
    }
    
    setUploading(true);
    let successCount = 0;
    let failedCount = 0;
    
    for (const row of parsedData) {
      try {
        // First, get the policy ID from policy number
        const { data: policy } = await supabase
          .from('insurance_policies')
          .select('id')
          .eq('policy_number', row.policy_number)
          .single();
        
        if (!policy) {
          failedCount++;
          continue;
        }
        
        // Insert the payment
        const { error } = await supabase
          .from('premium_payments')
          .insert({
            policy_id: policy.id,
            amount: parseFloat(row.amount),
            payment_date: row.payment_date,
            due_date: row.payment_date, // Using payment date as due date
            payment_method: row.payment_method.toLowerCase(),
            check_number: row.check_number || null,
            notes: row.notes || null,
            payment_status: 'completed'
          });
        
        if (error) {
          failedCount++;
          console.error('Insert error:', error);
        } else {
          successCount++;
        }
      } catch (err) {
        failedCount++;
        console.error('Error processing row:', err);
      }
    }
    
    setUploadResults({ success: successCount, failed: failedCount });
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Payment Upload
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload multiple premium payments at once using a CSV file
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Download Template */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                First time? Download our CSV template
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm">{file.name}</span>
              <Button onClick={parseFile} disabled={parsing}>
                {parsing ? 'Parsing...' : 'Parse File'}
              </Button>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Validation Errors:</p>
                {validationErrors.map((error, idx) => (
                  <div key={idx} className="mb-2">
                    <p className="font-medium">Row {error.row}:</p>
                    <ul className="list-disc list-inside text-sm">
                      {error.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && validationErrors.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Ready to upload {parsedData.length} payments
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Results */}
          {uploadResults && (
            <Alert variant={uploadResults.failed > 0 ? "destructive" : "default"}>
              <AlertDescription>
                Upload complete: {uploadResults.success} succeeded, {uploadResults.failed} failed
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          {parsedData.length > 0 && validationErrors.length === 0 && !uploadResults && (
            <Button 
              onClick={uploadPayments} 
              disabled={uploading}
              className="w-full"
            >
              {uploading ? 'Uploading...' : `Upload ${parsedData.length} Payments`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Format Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Your CSV file must include these columns:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>policy_number</strong>: The insurance policy number</li>
            <li><strong>amount</strong>: Payment amount (numbers only, no $ symbol)</li>
            <li><strong>payment_date</strong>: Date in YYYY-MM-DD format</li>
            <li><strong>payment_method</strong>: check, ach, wire, or cash</li>
            <li><strong>check_number</strong>: (Optional) Check number if applicable</li>
            <li><strong>notes</strong>: (Optional) Additional notes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}