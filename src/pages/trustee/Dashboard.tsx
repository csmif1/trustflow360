import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  DollarSign, 
  Calendar,
  Building2,
  User,
  Shield,
  Clock,
  CreditCard,
  LogOut
} from 'lucide-react';

export default function TrusteeDashboard() {
  const { trustId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trust, setTrust] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);

  useEffect(() => {
    if (trustId) {
      fetchTrustData();
    }
  }, [trustId]);

  const fetchTrustData = async () => {
    try {
      // Fetch trust details
      const { data: trustData, error: trustError } = await supabase
        .from('trusts')
        .select('*')
        .eq('id', trustId)
        .single();

      if (trustError) throw trustError;
      setTrust(trustData);

      // Fetch policies
      const { data: policiesData } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('trust_id', trustId);

      setPolicies(policiesData || []);

      // Fetch beneficiaries
      const { data: beneficiariesData } = await supabase
        .from('policy_beneficiaries')
        .select('*')
        .eq('trust_id', trustId);

      setBeneficiaries(beneficiariesData || []);

      // Fetch payments if we have policies
      if (policiesData && policiesData.length > 0) {
        const policyIds = policiesData.map(p => p.id);
        const { data: paymentsData } = await supabase
          .from('premium_payments')
          .select('*')
          .in('policy_id', policyIds)
          .order('payment_date', { ascending: false })
          .limit(10);

        // Match payments with their policies
        const paymentsWithPolicies = (paymentsData || []).map(payment => {
          const policy = policiesData.find(p => p.id === payment.policy_id);
          return {
            ...payment,
            policy_number: policy?.policy_number,
            carrier: policy?.carrier
          };
        });

        setPayments(paymentsWithPolicies);
      }

    } catch (error) {
      console.error('Error fetching trust data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    navigate('/trustee/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(date));
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trust information...</p>
        </div>
      </div>
    );
  }

  if (!trust) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Trust not found or access denied.</p>
            <Button 
              className="w-full mt-4"
              onClick={() => navigate('/trustee/login')}
            >
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPremiumsPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold">Trustee Portal</h1>
                <p className="text-sm text-gray-600">{trust.trust_name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trust Type</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trust.trust_type}</div>
              <p className="text-xs text-muted-foreground">EIN: {trust.ein || 'Not provided'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{policies.length}</div>
              <p className="text-xs text-muted-foreground">Insurance policies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beneficiaries</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{beneficiaries.length}</div>
              <p className="text-xs text-muted-foreground">Total beneficiaries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Premiums Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPremiumsPaid)}</div>
              <p className="text-xs text-muted-foreground">Year to date</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trust Information</CardTitle>
                <CardDescription>Basic details about your trust</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Trust Name</p>
                    <p className="text-lg">{trust.trust_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Trust Type</p>
                    <p className="text-lg">{trust.trust_type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">EIN</p>
                    <p className="text-lg">{trust.ein || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Established</p>
                    <p className="text-lg">{formatDate(trust.trust_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Grantor</p>
                    <p className="text-lg">{trust.grantor_name || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Beneficiaries */}
            <Card>
              <CardHeader>
                <CardTitle>Beneficiaries</CardTitle>
                <CardDescription>Current trust beneficiaries and their allocations</CardDescription>
              </CardHeader>
              <CardContent>
                {beneficiaries.length > 0 ? (
                  <div className="space-y-3">
                    {beneficiaries.map((beneficiary) => (
                      <div key={beneficiary.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{beneficiary.name}</p>
                            <p className="text-sm text-gray-600">{beneficiary.relationship}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{beneficiary.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No beneficiaries recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Insurance Policies</CardTitle>
                <CardDescription>Active policies held by the trust</CardDescription>
              </CardHeader>
              <CardContent>
                {policies.length > 0 ? (
                  <div className="space-y-4">
                    {policies.map((policy) => (
                      <div key={policy.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{policy.carrier}</h4>
                            <p className="text-sm text-gray-600">Policy #{policy.policy_number}</p>
                            <p className="text-sm text-gray-600">Type: {policy.policy_type}</p>
                          </div>
                          <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>
                            {policy.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-gray-600">Face Amount</p>
                            <p className="font-medium">{formatCurrency(policy.face_amount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Premium</p>
                            <p className="font-medium">{formatCurrency(policy.premium_amount)}/{policy.premium_frequency}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Issue Date</p>
                            <p className="font-medium">{formatDate(policy.issue_date)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No policies found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Premium Payments</CardTitle>
                <CardDescription>Latest premium payments made by the trust</CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((payment, index) => (
                      <div key={payment.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <CreditCard className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{payment.carrier || 'Unknown Carrier'}</p>
                            <p className="text-sm text-gray-600">
                              Policy #{payment.policy_number || 'N/A'} • {formatDate(payment.payment_date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_method}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No payments recorded</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trust Documents</CardTitle>
                <CardDescription>Important documents and forms</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-4">No documents available</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-600">
            © 2025 Trust Administration. For questions, contact your trust administrator.
          </p>
        </div>
      </footer>
    </div>
  );
}