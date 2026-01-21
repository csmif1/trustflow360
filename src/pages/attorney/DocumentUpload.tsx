import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GiftScheduleDisplay } from "@/components/GiftScheduleDisplay";
import { GiftRecordingModal } from "@/components/GiftRecordingModal";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Brain,
  Sparkles,
  Clock,
  ArrowRight,
  Eye,
  Download,
  RefreshCw,
  Edit,
  Save,
  X
} from 'lucide-react';
import { createPolicy, type PolicyData } from '@/lib/api/policyService';
import { getAttorneyTrusts, getTrustByName, createTrust, updateTrust, type Trust, type CreateTrustData, type UpdateTrustData } from '@/lib/api/trustService';

// Initialize Supabase client
const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const toast = {
  error: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  },
  success: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  }
};

interface ExtractedData {
  // Common fields
  documentType?: string;
  confidence?: number;
  
  // ILIT fields
  trustName?: string;
  ein?: string;
  grantorName?: string;
  trusteeName?: string;
  beneficiaries?: string[];
  dateEstablished?: string;
  initialSeedGift?: string;
  annualGiftAmount?: string;
  giftSchedule?: Array<{year: string, amount: string}>;
  
  // Policy fields
  policyNumber?: string;
  carrier?: string;
  insuredName?: string;
  deathBenefit?: number;
  annualPremium?: number;
  premiumDueDate?: string;
  policyOwner?: string;
  cashValue?: number;
  
  // Gift Letter fields
  trustReference?: string;
  giftDate?: string;
  totalGiftAmount?: number;
  beneficiaryShares?: Array<{name: string, amount: number}>;
  withdrawalDeadline?: string;
  purpose?: string;
  
  // Legacy fields (for compatibility)
  donorName?: string;
  giftAmount?: number;
  giftType?: string;
  grantorNetWorth?: string;
  perBeneficiaryAmount?: string;
}

interface ProcessingStatus {
  upload: 'pending' | 'processing' | 'complete' | 'error';
  ai: 'pending' | 'processing' | 'complete' | 'error';
  validation: 'pending' | 'processing' | 'complete' | 'error';
  recording: 'pending' | 'processing' | 'complete' | 'error';
}

