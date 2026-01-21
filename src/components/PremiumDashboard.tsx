import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CalendarDays, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  TrendingDown,
  FileText,
  Plus,
  CreditCard,
  History,
  Download
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { RecordPremiumPaymentModal } from '@/components/RecordPremiumPaymentModal';
import BulkPaymentUpload from './BulkPaymentUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Simple date formatter that works with YYYY-MM-DD strings
const formatDateFixed = (dateValue: any) => {
  if (!dateValue || dateValue === null) return '-';
  
  // Convert to string if needed
  const dateStr = String(dateValue);
  
  // Check if it's a YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  }
  
  // Fallback: try standard Date parsing
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  } catch (e) {
    console.log('Date parse error:', dateValue);
  }
  
  return dateStr; // Return original if all else fails
};

interface PremiumData {
  upcomingPremiums: any[];
  totalMonthlyPremiums: number;
  policiesInGracePeriod: number;
  dueThisMonth: number;
  availableFunds: number;
  next30Days: number;
  next90Days: number;
  paymentHistory: any[];
}

export default function PremiumDashboard() {
  const [data, setData] = useState<PremiumData>({
    upcomingPremiums: [],
    totalMonthlyPremiums: 0,
    policiesInGracePeriod: 0,
    dueThisMonth: 0,
    availableFunds: 0,
    next30Days: 0,
    next90Days: 0,
    paymentHistory: []
  });
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);

  useEffect(() => {
    fetchPremiumData();
  }, []);

  const fetchPremiumData = async () => {
    try {
      // Fetch upcoming premiums with policy and trust details
      const { data: upcomingData } = await supabase
        .from('upcoming_premiums')
        .select(`
          id,
          next_due_date,
          amount_due,
          days_until_due,
          status,
          policy_id,
          trust_id,
          insurance_policies!inner (
            policy_number,
            carrier,
            annual_premium,
            premium_frequency,
            next_premium_date,
            trusts (
              trust_name
            )
          )
        `)
        .order('next_due_date', { ascending: true })
        .limit(5);

      // Flatten the nested structure for display
      const flattenedUpcoming = upcomingData?.map(premium => ({
        ...premium,
        policy_id: premium.policy_id,
        policy_number: premium.insurance_policies.policy_number,
        carrier: premium.insurance_policies.carrier,
        trust_name: premium.insurance_policies.trusts?.trust_name,
        premium_amount: premium.amount_due,
        annual_premium: premium.insurance_policies.annual_premium,
        premium_frequency: premium.insurance_policies.premium_frequency,
        next_premium_date: premium.insurance_policies.next_premium_date,
        policy: premium.insurance_policies
      })) || [];

      // Fetch fund sufficiency
      const { data: fundData } = await supabase
        .from('fund_sufficiency_checks')
        .select('*')
        .single();

      // Fetch payment history with policy and trust details
      const { data: historyData } = await supabase
        .from('premium_payments')
        .select(`
          id,
          payment_date,
          amount,
          payment_method,
          check_number,
          notes,
          insurance_policies!inner (
            policy_number,
            carrier,
            trusts (
              trust_name
            )
          )
        `)
        .order('payment_date', { ascending: false })
        .limit(10);

      // Flatten the nested structure for display
      const flattenedHistory = historyData?.map(payment => ({
        payment_date: payment.payment_date,
        amount: payment.amount,
        payment_method: payment.payment_method,
        check_number: payment.check_number,
        policy_number: payment.insurance_policies.policy_number,
        carrier: payment.insurance_policies.carrier,
        trust_name: payment.insurance_policies.trusts?.trust_name
      })) || [];

      // Calculate metrics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const dueThisMonth = upcomingData?.filter(p => {
        const dueDate = new Date(p.next_due_date);
        return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
      }).length || 0;

      const policiesInGrace = upcomingData?.filter(p => p.days_until_due < 0).length || 0;

      setData({
        upcomingPremiums: flattenedUpcoming,
        totalMonthlyPremiums: flattenedUpcoming?.reduce((sum, p) => sum + (p.amount_due || 0), 0) || 0,
        policiesInGracePeriod: policiesInGrace,
        dueThisMonth: dueThisMonth,
        availableFunds: fundData?.total_trust_assets || 0,
        next30Days: fundData?.total_annual_premiums || 0,
        next90Days: fundData?.total_annual_premiums || 0,
        paymentHistory: flattenedHistory
      });
    } catch (error) {
      console.error('Error fetching premium data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = (policy: any) => {
    setSelectedPolicy(policy);
    setIsPaymentModalOpen(true);
  };

  const exportPaymentHistory = () => {
    const csv = [
      ['Date', 'Policy', 'Carrier', 'Amount', 'Method', 'Check Number'],
      ...data.paymentHistory.map(p => [
        formatDateFixed(p.payment_date),
        p.policy_number,
        p.carrier,
        p.amount,
        p.payment_method,
        p.check_number || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  const fundSufficiencyPercent = data.availableFunds > 0 
    ? Math.min((data.availableFunds / data.next30Days) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Premium Overview</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Compliance Alerts */}
          {data.policiesInGracePeriod > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{data.policiesInGracePeriod} policies in grace period</strong> - Immediate payment required to avoid lapse
              </AlertDescription>
            </Alert>
          )}

          {/* Metrics Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Policies in Grace Period</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.policiesInGracePeriod}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Due This Month</CardTitle>
                <CalendarDays className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.dueThisMonth}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Premium Total</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.totalMonthlyPremiums)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Fund Sufficiency Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fund Sufficiency Analysis
              </CardTitle>
              <CardDescription>
                Available funds vs. upcoming premium requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Available Funds</span>
                  <span className="text-sm font-bold">{formatCurrency(data.availableFunds)}</span>
                </div>
                <Progress value={fundSufficiencyPercent} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Next 30 Days</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.next30Days)}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.availableFunds >= data.next30Days ? 
                      <span className="text-green-600">✓ Sufficient</span> : 
                      <span className="text-red-600">✗ Insufficient</span>
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next 90 Days</p>
                  <p className="text-lg font-semibold">{formatCurrency(data.next90Days)}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.availableFunds >= data.next90Days ? 
                      <span className="text-green-600">✓ Sufficient</span> : 
                      <span className="text-red-600">✗ Insufficient</span>
                    }
                  </p>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4">
                <FileText className="h-4 w-4 mr-2" />
                Full Report
              </Button>
            </CardContent>
          </Card>

          {/* Upcoming Premium Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Premium Payments
              </CardTitle>
              <CardDescription>
                Next 5 premium payments due
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.upcomingPremiums.map((premium, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        premium.days_until_due < 0 ? 'bg-red-100' :
                        premium.days_until_due <= 7 ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        <CreditCard className={`h-4 w-4 ${
                          premium.days_until_due < 0 ? 'text-red-600' :
                          premium.days_until_due <= 7 ? 'text-yellow-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{premium.carrier}</p>
                        <p className="text-sm text-muted-foreground">
                          Policy #{premium.policy_number} • {premium.trust_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Due: {formatDateFixed(premium.next_due_date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(premium.premium_amount)}</p>
                      <Badge variant={
                        premium.days_until_due < 0 ? 'destructive' :
                        premium.days_until_due <= 7 ? 'warning' : 'default'
                      }>
                        {premium.days_until_due < 0 
                          ? `${Math.abs(premium.days_until_due)} days overdue`
                          : `Due in ${premium.days_until_due} days`
                        }
                      </Badge>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => handleRecordPayment(premium)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Record Payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>Recent premium payments</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportPaymentHistory}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Policy</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Check #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.paymentHistory.map((payment, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDateFixed(payment.payment_date)}</TableCell>
                      <TableCell>{payment.policy_number}</TableCell>
                      <TableCell>{payment.carrier}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.check_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload" className="space-y-6">
          <BulkPaymentUpload />
        </TabsContent>
      </Tabs>

      {/* Record Payment Modal */}
      {selectedPolicy && (
        <RecordPremiumPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedPolicy(null);
            fetchPremiumData();
          }}
          premium={selectedPolicy}
        />
      )}
    </div>
  );
}