import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  FileText, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Shield,
  Settings,
  Mail,
  TrendingUp,
  FolderOpen
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminDashboardProps {
  role: 'attorney' | 'advisor' | 'officer';
  trustId: string | null;
}

export const AdminDashboard = ({ role, trustId }: AdminDashboardProps) => {
  const [trustData, setTrustData] = useState<any>(null);
  const [workflowTasks, setWorkflowTasks] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [premiumPayments, setPremiumPayments] = useState<any[]>([]);
  const [taxFilings, setTaxFilings] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);

  useEffect(() => {
    if (trustId) {
      fetchTrustData();
    }
  }, [trustId]);

  const fetchTrustData = async () => {
    if (!trustId) return;

    try {
      // Fetch trust data
      const { data: trust } = await supabase
        .from('trusts')
        .select('*')
        .eq('id', trustId)
        .single();

      setTrustData(trust);

      // Fetch workflow tasks
      const { data: tasks } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('trust_id', trustId)
        .order('due_date', { ascending: true });

      setWorkflowTasks(tasks || []);

      // Fetch beneficiaries
      const { data: beneficiaryData } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('trust_id', trustId);

      setBeneficiaries(beneficiaryData || []);

      // Fetch insurance policies
      const { data: policyData } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('trust_id', trustId);

      setPolicies(policyData || []);

      // Fetch premium payments
      const { data: premiumData } = await supabase
        .from('premium_payments')
        .select('*, insurance_policies(*)')
        .order('due_date', { ascending: true });

      setPremiumPayments(premiumData || []);

      // Fetch tax filings
      const { data: taxData } = await supabase
        .from('tax_filings')
        .select('*')
        .eq('trust_id', trustId)
        .order('due_date', { ascending: true });

      setTaxFilings(taxData || []);

      // Fetch communications
      const { data: commData } = await supabase
        .from('communications')
        .select('*')
        .eq('trust_id', trustId)
        .order('created_at', { ascending: false });

      setCommunications(commData || []);

    } catch (error) {
      console.error('Error fetching trust data:', error);
    }
  };

  const getRoleSpecificTitle = () => {
    switch (role) {
      case 'attorney':
        return "Estate Planning Attorney Dashboard";
      case 'advisor':
        return "Wealth Management Dashboard";
      case 'officer':
        return "Trust Officer Dashboard";
      default:
        return "ILIT Administration Dashboard";
    }
  };

  const markTaskComplete = async (taskId: string) => {
    try {
      await supabase
        .from('workflow_tasks')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', taskId);

      fetchTrustData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!trustId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>No Trust Selected</CardTitle>
            <CardDescription>
              Please complete the data intake form to access the dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">{getRoleSpecificTitle()}</h2>
          {trustData && (
            <p className="text-muted-foreground mt-1">
              {trustData.trust_name} - {trustData.grantor_name}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="bg-accent text-accent-foreground">
          Live Data
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Tasks
                  </CardTitle>
                  <Settings className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {workflowTasks.filter(t => t.status !== 'completed').length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Beneficiaries
                  </CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {beneficiaries.length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Insurance Policies
                  </CardTitle>
                  <Shield className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {policies.length}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tax Filings
                  </CardTitle>
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {taxFilings.length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription>
                  Critical dates requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {workflowTasks.filter(t => t.status !== 'completed').slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </div>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Recent Communications
                </CardTitle>
                <CardDescription>
                  Latest activity and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {communications.slice(0, 3).map((comm) => (
                  <div key={comm.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div>
                      <p className="font-medium">{comm.subject}</p>
                      <p className="text-sm text-muted-foreground">{comm.recipient_type}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${getStatusColor(comm.status)}`}>
                      {comm.status}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Workflow Tasks
              </CardTitle>
              <CardDescription>
                Manage all ILIT administration tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflowTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{task.title}</h3>
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Due: {task.due_date}</span>
                      <span>Status: {task.status}</span>
                    </div>
                  </div>
                  {task.status !== 'completed' && (
                    <Button
                      onClick={() => markTaskComplete(task.id)}
                      variant="outline"
                      size="sm"
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Document Management
              </CardTitle>
              <CardDescription>
                Trust documents and automated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Document management system coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beneficiaries" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Beneficiary Management
              </CardTitle>
              <CardDescription>
                Track and communicate with trust beneficiaries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {beneficiaries.map((beneficiary) => (
                <div key={beneficiary.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div>
                    <h3 className="font-medium">{beneficiary.name}</h3>
                    <p className="text-sm text-muted-foreground">{beneficiary.relationship}</p>
                    <p className="text-sm text-muted-foreground">{beneficiary.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{beneficiary.percentage}%</p>
                    <p className="text-xs text-muted-foreground">
                      {beneficiary.is_primary ? 'Primary' : 'Secondary'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Premium Payments
              </CardTitle>
              <CardDescription>
                Insurance premium scheduling and tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Premium payment tracking system coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Reports & Analytics
              </CardTitle>
              <CardDescription>
                Annual reports and compliance analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Analytics and reporting system coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};