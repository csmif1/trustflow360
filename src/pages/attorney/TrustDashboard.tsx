import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Gift, Users, Building2, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getTrustById } from '@/lib/api/trustService';
import { getPoliciesForTrust } from '@/lib/api/policyService';
import { getGiftsForTrust, Gift as GiftType } from '@/lib/api/giftService';
import { supabase } from '@/integrations/supabase/client';

interface Trust {
  id: string;
  grantor_name: string;
  trust_name: string;
  trust_date: string;
  trust_type: string;
  status: string;
  crm_reference?: string | null;
  created_at: string;
  updated_at: string;
}

interface Policy {
  id: string;
  trust_id: string;
  policy_number: string;
  carrier: string;
  insured_name: string;
  death_benefit?: number;
  cash_value?: number;
  policy_owner?: string;
  annual_premium?: number;
  policy_status?: string;
  created_at: string;
  updated_at: string;
}

interface Beneficiary {
  id: string;
  trust_id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  percentage?: number;
  address?: string;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  trust_id: string;
  document_name: string;
  file_path: string;
  document_type: string;
  review_status?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

const TrustDashboard: React.FC = () => {
  const { trustId } = useParams<{ trustId: string }>();
  const navigate = useNavigate();

  const [trust, setTrust] = useState<Trust | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [totalPolicies, setTotalPolicies] = useState(0);
  const [totalGifts, setTotalGifts] = useState(0);
  const [complianceScore, setComplianceScore] = useState(0);

  // Tab data
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [gifts, setGifts] = useState<GiftType[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    if (trustId) {
      loadTrustData();
      loadStats();
    }
  }, [trustId]);

