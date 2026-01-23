import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  FileText,
  UserPlus,
  User,
  X,
  Check
} from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PolicyHealthCheck {
  id: string;
  policy_id: string;
  trust_id: string;
  check_date: string;
  overall_status: 'healthy' | 'warning' | 'critical' | 'unknown';
  health_score: number;
  component_scores: {
    premium_payment: number;
    coverage_adequacy: number;
    compliance: number;
  };
  issues_detected: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    requires_remediation: boolean;
  }>;
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
  }>;
  ai_analysis_summary: string;
  ai_confidence_score: number;
  remediation_required: boolean;
}

interface Policy {
  id: string;
  policy_number: string;
  carrier: string;
  policy_status: string;
  annual_premium: number;
  death_benefit: number;
  trust_id: string;
  trusts: {
    trust_name: string;
    trustee_name: string;
  };
}

interface RemediationAction {
  id: string;
  policy_id: string;
  health_check_id: string;
  action_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string;
  email_alert_sent: boolean;
  created_at: string;
  assigned_to?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  assigned_at?: string;
  assigned_by?: string;
  completed_at?: string;
  completed_by?: string;
  completion_notes?: string;
}

const PolicyHealth: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [healthChecks, setHealthChecks] = useState<Record<string, PolicyHealthCheck>>({});
  const [remediationActions, setRemediationActions] = useState<RemediationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');
  const [assigningAction, setAssigningAction] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<RemediationAction | null>(null);
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'my' | 'unassigned'>('all');
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completingAction, setCompletingAction] = useState(false);
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch policies with their latest health checks
      const { data: policiesData, error: policiesError } = await supabase
        .from('insurance_policies')
        .select(`
          *,
          trusts!inner(trust_name, trustee_name)
        `);

      if (policiesError) throw policiesError;

      setPolicies(policiesData || []);

      // Fetch latest health check for each policy
      const { data: healthData, error: healthError } = await supabase
        .from('policy_health_checks')
        .select('*')
        .order('check_date', { ascending: false });

      if (healthError) throw healthError;

      // Group health checks by policy (most recent first)
      const healthMap: Record<string, PolicyHealthCheck> = {};
      healthData?.forEach(check => {
        if (!healthMap[check.policy_id]) {
          healthMap[check.policy_id] = check;
        }
      });

      setHealthChecks(healthMap);

      // Fetch pending remediation actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('remediation_actions')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });

      if (actionsError) throw actionsError;

      setRemediationActions(actionsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async (policyId: string) => {
    setRunningCheck(policyId);
    try {
      const response = await fetch(
        'https://fnivqabphgbmkzpwowwg.supabase.co/functions/v1/analyze-policy-health',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            policy_id: policyId,
            check_trigger: 'manual'
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to run health check');
      }

      const result = await response.json();
      console.log('Health check result:', result);

      // Refresh data
      await fetchData();

      showToast('Health check completed successfully', 'success');
    } catch (error) {
      console.error('Error running health check:', error);
      showToast('Failed to run health check', 'error');
    } finally {
      setRunningCheck(null);
    }
  };

  const openAssignDialog = (action: RemediationAction) => {
    setSelectedAction(action);
    setAssigneeName(action.assigned_to_name || '');
    setAssigneeEmail(action.assigned_to_email || '');
    setShowAssignDialog(true);
  };

  const closeAssignDialog = () => {
    setShowAssignDialog(false);
    setSelectedAction(null);
    setAssigneeName('');
    setAssigneeEmail('');
  };

  const assignAction = async () => {
    if (!selectedAction || !assigneeName || !assigneeEmail) {
      showToast('Please enter both name and email', 'error');
      return;
    }

    setAssigningAction(selectedAction.id);
    try {
      const response = await fetch(
        'https://fnivqabphgbmkzpwowwg.supabase.co/functions/v1/assign-action',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            action_id: selectedAction.id,
            assigned_to_name: assigneeName,
            assigned_to_email: assigneeEmail
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to assign action');
      }

      const result = await response.json();
      console.log('Assignment result:', result);

      // Refresh data
      await fetchData();

      showToast(
        result.email_sent
          ? 'Action assigned and notification sent'
          : 'Action assigned (email notification failed)',
        'success'
      );

      closeAssignDialog();
    } catch (error) {
      console.error('Error assigning action:', error);
      showToast('Failed to assign action', 'error');
    } finally {
      setAssigningAction(null);
    }
  };

  const openCompleteDialog = (action: RemediationAction | null = null) => {
    if (action) {
      setSelectedAction(action);
      setSelectedActionIds(new Set([action.id]));
    }
    setCompletionNotes('');
    setShowCompleteDialog(true);
  };

  const closeCompleteDialog = () => {
    setShowCompleteDialog(false);
    setSelectedAction(null);
    setCompletionNotes('');
    if (selectedActionIds.size > 1) {
      setSelectedActionIds(new Set());
    }
  };

  const completeActions = async () => {
    if (!completionNotes.trim()) {
      showToast('Please enter completion notes', 'error');
      return;
    }

    if (completionNotes.length > 500) {
      showToast('Notes must be 500 characters or less', 'error');
      return;
    }

    setCompletingAction(true);
    try {
      const actionIdsArray = Array.from(selectedActionIds);
      const isBulk = actionIdsArray.length > 1;

      const response = await fetch(
        'https://fnivqabphgbmkzpwowwg.supabase.co/functions/v1/complete-action',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify(
            isBulk
              ? { action_ids: actionIdsArray, notes: completionNotes.trim() }
              : { action_id: actionIdsArray[0], notes: completionNotes.trim() }
          )
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete action(s)');
      }

      const result = await response.json();
      console.log('Completion result:', result);

      // Refresh data
      await fetchData();

      showToast(
        isBulk
          ? `Successfully completed ${actionIdsArray.length} action(s)`
          : 'Action completed successfully',
        'success'
      );

      closeCompleteDialog();
      setSelectedActionIds(new Set());
    } catch (error) {
      console.error('Error completing action(s):', error);
      showToast(error.message || 'Failed to complete action(s)', 'error');
    } finally {
      setCompletingAction(false);
    }
  };

  const toggleActionSelection = (actionId: string) => {
    const newSelection = new Set(selectedActionIds);
    if (newSelection.has(actionId)) {
      newSelection.delete(actionId);
    } else {
      newSelection.add(actionId);
    }
    setSelectedActionIds(newSelection);
  };

  const toggleSelectAll = () => {
    const pendingActions = remediationActions.filter(a => a.status !== 'completed');
    if (selectedActionIds.size === pendingActions.length) {
      setSelectedActionIds(new Set());
    } else {
      setSelectedActionIds(new Set(pendingActions.map(a => a.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      default: return <Minus className="w-5 h-5" />;
    }
  };

  const getScoreTrend = (score: number) => {
    if (score >= 80) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (score >= 50) return <Minus className="w-4 h-4 text-yellow-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toastEl = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    toastEl.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  };

  // Calculate summary statistics
  const totalPolicies = policies.length;
  const healthyCount = Object.values(healthChecks).filter(h => h.overall_status === 'healthy').length;
  const warningCount = Object.values(healthChecks).filter(h => h.overall_status === 'warning').length;
  const criticalCount = Object.values(healthChecks).filter(h => h.overall_status === 'critical').length;
  const urgentActionsCount = remediationActions.filter(a => a.priority === 'urgent').length;

  // Filter policies
  const filteredPolicies = policies.filter(policy => {
    if (filter === 'all') return true;
    const healthCheck = healthChecks[policy.id];
    return healthCheck?.overall_status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Policy Health Monitoring</h1>
        <p className="text-muted-foreground">
          AI-powered health analysis and automated remediation tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPolicies}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalPolicies > 0 ? Math.round((healthyCount / totalPolicies) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warningCount}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Urgent action needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Actions</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urgentActionsCount}</div>
            <p className="text-xs text-muted-foreground">Pending tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="actions">Remediation Actions ({remediationActions.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Policies
            </Button>
            <Button
              variant={filter === 'healthy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('healthy')}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Healthy
            </Button>
            <Button
              variant={filter === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('warning')}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Warning
            </Button>
            <Button
              variant={filter === 'critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('critical')}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Critical
            </Button>
          </div>

          {/* Policy List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPolicies.map(policy => {
              const healthCheck = healthChecks[policy.id];
              const policyActions = remediationActions.filter(a => a.policy_id === policy.id);

              return (
                <Card key={policy.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(healthCheck?.overall_status || 'unknown')}`} />
                        <CardTitle className="text-lg">{policy.policy_number}</CardTitle>
                      </div>
                      {healthCheck && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getScoreTrend(healthCheck.health_score)}
                          {Math.round(healthCheck.health_score)}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {policy.trusts.trust_name} • {policy.carrier}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {healthCheck ? (
                      <>
                        {/* Health Score */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Health Score</span>
                            <span className="font-medium">{Math.round(healthCheck.health_score)}/100</span>
                          </div>
                          <Progress value={healthCheck.health_score} />
                        </div>

                        {/* Component Scores */}
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Premium Payment</span>
                            <span>{Math.round(healthCheck.component_scores.premium_payment)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Coverage Adequacy</span>
                            <span>{Math.round(healthCheck.component_scores.coverage_adequacy)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Compliance</span>
                            <span>{Math.round(healthCheck.component_scores.compliance)}%</span>
                          </div>
                        </div>

                        {/* Issues */}
                        {healthCheck.issues_detected.length > 0 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              {healthCheck.issues_detected.length} issue{healthCheck.issues_detected.length !== 1 ? 's' : ''} detected
                              {policyActions.length > 0 && ` • ${policyActions.length} action${policyActions.length !== 1 ? 's' : ''} pending`}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Last Check */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Last checked: {new Date(healthCheck.check_date).toLocaleDateString()}
                        </div>
                      </>
                    ) : (
                      <Alert>
                        <AlertDescription>
                          No health check available. Run analysis to get started.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => runHealthCheck(policy.id)}
                        disabled={runningCheck === policy.id}
                      >
                        {runningCheck === policy.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Run Check
                          </>
                        )}
                      </Button>
                      {healthCheck && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPolicy(policy.id)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Remediation Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          {/* Action Filters and Bulk Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button
                variant={actionFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActionFilter('all')}
              >
                All Actions
              </Button>
              <Button
                variant={actionFilter === 'unassigned' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActionFilter('unassigned')}
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Unassigned
              </Button>
            </div>
            {selectedActionIds.size > 0 && (
              <Button
                size="sm"
                variant="default"
                onClick={() => openCompleteDialog()}
              >
                <Check className="w-4 h-4 mr-2" />
                Complete Selected ({selectedActionIds.size})
              </Button>
            )}
          </div>

          {/* Bulk Selection Header */}
          {remediationActions.filter(a => a.status !== 'completed').length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <Checkbox
                checked={selectedActionIds.size === remediationActions.filter(a => a.status !== 'completed').length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all pending actions
              </span>
            </div>
          )}

          {remediationActions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">No pending remediation actions</p>
                <p className="text-sm text-muted-foreground">All policies are healthy or actions have been completed</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {remediationActions
                .filter(action => {
                  if (actionFilter === 'unassigned') return !action.assigned_to_email;
                  return true;
                })
                .map(action => {
                const policy = policies.find(p => p.id === action.policy_id);
                const daysUntilDue = Math.ceil((new Date(action.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntilDue < 0;
                const isUrgent = daysUntilDue <= 3;

                const getPriorityColor = (priority: string) => {
                  switch (priority) {
                    case 'urgent': return 'destructive';
                    case 'high': return 'default';
                    case 'medium': return 'secondary';
                    default: return 'outline';
                  }
                };

                const isCompleted = action.status === 'completed';

                return (
                  <Card
                    key={action.id}
                    className={`${
                      isCompleted
                        ? 'bg-gray-50 opacity-75'
                        : isOverdue
                        ? 'border-red-500 border-2'
                        : ''
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        {!isCompleted && (
                          <Checkbox
                            checked={selectedActionIds.has(action.id)}
                            onCheckedChange={() => toggleActionSelection(action.id)}
                            className="mt-1"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isCompleted && (
                                <Badge variant="outline" className="bg-green-50 border-green-500 text-green-700">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Completed
                                </Badge>
                              )}
                              <Badge variant={getPriorityColor(action.priority)}>
                                {action.priority}
                              </Badge>
                              {!isCompleted && isOverdue && (
                                <Badge variant="destructive">OVERDUE</Badge>
                              )}
                              {!isCompleted && isUrgent && !isOverdue && (
                                <Badge variant="outline" className="border-red-500 text-red-500">URGENT</Badge>
                              )}
                              {action.assigned_to_name && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {action.assigned_to_name}
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {policy?.policy_number}
                            </span>
                          </div>
                          <CardTitle className="text-lg">{action.title}</CardTitle>
                          <CardDescription>
                            {policy?.trusts.trust_name}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Due Date / Completion Info */}
                        <div className="flex items-center gap-2 text-sm">
                          {isCompleted ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-muted-foreground">
                                Completed: {new Date(action.completed_at!).toLocaleDateString()}
                              </span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className={isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}>
                                Due: {new Date(action.due_date).toLocaleDateString()}
                                {isOverdue ? ` (${Math.abs(daysUntilDue)} days overdue)` : ` (${daysUntilDue} days)`}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Completion Notes */}
                        {isCompleted && action.completion_notes && (
                          <div className="bg-white p-3 rounded border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Completion Notes:</p>
                            <p className="text-sm text-gray-700">{action.completion_notes}</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {!isCompleted && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant={action.assigned_to_name ? 'outline' : 'default'}
                              onClick={() => openAssignDialog(action)}
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              {action.assigned_to_name ? 'Reassign' : 'Assign'}
                            </Button>
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openCompleteDialog(action)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Mark Complete
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Remediation Action</DialogTitle>
            <DialogDescription>
              Assign this action to a team member. They will receive an email notification with action details.
            </DialogDescription>
          </DialogHeader>

          {selectedAction && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Action:</span>
                  <span className="text-sm">{selectedAction.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Priority:</span>
                  <Badge variant="outline">{selectedAction.priority}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Due Date:</span>
                  <span className="text-sm">{new Date(selectedAction.due_date).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assignee-name">Team Member Name</Label>
                  <Input
                    id="assignee-name"
                    placeholder="e.g., Jane Smith"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignee-email">Email Address</Label>
                  <Input
                    id="assignee-email"
                    type="email"
                    placeholder="e.g., jane@firm.com"
                    value={assigneeEmail}
                    onChange={(e) => setAssigneeEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeAssignDialog}>
              Cancel
            </Button>
            <Button
              onClick={assignAction}
              disabled={!!assigningAction || !assigneeName || !assigneeEmail}
            >
              {assigningAction ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign & Notify
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedActionIds.size > 1
                ? `Complete ${selectedActionIds.size} Actions`
                : 'Complete Remediation Action'}
            </DialogTitle>
            <DialogDescription>
              {selectedActionIds.size > 1
                ? 'Add notes describing how these actions were resolved. Notes are required for audit trail compliance.'
                : 'Add notes describing how this action was resolved. Notes are required for audit trail compliance.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedAction && selectedActionIds.size === 1 && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Action:</span>
                  <span className="text-sm">{selectedAction.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trust:</span>
                  <span className="text-sm text-muted-foreground">
                    {policies.find(p => p.id === selectedAction.policy_id)?.trusts.trust_name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Priority:</span>
                  <Badge variant="outline">{selectedAction.priority}</Badge>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="completion-notes">
                Completion Notes <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="completion-notes"
                placeholder="Describe how this was resolved (e.g., 'Premium payment confirmed via check #1234. Deposited 1/23/26.')"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Required for compliance documentation</span>
                <span className={completionNotes.length > 450 ? 'text-amber-600 font-medium' : ''}>
                  {completionNotes.length}/500
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeCompleteDialog}>
              Cancel
            </Button>
            <Button
              onClick={completeActions}
              disabled={completingAction || !completionNotes.trim()}
            >
              {completingAction ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {selectedActionIds.size > 1 ? `Complete ${selectedActionIds.size} Actions` : 'Complete Action'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PolicyHealth;
