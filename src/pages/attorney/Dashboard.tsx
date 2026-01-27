import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  FileText,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Upload,
  Brain,
  Mail,
  FileSignature,
  BarChart3,
  Shield,
  Settings,
  Activity
} from 'lucide-react';
import PremiumDashboard from "@/components/PremiumDashboard";
import AnnualTaxReport from "@/components/Reports/AnnualTaxReport";
import PremiumPaymentSummary from "@/components/Reports/PremiumPaymentSummary";
import AuditTrailExport from "@/components/Reports/AuditTrailExport";
import GiftTaxSummary from "@/components/Reports/GiftTaxSummary";
import GiftRequestGenerator from "@/components/GiftRequestGenerator";
import TrustsPage from "@/components/TrustsPage";
import DocumentUpload from './DocumentUpload';
import CrummeyNotices from './CrummeyNotices';
import EmailLogs from './EmailLogs';
import Policies from './Policies';
import PolicyHealth from './PolicyHealth';

// Initialize Supabase client
const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple toast implementation
const toast = {
  error: (message: string) => {
    console.error(message);
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 bg-danger text-white px-6 py-3 rounded-lg shadow-elevated z-50';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  },
  success: (message: string) => {
    console.log(message);
    const toastEl = document.createElement('div');
    toastEl.className = 'fixed bottom-4 right-4 bg-success text-white px-6 py-3 rounded-lg shadow-elevated z-50';
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  }
};

interface ComplianceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  action?: string;
  dueDate?: string;
}

interface DashboardStats {
  totalTrusts: number;
  totalPolicies: number;
  pendingNotices: number;
  criticalIssues: number;
  totalGiftsThisYear: number;
  upcomingPremiums: number;
  healthyPolicies: number;
  complianceScore: number;
}