  const loadTrustData = async () => {
    if (!trustId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await getTrustById(trustId);

      if (response.success && response.data) {
        setTrust(response.data);
      } else {
        setError(response.error || 'Failed to load trust data');
      }
    } catch (err) {
      setError('An error occurred while loading trust data');
      console.error('Error loading trust:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!trustId) return;

    try {
      // Load policies count
      const policiesResponse = await getPoliciesForTrust(trustId);
      if (policiesResponse.success && policiesResponse.data) {
        setTotalPolicies(policiesResponse.data.length);
      }

      // Load gifts count
      const giftsResponse = await getGiftsForTrust(trustId);
      if (giftsResponse.success && giftsResponse.data) {
        setTotalGifts(giftsResponse.data.length);
      }

      // TODO: Calculate compliance score based on actual metrics
      setComplianceScore(85); // Placeholder
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const loadPolicies = async () => {
    if (!trustId) return;

    setLoadingPolicies(true);
    try {
      const response = await getPoliciesForTrust(trustId);
      if (response.success && response.data) {
        setPolicies(response.data);
      }
    } catch (err) {
      console.error('Error loading policies:', err);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const loadGifts = async () => {
    if (!trustId) return;

    setLoadingGifts(true);
    try {
      const response = await getGiftsForTrust(trustId);
      if (response.success && response.data) {
        setGifts(response.data);
      }
    } catch (err) {
      console.error('Error loading gifts:', err);
    } finally {
      setLoadingGifts(false);
    }
  };

  const loadBeneficiaries = async () => {
    if (!trustId) return;

    setLoadingBeneficiaries(true);
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('trust_id', trustId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading beneficiaries:', error);
      } else {
        setBeneficiaries(data || []);
      }
    } catch (err) {
      console.error('Error loading beneficiaries:', err);
    } finally {
      setLoadingBeneficiaries(false);
    }
  };

  const loadDocuments = async () => {
    if (!trustId) return;

    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('trust_documents')
        .select('*')
        .eq('trust_id', trustId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
      } else {
        setDocuments(data || []);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status?: string) => {
    const statusLower = status?.toLowerCase() || 'unknown';

    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'active': 'default',
      'in-force': 'default',
      'pending': 'secondary',
      'lapsed': 'destructive',
      'inactive': 'outline',
    };

    return (
      <Badge variant={variants[statusLower] || 'outline'}>
        {status || 'Unknown'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading trust details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trust) {
    return (
      <div className="container mx-auto p-6">
        <Button
          variant="outline"
          onClick={() => navigate('/trusts')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Trusts
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Trust not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => navigate('/trusts')}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Trusts
      </Button>

      {/* Trust Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{trust.trust_name}</CardTitle>
              <CardDescription className="mt-2">
                <div className="flex flex-col gap-1">
                  <div>
                    <span className="font-medium">Grantor:</span> {trust.grantor_name}
                  </div>
                  <div>
                    <span className="font-medium">Trust Date:</span> {formatDate(trust.trust_date)}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {trust.trust_type}
                  </div>
                  {trust.crm_reference && (
                    <div>
                      <span className="font-medium">CRM Reference:</span> {trust.crm_reference}
                    </div>
                  )}
                </div>
              </CardDescription>
            </div>
            <div>
              {getStatusBadge(trust.status)}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPolicies}</div>
            <p className="text-xs text-muted-foreground">
              Insurance policies linked to this trust
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gifts</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGifts}</div>
            <p className="text-xs text-muted-foreground">
              Gifts recorded for this trust
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceScore}%</div>
            <p className="text-xs text-muted-foreground">
              Overall compliance status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Sections */}
      <Tabs defaultValue="policies" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="policies" onClick={loadPolicies}>
            <Building2 className="mr-2 h-4 w-4" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="gifts" onClick={loadGifts}>
            <Gift className="mr-2 h-4 w-4" />
            Gifts
          </TabsTrigger>
          <TabsTrigger value="documents" onClick={loadDocuments}>
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="beneficiaries" onClick={loadBeneficiaries}>
            <Users className="mr-2 h-4 w-4" />
            Beneficiaries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Insurance Policies</CardTitle>
              <CardDescription>
                Policies linked to this trust
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPolicies ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : policies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No policies found for this trust
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Policy Number</th>
                        <th className="text-left p-2">Carrier</th>
                        <th className="text-left p-2">Insured</th>
                        <th className="text-right p-2">Death Benefit</th>
                        <th className="text-right p-2">Annual Premium</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {policies.map((policy) => (
                        <tr key={policy.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{policy.policy_number}</td>
                          <td className="p-2">{policy.carrier}</td>
                          <td className="p-2">{policy.insured_name}</td>
                          <td className="p-2 text-right">{formatCurrency(policy.death_benefit)}</td>
                          <td className="p-2 text-right">{formatCurrency(policy.annual_premium)}</td>
                          <td className="p-2">{getStatusBadge(policy.policy_status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gifts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gift History</CardTitle>
                  <CardDescription>
                    Gifts recorded for this trust
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadGifts}
                  disabled={loadingGifts}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingGifts ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingGifts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : gifts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No gifts recorded for this trust
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Contributor</th>
                        <th className="text-right p-2">Amount</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gifts.map((gift) => (
                        <tr key={gift.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{formatDate(gift.contribution_date)}</td>
                          <td className="p-2 font-medium">{gift.contributor_name}</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(gift.amount)}</td>
                          <td className="p-2">{gift.contribution_type || '-'}</td>
                          <td className="p-2">{getStatusBadge(gift.status)}</td>
                          <td className="p-2 text-sm text-muted-foreground">{gift.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trust Documents</CardTitle>
                  <CardDescription>
                    Documents associated with this trust
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDocuments}
                  disabled={loadingDocuments}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingDocuments ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No documents uploaded for this trust
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Document Name</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Review Status</th>
                        <th className="text-left p-2">Uploaded</th>
                        <th className="text-left p-2">Reviewed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {doc.document_name}
                          </td>
                          <td className="p-2">{doc.document_type || '-'}</td>
                          <td className="p-2">
                            {getStatusBadge(doc.review_status)}
                          </td>
                          <td className="p-2">{formatDate(doc.created_at)}</td>
                          <td className="p-2 text-muted-foreground">{doc.reviewed_by || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beneficiaries" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Beneficiaries</CardTitle>
                  <CardDescription>
                    Beneficiaries of this trust
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadBeneficiaries}
                  disabled={loadingBeneficiaries}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingBeneficiaries ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingBeneficiaries ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : beneficiaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No beneficiaries added to this trust
                </div>
              ) : (
                <div className="grid gap-4">
                  {beneficiaries.map((beneficiary) => (
                    <Card key={beneficiary.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold">{beneficiary.name}</h4>
                              {beneficiary.percentage && (
                                <Badge variant="secondary">
                                  {beneficiary.percentage}%
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {beneficiary.email && (
                                <div>
                                  <span className="text-muted-foreground">Email:</span>{' '}
                                  <span>{beneficiary.email}</span>
                                </div>
                              )}
                              {beneficiary.phone && (
                                <div>
                                  <span className="text-muted-foreground">Phone:</span>{' '}
                                  <span>{beneficiary.phone}</span>
                                </div>
                              )}
                              {beneficiary.relationship && (
                                <div>
                                  <span className="text-muted-foreground">Relationship:</span>{' '}
                                  <span>{beneficiary.relationship}</span>
                                </div>
                              )}
                              {beneficiary.address && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Address:</span>{' '}
                                  <span>{beneficiary.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrustDashboard;
