import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react';

// Initialize Supabase client
const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface WorkflowTask {
  id: string;
  trust_id: string;
  task_type: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  workflow_id?: string;
}

interface Trust {
  id: string;
  trust_name: string;
}

interface Workflow {
  id: string;
  trust_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  trusts?: Trust;
  tasks?: WorkflowTask[];
}

export default function WorkflowDashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await fetchWorkflows();
    await fetchTasks();
  };

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select(`
          *,
          trusts (
            id,
            trust_name
          )
        `)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching workflows:', error);
      } else {
        setWorkflows(data || []);
      }
    } catch (err) {
      console.error('Fetch workflows error:', err);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
      } else {
        setTasks(data || []);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('workflow_tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
    } else {
      await fetchTasks();
    }
  };

  const toggleWorkflow = (workflowId: string) => {
    const newExpanded = new Set(expandedWorkflows);
    if (newExpanded.has(workflowId)) {
      newExpanded.delete(workflowId);
    } else {
      newExpanded.add(workflowId);
    }
    setExpandedWorkflows(newExpanded);
  };

  const getTasksByWorkflow = (workflowId: string) => {
    return tasks.filter(task => task.workflow_id === workflowId);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (workflowId: string) => {
    const workflowTasks = getTasksByWorkflow(workflowId);
    if (workflowTasks.length === 0) return 0;
    const completed = workflowTasks.filter(t => t.status === 'completed').length;
    return (completed / workflowTasks.length) * 100;
  };

  const createTestWorkflow = async () => {
    try {
      const { data: trust, error: trustError } = await supabase
        .from('trusts')
        .select('id')
        .limit(1)
        .single();

      if (trustError || !trust) {
        console.error('No trust found:', trustError);
        return;
      }

      const { data: template, error: templateError } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('category', 'crummey_cycle')
        .limit(1)
        .single();

      if (templateError || !template) {
        console.error('No template found:', templateError);
        return;
      }

      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .insert({
          template_id: template.id,
          trust_id: trust.id,
          status: 'active'
        })
        .select()
        .single();

      if (workflowError || !workflow) {
        console.error('Error creating workflow:', workflowError);
        return;
      }

      const tasks = template.steps.map((step: any, index: number) => ({
        workflow_id: workflow.id,
        trust_id: trust.id,
        task_type: 'crummey_notice',
        title: step.title,
        description: step.description,
        status: 'pending',
        due_date: new Date(Date.now() + (step.duration_days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        priority: index === 0 ? 'high' : 'normal'
      }));

      const { error: tasksError } = await supabase
        .from('workflow_tasks')
        .insert(tasks);

      if (tasksError) {
        console.error('Error creating tasks:', tasksError);
      } else {
        console.log('Workflow created successfully!');
        await fetchData();
      }
    } catch (error) {
      console.error('Error in createTestWorkflow:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading workflows...</div>;
  }

  const tasksDueToday = tasks.filter(t => 
    t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString()
  ).length;

  const activeWorkflows = workflows.filter(w => w.status === 'active').length;
  const overdueTasks = tasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">Across all trusts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Due Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasksDueToday}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">Need immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.length > 0 
                ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Test Button */}
      <div className="flex justify-end">
        <Button onClick={createTestWorkflow} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Create Test Workflow
        </Button>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Workflows</h2>
        
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No active workflows. Create a test workflow to get started.</p>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => {
            const workflowTasks = getTasksByWorkflow(workflow.id);
            const progress = calculateProgress(workflow.id);
            const isExpanded = expandedWorkflows.has(workflow.id);
            const trustName = workflow.trusts?.trust_name || 'Unknown Trust';

            return (
              <Card key={workflow.id}>
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleWorkflow(workflow.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <CardTitle className="text-base">
                        {trustName}
                      </CardTitle>
                      <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                        {workflow.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-muted-foreground">
                        {workflowTasks.length} tasks
                      </span>
                      <div className="w-32">
                        <Progress value={progress} className="h-2" />
                      </div>
                      <span className="text-sm font-medium">{Math.round(progress)}%</span>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <div className="space-y-2">
                      {workflowTasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No tasks in this workflow</p>
                      ) : (
                        workflowTasks.map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-1">
                                {task.due_date && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Due {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                {task.assigned_to && (
                                  <span className="text-xs text-muted-foreground">
                                    Assigned to: {task.assigned_to}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(task.status)}>
                                {task.status || 'pending'}
                              </Badge>
                              
                              {task.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTaskStatus(task.id, 'in_progress');
                                  }}
                                >
                                  Start
                                </Button>
                              )}
                              
                              {task.status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTaskStatus(task.id, 'completed');
                                  }}
                                >
                                  Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}