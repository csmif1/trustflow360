import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Send,
  Download,
  Mail,
  Calculator,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';

const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Policy {
  id: string;
  policy_number: string;
  annual_premium: number;
  carrier: string;
  next_premium_date: string;
  trusts: {
    id: string;
    trust_name: string;
    grantor_name: string;
    grantor_email: string;
  };
}

interface GiftRequest {
  id: string;
  trust_id: string;
  grantor_name: string;
  grantor_email: string;
  amount_requested: number;
  premium_due_date: string;
  request_due_date: string;
  status: string;
  sent_at: string;
  sent_via: string;
  created_at: string;
}

export default function GiftRequestGenerator() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [calculation, setCalculation] = useState<any>(null);
  const [requestedAmount, setRequestedAmount] = useState('');
  const [requestDueDate, setRequestDueDate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [letterHtml, setLetterHtml] = useState('');
  const [requestId, setRequestId] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [giftRequests, setGiftRequests] = useState<GiftRequest[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPolicies();
    fetchGiftRequests();
  }, []);

  const fetchPolicies = async () => {
    try {
      // Fetch active policies
      const { data: policiesData, error: policiesError } = await supabase
        .from('insurance_policies')
        .select('id, policy_number, annual_premium, carrier, next_premium_date, trust_id')
        .eq('policy_status', 'active')
        .order('policy_number');

      if (policiesError) throw policiesError;

      if (!policiesData || policiesData.length === 0) {
        setPolicies([]);
        return;
      }

      // Get unique trust IDs
      const trustIds = [...new Set(policiesData.map(p => p.trust_id))];

      // Fetch trust data for these policies
      const { data: trustsData, error: trustsError } = await supabase
        .from('trusts')
        .select('id, trust_name, grantor_name, grantor_email')
        .in('id', trustIds);

      if (trustsError) throw trustsError;

      // Create a map of trust data by ID for quick lookup
      const trustsMap = new Map(trustsData?.map(t => [t.id, t]) || []);

      // Merge policy and trust data
      const enrichedPolicies = policiesData.map(policy => ({
        ...policy,
        trusts: trustsMap.get(policy.trust_id) || {
          id: policy.trust_id,
          trust_name: 'Unknown Trust',
          grantor_name: 'Unknown',
          grantor_email: ''
        }
      }));

      setPolicies(enrichedPolicies);
    } catch (err: any) {
      console.error('Error fetching policies:', err);
      setError('Failed to load policies');
    }
  };

  const fetchGiftRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('gift_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGiftRequests(data || []);
    } catch (err: any) {
      console.error('Error fetching gift requests:', err);
    }
  };

  const handlePolicySelect = async (policyId: string) => {
    setSelectedPolicyId(policyId);
    const policy = policies.find(p => p.id === policyId);
    setSelectedPolicy(policy || null);

    if (!policyId) {
      setCalculation(null);
      return;
    }

    // Calculate recommended amount
    setLoading(true);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/gift-request-generator/calculate?policy_id=${policyId}`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to calculate');

      const data = await response.json();
      setCalculation(data.calculation);
      setRequestedAmount(data.calculation.recommended_amount.toString());
      setRequestDueDate(data.calculation.recommended_request_due_date || '');
    } catch (err: any) {
      console.error('Error calculating:', err);
      setError('Failed to calculate recommended amount');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPolicy || !requestedAmount) {
      setError('Please select a policy and enter requested amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/gift-request-generator/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          trust_id: selectedPolicy.trusts.id,
          policy_id: selectedPolicy.id,
          grantor_name: selectedPolicy.trusts.grantor_name,
          grantor_email: selectedPolicy.trusts.grantor_email,
          amount_requested: parseFloat(requestedAmount),
          premium_due_date: selectedPolicy.next_premium_date,
          request_due_date: requestDueDate,
          custom_message: customMessage
        })
      });

      if (!response.ok) throw new Error('Failed to generate letter');

      const data = await response.json();
      setLetterHtml(data.letter_html);
      setRequestId(data.request_id);
      setShowPreview(true);
    } catch (err: any) {
      console.error('Error generating letter:', err);
      setError('Failed to generate letter');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (sendVia: 'email' | 'mail' | 'both') => {
    if (!requestId) {
      setError('Please generate a letter first');
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/gift-request-generator/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          request_id: requestId,
          send_via: sendVia
        })
      });

      if (!response.ok) throw new Error('Failed to send request');

      const data = await response.json();
      alert(data.message || 'Gift request sent successfully!');

      // Refresh gift requests list
      fetchGiftRequests();

      // Reset form
      setSelectedPolicyId('');
      setSelectedPolicy(null);
      setCalculation(null);
      setRequestedAmount('');
      setRequestDueDate('');
      setCustomMessage('');
      setLetterHtml('');
      setRequestId('');
      setShowPreview(false);
    } catch (err: any) {
      console.error('Error sending:', err);
      setError('Failed to send gift request');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = () => {
    if (!letterHtml) return;

    const blob = new Blob([letterHtml], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gift-request-${selectedPolicy?.policy_number || 'letter'}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: Clock },
      sent: { label: 'Sent', className: 'bg-primary-light text-primary-800', icon: Send },
      reminded: { label: 'Reminded', className: 'bg-warning-light text-warning-dark', icon: AlertCircle },
      received: { label: 'Received', className: 'bg-success-light text-success-dark', icon: CheckCircle },
      expired: { label: 'Expired', className: 'bg-danger-light text-danger-dark', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="border-danger bg-danger-light">
          <AlertCircle className="h-4 w-4 text-danger" />
          <AlertDescription className="text-danger-dark">{error}</AlertDescription>
        </Alert>
      )}

      {/* Request Builder */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle>Create Gift Request</CardTitle>
          <CardDescription>
            Generate contribution request letters for grantors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Policy Selector */}
          <div>
            <Label htmlFor="policy">Select Policy</Label>
            <select
              id="policy"
              value={selectedPolicyId}
              onChange={(e) => handlePolicySelect(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">-- Select a policy --</option>
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.policy_number} - {policy.trusts.trust_name} ({policy.trusts.grantor_name})
                </option>
              ))}
            </select>
          </div>

          {/* Auto-populated fields (shown when policy selected) */}
          {selectedPolicy && calculation && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Trust Name</p>
                  <p className="font-semibold">{selectedPolicy.trusts.trust_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Grantor</p>
                  <p className="font-semibold">{selectedPolicy.trusts.grantor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Premium Amount</p>
                  <p className="font-semibold">
                    ${calculation.premium_amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Premium Due</p>
                  <p className="font-semibold">
                    {new Date(calculation.premium_due_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Number of Beneficiaries</p>
                  <p className="font-semibold">{calculation.number_of_beneficiaries}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Grantor Email</p>
                  <p className="font-semibold">{selectedPolicy.trusts.grantor_email || 'Not available'}</p>
                </div>
              </div>

              {/* Calculation Info */}
              <Alert className={calculation.needs_gift_tax_filing ? 'border-warning bg-warning-light' : 'border-primary bg-primary-50'}>
                <Calculator className={calculation.needs_gift_tax_filing ? 'h-4 w-4 text-warning' : 'h-4 w-4 text-primary-800'} />
                <AlertDescription>
                  <p className="font-semibold mb-1">
                    Recommended Amount: ${calculation.recommended_amount.toLocaleString()}
                  </p>
                  {calculation.needs_gift_tax_filing && (
                    <p className="text-sm text-warning-dark">
                      ⚠️ This amount exceeds the annual exclusion limit ({calculation.number_of_beneficiaries} × $
                      {calculation.annual_exclusion_limit.toLocaleString()} = $
                      {calculation.max_per_grantor.toLocaleString()}). May require gift tax filing.
                    </p>
                  )}
                </AlertDescription>
              </Alert>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Requested Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <Label htmlFor="due-date">Request Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={requestDueDate}
                    onChange={(e) => setRequestDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="custom-message">Custom Message (Optional)</Label>
                <Textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal message to include in the letter..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !requestedAmount}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {loading ? 'Generating...' : 'Preview Letter'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Letter Preview & Send Options */}
      {showPreview && letterHtml && (
        <Card className="border-gray-200 shadow-card">
          <CardHeader>
            <CardTitle>Letter Preview</CardTitle>
            <CardDescription>
              Review the letter before sending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border border-gray-200 rounded-lg p-4 bg-white max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: letterHtml }}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleSend('email')}
                disabled={sending || !selectedPolicy?.trusts.grantor_email}
                className="button-lift"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send Email'}
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
              <Button
                onClick={() => handleSend('mail')}
                disabled={sending}
                variant="secondary"
              >
                <Mail className="h-4 w-4 mr-2" />
                Mark as Mailed
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Tracking Table */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle>Gift Request History</CardTitle>
          <CardDescription>
            Track all gift contribution requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grantor</TableHead>
                <TableHead>Trust</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent Via</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No gift requests yet. Create your first request above.
                  </TableCell>
                </TableRow>
              ) : (
                giftRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.grantor_name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {/* Trust name would need to be joined */}
                      Trust ID: {request.trust_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${request.amount_requested.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {request.sent_at
                        ? new Date(request.sent_at).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {request.request_due_date
                        ? new Date(request.request_due_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">
                        {request.sent_via || 'draft'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