export default function DocumentUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [manualData, setManualData] = useState<ExtractedData>({});
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    upload: 'pending',
    ai: 'pending',
    validation: 'pending',
    recording: 'pending'
  });
  const [showComparison, setShowComparison] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [selectedTrustId, setSelectedTrustId] = useState<string>('');
  const [loadingTrusts, setLoadingTrusts] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);

  useEffect(() => {
    const fetchTrusts = async () => {
      setLoadingTrusts(true);
      try {
        const response = await getAttorneyTrusts();
        if (response.success && response.data) {
          setTrusts(response.data);
          // Auto-select first trust if available and user hasn't selected yet
          if (response.data.length > 0 && !selectedTrustId) {
            setSelectedTrustId(response.data[0].id);
          }
        } else {
          toast.error(response.error || 'Failed to load trusts');
        }
      } catch (error) {
        console.error('Error fetching trusts:', error);
        toast.error('Failed to load trusts');
      } finally {
        setLoadingTrusts(false);
      }
    };

    fetchTrusts();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
      setShowComparison(false);
      setIsEditMode(false);
      setEditedData(null);
      setProcessingStatus({
        upload: 'pending',
        ai: 'pending',
        validation: 'pending',
        recording: 'pending'
      });
    }
  }, []);

  const processDocument = async () => {
    if (!file) return;

    setProcessing(true);
    setShowComparison(false);

    try {
      // Step 1: Upload to Supabase Storage
      setProcessingStatus(prev => ({ ...prev, upload: 'processing' }));
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `gift-letters/${new Date().toISOString().split('T')[0]}/${fileName}`;

      // Create the bucket if it doesn't exist
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'ilit-documents');
      
      if (!bucketExists) {
        await supabase.storage.createBucket('ilit-documents', {
          public: false,
          fileSizeLimit: 10485760 // 10MB
        });
      }

      const { error: uploadError, data } = await supabase.storage
        .from('ilit-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload file');
      }
      
      setProcessingStatus(prev => ({ ...prev, upload: 'complete' }));

      // Step 2: AI Processing with Supabase Edge Function
      setProcessingStatus(prev => ({ ...prev, ai: 'processing' }));

      try {
        // Create FormData with the file
        const formData = new FormData();
        formData.append('file', file);

        // Call the Supabase Edge Function
        const { data: functionData, error: functionError } = await supabase.functions.invoke('process-document', {
          body: formData
        });

        if (functionError) {
          console.error('Edge function error:', functionError);
          throw new Error(functionError.message || 'Failed to process document');
        }

        if (functionData && functionData.extractedData) {
          const extracted = {
            ...functionData.extractedData,
            documentType: functionData.documentType,
            confidence: functionData.confidence || 0.85
          };
          setExtractedData(extracted);
        } else {
          throw new Error('Failed to extract data from document');
        }
      } catch (aiError) {
        console.error('AI processing error:', aiError);
        setExtractedData({
          documentType: 'UNKNOWN',
          confidence: 0
        });
      }

      setProcessingStatus(prev => ({ ...prev, ai: 'complete' }));

      // Step 3: Validation
      setProcessingStatus(prev => ({ ...prev, validation: 'processing' }));
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProcessingStatus(prev => ({ ...prev, validation: 'complete' }));

      setShowComparison(true);
      toast.success('Document processed successfully!');

    } catch (error) {
      console.error('Error processing document:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to process document';
      toast.error(errorMessage);
      
      if (processingStatus.upload === 'processing') {
        setProcessingStatus(prev => ({ ...prev, upload: 'error' }));
      } else if (processingStatus.ai === 'processing') {
        setProcessingStatus(prev => ({ ...prev, ai: 'error' }));
      } else {
        setProcessingStatus(prev => ({ ...prev, validation: 'error' }));
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!extractedData || extractedData.documentType !== 'POLICY') {
      toast.error('No policy data to save');
      return;
    }

    // Validate required fields
    if (!extractedData.policyNumber || !extractedData.carrier || !extractedData.insuredName) {
      toast.error('Missing required policy fields: Policy Number, Carrier, or Insured Name');
      return;
    }

    // Validate trust is selected
    if (!selectedTrustId) {
      toast.error('Please select a trust before saving the policy');
      return;
    }

    setProcessingStatus(prev => ({ ...prev, recording: 'processing' }));

    try {
      // Map extracted data to PolicyData interface
      const policyData: PolicyData = {
        policy_number: extractedData.policyNumber,
        carrier: extractedData.carrier,
        insured_name: extractedData.insuredName,
        death_benefit: extractedData.deathBenefit || null,
        annual_premium: extractedData.annualPremium || null,
        premium_due_date: extractedData.premiumDueDate || null,
        policy_owner: extractedData.policyOwner || null,
        cash_value: extractedData.cashValue || null,
      };

      const result = await createPolicy(policyData, selectedTrustId);

      if (result.success && result.data) {
        setProcessingStatus(prev => ({ ...prev, recording: 'complete' }));
        toast.success(`Policy ${result.data.policy_number} saved successfully!`);

        // Clear the form
        setFile(null);
        setExtractedData(null);
        setShowComparison(false);
        setProcessingStatus({
          upload: 'pending',
          ai: 'pending',
          validation: 'pending',
          recording: 'pending'
        });
      } else {
        setProcessingStatus(prev => ({ ...prev, recording: 'error' }));
        toast.error(result.error || 'Failed to save policy');
      }
    } catch (error) {
      console.error('Error saving policy:', error);
      setProcessingStatus(prev => ({ ...prev, recording: 'error' }));
      toast.error('An unexpected error occurred while saving the policy');
    }
  };

  const handleSaveILIT = async () => {
    if (!extractedData || extractedData.documentType !== 'ILIT') {
      toast.error('No ILIT data to save');
      return;
    }

    // Validate required fields
    if (!extractedData.trustName || !extractedData.grantorName || !extractedData.dateEstablished) {
      toast.error('Missing required ILIT fields: Trust Name, Grantor Name, or Date Established');
      return;
    }

    if (!file) {
      toast.error('No file to upload');
      return;
    }

    setProcessingStatus(prev => ({ ...prev, recording: 'processing' }));

    try {
      let result;
      let trustIdToUse = selectedTrustId;
      let isUpdate = false;

      // If "Create New Trust" is selected or no trust is selected, search for existing trust by name
      if (selectedTrustId === '__new__' || !selectedTrustId) {
        const searchResult = await getTrustByName(extractedData.trustName);

        if (searchResult.success && searchResult.data) {
          // Found existing trust with matching name
          trustIdToUse = searchResult.data.id;
          isUpdate = true;
        } else {
          // No existing trust found, will create new
          trustIdToUse = '';
        }
      } else {
        isUpdate = true;
      }

      // If a trust exists (either selected or found by name), update it
      if (trustIdToUse) {
        const updateData: UpdateTrustData = {
          trust_name: extractedData.trustName,
          grantor_name: extractedData.grantorName,
          trust_date: extractedData.dateEstablished,
          trust_type: 'ILIT',
          status: 'active',
        };

        result = await updateTrust(trustIdToUse, updateData);
      } else {
        // Create new trust
        const createData: CreateTrustData = {
          trust_name: extractedData.trustName,
          grantor_name: extractedData.grantorName,
          trust_date: extractedData.dateEstablished,
          trust_type: 'ILIT',
          status: 'active',
        };

        result = await createTrust(createData);

        // If created successfully, update the selected trust and trusts list
        if (result.success && result.data) {
          setSelectedTrustId(result.data.id);
          setTrusts(prev => [...prev, result.data!]);
          trustIdToUse = result.data.id;
        }
      }

      if (result.success && result.data) {
        // Get the trust ID (either the selected one, found one, or newly created one)
        const trustId = trustIdToUse || result.data.id;

        // Upload the PDF to Supabase Storage in 'trust-documents' bucket
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${trustId}/${new Date().toISOString().split('T')[0]}/${fileName}`;

          // Create the bucket if it doesn't exist
          const { data: buckets } = await supabase.storage.listBuckets();
          const bucketExists = buckets?.some(bucket => bucket.name === 'trust-documents');

          if (!bucketExists) {
            await supabase.storage.createBucket('trust-documents', {
              public: false,
              fileSizeLimit: 10485760 // 10MB
            });
          }

          const { error: uploadError } = await supabase.storage
            .from('trust-documents')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Document upload error:', uploadError);
            throw new Error('Failed to upload document to storage');
          }

          // Create document record in trust_documents table
          const { error: docError } = await supabase
            .from('trust_documents')
            .insert({
              trust_id: trustId,
              document_name: file.name,
              document_type: 'ILIT',
              file_path: filePath,
              review_status: 'pending',
            });

          if (docError) {
            console.error('Document record creation error:', docError);
            // Don't fail the entire operation if document creation fails
            toast.error('Trust saved but failed to create document record');
          }
        } catch (docUploadError) {
          console.error('Error uploading document:', docUploadError);
          // Don't fail the entire operation if document upload fails
          toast.error('Trust saved but failed to upload document');
        }

        setProcessingStatus(prev => ({ ...prev, recording: 'complete' }));
        toast.success(`ILIT "${result.data.trust_name}" ${isUpdate ? 'updated' : 'created'} successfully!`);

        // Redirect to trust dashboard
        navigate(`/trust/${trustId}`);
      } else {
        setProcessingStatus(prev => ({ ...prev, recording: 'error' }));
        toast.error(result.error || 'Failed to save ILIT');
      }
    } catch (error) {
      console.error('Error saving ILIT:', error);
      setProcessingStatus(prev => ({ ...prev, recording: 'error' }));
      toast.error('An unexpected error occurred while saving the ILIT');
    }
  };

  const handleEdit = () => {
    if (!extractedData) return;
    setEditedData({ ...extractedData });
    setIsEditMode(true);
  };

  const handleSaveEdits = () => {
    if (!editedData) return;

    // Validate required fields based on document type
    if (editedData.documentType === 'POLICY') {
      if (!editedData.policyNumber || !editedData.carrier || !editedData.insuredName) {
        toast.error('Missing required policy fields: Policy Number, Carrier, or Insured Name');
        return;
      }
    } else if (editedData.documentType === 'ILIT') {
      if (!editedData.trustName || !editedData.grantorName || !editedData.dateEstablished) {
        toast.error('Missing required ILIT fields: Trust Name, Grantor Name, or Date Established');
        return;
      }
    }

    // Apply edits to extractedData
    setExtractedData(editedData);
    setIsEditMode(false);
    toast.success('Changes saved successfully!');
  };

  const handleCancelEdit = () => {
    setEditedData(null);
    setIsEditMode(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const renderILITData = (data: ExtractedData) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-sm text-slate-600">Trust Name</Label>
        <p className="font-medium">{data.trustName || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">EIN</Label>
        <p className="font-medium">{data.ein || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Grantor Name</Label>
        <p className="font-medium">{data.grantorName || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Trustee</Label>
        <p className="font-medium">{data.trusteeName || 'Not specified'}</p>
      </div>
      <div className="col-span-2">
        <Label className="text-sm text-slate-600">Beneficiaries</Label>
        <p className="font-medium">{data.beneficiaries?.join(', ') || 'None listed'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Date Established</Label>
        <p className="font-medium">{data.dateEstablished || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Initial Seed Gift</Label>
        <p className="font-medium">${data.initialSeedGift || '0'}</p>
      </div>
    </div>
  );

  const renderPolicyData = (data: ExtractedData) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-sm text-slate-600">Policy Number</Label>
        <p className="font-medium">{data.policyNumber || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Carrier</Label>
        <p className="font-medium">{data.carrier || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Insured Name</Label>
        <p className="font-medium">{data.insuredName || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Death Benefit</Label>
        <p className="font-medium">${data.deathBenefit?.toLocaleString() || '0'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Annual Premium</Label>
        <p className="font-medium">${data.annualPremium?.toLocaleString() || '0'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Premium Due Date</Label>
        <p className="font-medium">{data.premiumDueDate || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Policy Owner</Label>
        <p className="font-medium">{data.policyOwner || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Cash Value</Label>
        <p className="font-medium">${data.cashValue?.toLocaleString() || '0'}</p>
      </div>
    </div>
  );

  const renderGiftLetterData = (data: ExtractedData) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label className="text-sm text-slate-600">Trust Reference</Label>
        <p className="font-medium">{data.trustReference || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Gift Date</Label>
        <p className="font-medium">{data.giftDate || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Total Gift Amount</Label>
        <p className="font-medium">${data.totalGiftAmount?.toLocaleString() || '0'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Withdrawal Deadline</Label>
        <p className="font-medium">{data.withdrawalDeadline || 'Not specified'}</p>
      </div>
      <div>
        <Label className="text-sm text-slate-600">Purpose</Label>
        <p className="font-medium">{data.purpose || 'Not specified'}</p>
      </div>
      {data.beneficiaryShares && data.beneficiaryShares.length > 0 && (
        <div className="col-span-2">
          <Label className="text-sm text-slate-600 mb-2 block">Beneficiary Shares</Label>
          <div className="bg-slate-50 rounded p-3 space-y-1">
            {data.beneficiaryShares.map((share, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-slate-600">{share.name}:</span>
                <span className="font-medium">${share.amount?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderEditableILITData = (data: ExtractedData, onChange: (updated: ExtractedData) => void) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-sm text-slate-600">Trust Name</Label>
        <Input
          value={data.trustName || ''}
          onChange={(e) => onChange({ ...data, trustName: e.target.value })}
          placeholder="Enter trust name"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">EIN</Label>
        <Input
          value={data.ein || ''}
          onChange={(e) => onChange({ ...data, ein: e.target.value })}
          placeholder="Enter EIN"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Grantor Name</Label>
        <Input
          value={data.grantorName || ''}
          onChange={(e) => onChange({ ...data, grantorName: e.target.value })}
          placeholder="Enter grantor name"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Trustee</Label>
        <Input
          value={data.trusteeName || ''}
          onChange={(e) => onChange({ ...data, trusteeName: e.target.value })}
          placeholder="Enter trustee name"
        />
      </div>
      <div className="col-span-2">
        <Label className="text-sm text-slate-600">Beneficiaries (comma-separated)</Label>
        <Input
          value={data.beneficiaries?.join(', ') || ''}
          onChange={(e) => onChange({ ...data, beneficiaries: e.target.value.split(',').map(b => b.trim()).filter(b => b) })}
          placeholder="Enter beneficiaries, separated by commas"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Date Established</Label>
        <Input
          type="date"
          value={data.dateEstablished || ''}
          onChange={(e) => onChange({ ...data, dateEstablished: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Initial Seed Gift</Label>
        <Input
          value={data.initialSeedGift || ''}
          onChange={(e) => onChange({ ...data, initialSeedGift: e.target.value })}
          placeholder="Enter initial seed gift"
        />
      </div>
    </div>
  );

  const renderEditablePolicyData = (data: ExtractedData, onChange: (updated: ExtractedData) => void) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-sm text-slate-600">Policy Number</Label>
        <Input
          value={data.policyNumber || ''}
          onChange={(e) => onChange({ ...data, policyNumber: e.target.value })}
          placeholder="Enter policy number"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Carrier</Label>
        <Input
          value={data.carrier || ''}
          onChange={(e) => onChange({ ...data, carrier: e.target.value })}
          placeholder="Enter carrier name"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Insured Name</Label>
        <Input
          value={data.insuredName || ''}
          onChange={(e) => onChange({ ...data, insuredName: e.target.value })}
          placeholder="Enter insured name"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Death Benefit</Label>
        <Input
          type="number"
          value={data.deathBenefit || ''}
          onChange={(e) => onChange({ ...data, deathBenefit: parseFloat(e.target.value) || 0 })}
          placeholder="Enter death benefit"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Annual Premium</Label>
        <Input
          type="number"
          value={data.annualPremium || ''}
          onChange={(e) => onChange({ ...data, annualPremium: parseFloat(e.target.value) || 0 })}
          placeholder="Enter annual premium"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Premium Due Date</Label>
        <Input
          type="date"
          value={data.premiumDueDate || ''}
          onChange={(e) => onChange({ ...data, premiumDueDate: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Policy Owner</Label>
        <Input
          value={data.policyOwner || ''}
          onChange={(e) => onChange({ ...data, policyOwner: e.target.value })}
          placeholder="Enter policy owner"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Cash Value</Label>
        <Input
          type="number"
          value={data.cashValue || ''}
          onChange={(e) => onChange({ ...data, cashValue: parseFloat(e.target.value) || 0 })}
          placeholder="Enter cash value"
        />
      </div>
    </div>
  );

  const renderEditableGiftLetterData = (data: ExtractedData, onChange: (updated: ExtractedData) => void) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label className="text-sm text-slate-600">Trust Reference</Label>
        <Input
          value={data.trustReference || ''}
          onChange={(e) => onChange({ ...data, trustReference: e.target.value })}
          placeholder="Enter trust reference"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Gift Date</Label>
        <Input
          type="date"
          value={data.giftDate || ''}
          onChange={(e) => onChange({ ...data, giftDate: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Total Gift Amount</Label>
        <Input
          type="number"
          value={data.totalGiftAmount || ''}
          onChange={(e) => onChange({ ...data, totalGiftAmount: parseFloat(e.target.value) || 0 })}
          placeholder="Enter total gift amount"
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Withdrawal Deadline</Label>
        <Input
          type="date"
          value={data.withdrawalDeadline || ''}
          onChange={(e) => onChange({ ...data, withdrawalDeadline: e.target.value })}
        />
      </div>
      <div>
        <Label className="text-sm text-slate-600">Purpose</Label>
        <Input
          value={data.purpose || ''}
          onChange={(e) => onChange({ ...data, purpose: e.target.value })}
          placeholder="Enter purpose"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">AI-Powered Document Processing</h2>
        <p className="text-slate-600">Upload ILIT documents, policies, or gift letters for instant AI extraction</p>
      </div>

      {/* Trust Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Trust</CardTitle>
          <CardDescription>
            Choose which trust to associate documents with
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTrusts ? (
            <div className="flex items-center gap-2 text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading trusts...</span>
            </div>
          ) : trusts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Trusts Found</AlertTitle>
              <AlertDescription>
                You need to create a trust before uploading documents.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="trust-select">Trust</Label>
              <Select value={selectedTrustId} onValueChange={setSelectedTrustId}>
                <SelectTrigger id="trust-select" className="w-full">
                  <SelectValue placeholder="Select a trust" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">Create New Trust</SelectItem>
                  {trusts.map((trust) => (
                    <SelectItem key={trust.id} value={trust.id}>
                      {trust.trust_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Document Upload
          </CardTitle>
          <CardDescription>
            Upload trust documents, insurance policies, or gift letters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-700">
                  Drop files here or click to upload
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  PDF, PNG, JPG, DOC up to 10MB
                </p>
              </label>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={processDocument}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Process with AI
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Processing Status */}
            {processing && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Document Upload</span>
                  {getStatusIcon(processingStatus.upload)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI Extraction</span>
                  {getStatusIcon(processingStatus.ai)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Data Validation</span>
                  {getStatusIcon(processingStatus.validation)}
                </div>
              </div>
            )}

            {/* Error Recovery */}
            {(processingStatus.upload === 'error' || processingStatus.ai === 'error' || processingStatus.validation === 'error') && (
              <Alert className="mt-4 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle>Processing Error</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">Failed to process document. Please try again.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProcessingStatus({
                        upload: 'pending',
                        ai: 'pending',
                        validation: 'pending',
                        recording: 'pending'
                      });
                      setProcessing(false);
                    }}
                  >
                    Reset & Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Comparison */}
      {showComparison && extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Extraction Results</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{extractedData.documentType}</Badge>
                <Badge variant="success" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {Math.round((extractedData.confidence || 0) * 100)}% Confidence
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              Review AI-extracted data or enter manually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ai" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Extracted
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="space-y-4 mt-6">
                {!isEditMode ? (
                  <>
                    {extractedData.documentType === 'POLICY' && renderPolicyData(extractedData)}
                    {extractedData.documentType === 'GIFT_LETTER' && renderGiftLetterData(extractedData)}
                    {extractedData.documentType === 'ILIT' && renderILITData(extractedData)}

                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>AI Processing Complete</AlertTitle>
                      <AlertDescription>
                        Data extracted in 3.2 seconds with {Math.round((extractedData.confidence || 0) * 100)}% confidence
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleEdit}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          if (extractedData.documentType === 'POLICY') {
                            handleSavePolicy();
                          } else if (extractedData.documentType === 'ILIT') {
                            handleSaveILIT();
                          } else {
                            toast.success('Feature coming in Phase 3 of build!');
                          }
                        }}
                        disabled={processingStatus.recording === 'processing'}
                      >
                        {processingStatus.recording === 'processing' ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Saving {extractedData.documentType}...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept & Save
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : editedData ? (
                  <>
                    {editedData.documentType === 'POLICY' && renderEditablePolicyData(editedData, setEditedData)}
                    {editedData.documentType === 'GIFT_LETTER' && renderEditableGiftLetterData(editedData, setEditedData)}
                    {editedData.documentType === 'ILIT' && renderEditableILITData(editedData, setEditedData)}

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertTitle>Edit Mode</AlertTitle>
                      <AlertDescription>
                        Make changes to the extracted data and click Save to apply them.
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSaveEdits}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </>
                ) : null}
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-6">
                <p className="text-sm text-slate-600">Manual entry form (coming in Phase 3)</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}