export default function AttorneyDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTrusts: 0,
    totalPolicies: 0,
    pendingNotices: 0,
    criticalIssues: 0,
    totalGiftsThisYear: 0,
    upcomingPremiums: 0,
    healthyPolicies: 0,
    complianceScore: 0
  });
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(false);

      // Fetch trust count
      const { count: trustCount } = await supabase
        .from('trusts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch policy count
      const { count: policyCount } = await supabase
        .from('insurance_policies')
        .select('*', { count: 'exact', head: true })
        .eq('policy_status', 'active');

      // Fetch pending notices
      const { count: noticeCount } = await supabase
        .from('crummey_notices')
        .select('*', { count: 'exact', head: true })
        .eq('notice_status', 'pending');

      // Fetch gifts this year
      const currentYear = new Date().getFullYear();
      const { data: giftsData } = await supabase
        .from('gifts')
        .select('amount')
        .gte('gift_date', `${currentYear}-01-01`);

      const totalGifts = giftsData?.reduce((sum, gift) => sum + (gift.amount || 0), 0) || 0;

      // Fetch policy health checks - get latest check per policy
      const { data: healthChecks } = await supabase
        .from('policy_health_checks')
        .select('policy_id, overall_status, check_date')
        .order('check_date', { ascending: false });

      // Get unique policies with their latest health check
      const latestHealthByPolicy = new Map();
      healthChecks?.forEach(check => {
        if (!latestHealthByPolicy.has(check.policy_id)) {
          latestHealthByPolicy.set(check.policy_id, check.overall_status);
        }
      });

      const latestHealthStatuses = Array.from(latestHealthByPolicy.values());
      const criticalCount = latestHealthStatuses.filter(status => status === 'critical').length;
      const healthyCount = latestHealthStatuses.filter(status => status === 'healthy').length;

      // Calculate compliance score
      const complianceScore = calculateComplianceScore(
        policyCount || 0,
        criticalCount,
        noticeCount || 0
      );

      setStats({
        totalTrusts: trustCount || 0,
        totalPolicies: policyCount || 0,
        pendingNotices: noticeCount || 0,
        criticalIssues: criticalCount,
        totalGiftsThisYear: totalGifts,
        upcomingPremiums: 0, // Will be populated from premium dashboard
        healthyPolicies: healthyCount,
        complianceScore
      });

      // Generate compliance alerts
      generateComplianceAlerts(noticeCount || 0, criticalCount);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateComplianceScore = (policies: number, critical: number, pending: number): number => {
    if (policies === 0) return 100;
    const criticalRatio = critical / policies;
    const pendingRatio = pending / policies;
    return Math.max(0, Math.round(100 - (criticalRatio * 40 + pendingRatio * 20)));
  };

  const generateComplianceAlerts = async (pendingCount: number, criticalCount: number) => {
    const alerts: ComplianceAlert[] = [];

    // Critical health issues
    if (criticalCount > 0) {
      alerts.push({
        id: '1',
        type: 'critical',
        message: `${criticalCount} policies require immediate attention`,
        action: 'Review policy health'
      });
    }

    // Pending Crummey notices
    if (pendingCount > 0) {
      alerts.push({
        id: '2',
        type: 'warning',
        message: `${pendingCount} Crummey notices pending delivery`,
        action: 'Review notices'
      });
    }

    // Check for approaching deadlines
    const { data: upcomingDeadlines } = await supabase
      .from('crummey_notices')
      .select('*')
      .eq('notice_status', 'pending')
      .lte('withdrawal_deadline', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    if (upcomingDeadlines && upcomingDeadlines.length > 0) {
      alerts.push({
        id: '3',
        type: 'warning',
        message: `${upcomingDeadlines.length} notices approaching 30-day deadline`,
        action: 'View deadlines',
        dueDate: upcomingDeadlines[0].withdrawal_deadline
      });
    }

    setComplianceAlerts(alerts);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary-900 mb-2">
              TrustFlow360
            </h1>
            <p className="text-gray-600">Premium Vigilance Dashboard - AI-Powered ILIT Administration</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <Activity className="h-3 w-3 mr-1" />
              {stats.totalPolicies} Policies
            </Badge>
          </div>
        </div>

        {/* Main Navigation Tabs - 5 consolidated tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full bg-primary-800 p-1">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white data-[state=active]:text-primary-800">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="trusts-policies" className="data-[state=active]:bg-white data-[state=active]:text-primary-800">
              <FileText className="h-4 w-4 mr-2" />
              Trusts & Policies
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-white data-[state=active]:text-primary-800">
              <Shield className="h-4 w-4 mr-2" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-white data-[state=active]:text-primary-800">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:text-primary-800">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Dashboard (Overview + Quick Actions) */}
          <TabsContent value="dashboard" className="space-y-6">

            {/* TOP: Critical Alerts */}
            {complianceAlerts.length > 0 && (
              <div className="space-y-3">
                {complianceAlerts.filter(a => a.type === 'critical').map(alert => (
                  <Alert key={alert.id} className="border-danger bg-danger-light">
                    <AlertTriangle className="h-5 w-5 text-danger" />
                    <AlertTitle className="text-danger font-semibold">Critical Alert</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span className="text-gray-700">{alert.message}</span>
                      {alert.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-4"
                          onClick={() => setActiveTab('compliance')}
                        >
                          {alert.action}
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
                {complianceAlerts.filter(a => a.type === 'warning').map(alert => (
                  <Alert key={alert.id} className="border-warning bg-warning-light">
                    <Clock className="h-5 w-5 text-warning" />
                    <AlertTitle className="text-warning-dark font-semibold">Warning</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-700">{alert.message}</span>
                        {alert.dueDate && (
                          <span className="text-sm text-gray-500 ml-2">
                            Due: {new Date(alert.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {alert.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-4"
                          onClick={() => setActiveTab('compliance')}
                        >
                          {alert.action}
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* MIDDLE: Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-gray-200 shadow-card card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Active Trusts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{stats.totalTrusts}</div>
                  <p className="text-sm text-gray-500 mt-1">{stats.totalPolicies} policies</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-card card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Policy Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">{stats.healthyPolicies}</div>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.criticalIssues > 0 && (
                      <span className="text-danger">{stats.criticalIssues} critical</span>
                    )}
                    {stats.criticalIssues === 0 && 'All healthy'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-card card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    YTD Gifts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    ${(stats.totalGiftsThisYear / 1000).toFixed(0)}k
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Total contributions</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-card card-hover">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Compliance Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${
                    stats.complianceScore >= 90 ? 'text-success' :
                    stats.complianceScore >= 70 ? 'text-warning' :
                    'text-danger'
                  }`}>
                    {stats.complianceScore}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        stats.complianceScore >= 90 ? 'bg-success' :
                        stats.complianceScore >= 70 ? 'bg-warning' :
                        'bg-danger'
                      }`}
                      style={{ width: `${stats.complianceScore}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Premium Dashboard Section */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Premium Management</h2>
              <PremiumDashboard />
            </div>

            {/* BOTTOM: Quick Actions */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-gray-200 shadow-card card-hover cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-3 bg-primary-light rounded-lg">
                        <Upload className="h-6 w-6 text-primary-action" />
                      </div>
                      Upload Gift Letter
                    </CardTitle>
                    <CardDescription>
                      Process gift documentation with AI extraction
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        <span>AI-powered data extraction</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Auto-generate Crummey notices</span>
                      </div>
                    </div>
                    <Button
                      className="w-full button-lift"
                      onClick={() => setActiveTab('compliance')}
                    >
                      Upload Document
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-card card-hover cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-3 bg-success-light rounded-lg">
                        <DollarSign className="h-6 w-6 text-success" />
                      </div>
                      Send Gift Request
                    </CardTitle>
                    <CardDescription>
                      Request contributions from grantors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Auto-calculated amounts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Email or mail tracking</span>
                      </div>
                    </div>
                    <Button
                      className="w-full button-lift"
                      onClick={() => setActiveTab('trusts-policies')}
                    >
                      Create Request
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-card card-hover cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-3 bg-warning-light rounded-lg">
                        <Mail className="h-6 w-6 text-warning" />
                      </div>
                      Send Notices
                    </CardTitle>
                    <CardDescription>
                      {stats.pendingNotices} notices pending
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <FileSignature className="h-4 w-4" />
                        <span>DocuSign & Adobe Sign ready</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Physical mail tracking</span>
                      </div>
                    </div>
                    <Button
                      className="w-full button-lift"
                      onClick={() => setActiveTab('compliance')}
                    >
                      Review & Send
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: Trusts & Policies (Combined) */}
          <TabsContent value="trusts-policies" className="space-y-6">
            <Tabs defaultValue="trusts" className="space-y-4">
              <TabsList>
                <TabsTrigger value="trusts">Trusts</TabsTrigger>
                <TabsTrigger value="policies">Policies</TabsTrigger>
                <TabsTrigger value="gift-requests">Gift Requests</TabsTrigger>
              </TabsList>
              <TabsContent value="trusts">
                <TrustsPage />
              </TabsContent>
              <TabsContent value="policies">
                <Policies />
              </TabsContent>
              <TabsContent value="gift-requests">
                <GiftRequestGenerator />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* TAB 3: Compliance (Crummey + Policy Health + Documents) */}
          <TabsContent value="compliance" className="space-y-6">
            <Tabs defaultValue="crummey" className="space-y-4">
              <TabsList>
                <TabsTrigger value="crummey">Crummey Notices</TabsTrigger>
                <TabsTrigger value="health">Policy Health</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>
              <TabsContent value="crummey">
                <CrummeyNotices />
              </TabsContent>
              <TabsContent value="health">
                <PolicyHealth />
              </TabsContent>
              <TabsContent value="documents">
                <DocumentUpload />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* TAB 4: Reports (Tax + Payment summaries + Audit trail) */}
          <TabsContent value="reports" className="space-y-6">
            <Tabs defaultValue="tax" className="space-y-4">
              <TabsList>
                <TabsTrigger value="tax">Tax Reports</TabsTrigger>
                <TabsTrigger value="premium">Premium Payments</TabsTrigger>
                <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              </TabsList>
              <TabsContent value="tax">
                <GiftTaxSummary />
              </TabsContent>
              <TabsContent value="premium">
                <PremiumPaymentSummary />
              </TabsContent>
              <TabsContent value="audit">
                <AuditTrailExport />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* TAB 5: Settings (Email Logs) */}
          <TabsContent value="settings" className="space-y-6">
            <Tabs defaultValue="email" className="space-y-4">
              <TabsList>
                <TabsTrigger value="email">Email Logs</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>
              <TabsContent value="email">
                <EmailLogs />
              </TabsContent>
              <TabsContent value="preferences">
                <Card>
                  <CardHeader>
                    <CardTitle>System Preferences</CardTitle>
                    <CardDescription>Configure your TrustFlow360 settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Preference settings coming soon.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
