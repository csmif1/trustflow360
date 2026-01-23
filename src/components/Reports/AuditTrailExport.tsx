import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, Activity, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AuditRecord {
  timestamp: string;
  entity_type: string;
  entity_id: string;
  action: string;
  model_name?: string;
  confidence_score?: number;
  success: boolean;
  details: string;
}

interface AuditSummary {
  total_records: number;
  ai_processed_records: number;
  manual_records: number;
  success_rate: number;
  date_range: {
    start: string;
    end: string;
  };
}

const ENTITY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'policy_health', label: 'Policy Health' },
  { value: 'premium_payment', label: 'Premium Payment' },
  { value: 'gift', label: 'Gift' },
  { value: 'crummey_notice', label: 'Crummey Notice' },
  { value: 'document', label: 'Document' },
  { value: 'beneficiary', label: 'Beneficiary' }
];

export default function AuditTrailExport() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entityType, setEntityType] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Set default date range to last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);

    // Load initial data
    fetchAuditTrail();
  }, []);

  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/audit-trail-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          entity_type: entityType || undefined,
          export_format: 'json'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }

      const data = await response.json();
      setRecords(data.records || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      // Show error toast
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/audit-trail-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          entity_type: entityType || undefined,
          export_format: 'csv'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-gray-200 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {summary.total_records}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Audit trail entries
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                AI Processed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary-800">
                {summary.ai_processed_records}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                AI-powered actions
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {summary.success_rate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Successful operations
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Manual Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {summary.manual_records}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                User-initiated actions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Export */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle>Audit Trail Export</CardTitle>
          <CardDescription>
            Filter and export compliance audit trail records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="entity-type">Entity Type</Label>
              <select
                id="entity-type"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={fetchAuditTrail}
                disabled={loading}
                className="flex-1"
              >
                <Filter className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Apply Filters'}
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={exporting || records.length === 0}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'CSV'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail Table */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle>Audit Records</CardTitle>
          <CardDescription>
            {records.length} record{records.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Loading audit trail...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No audit records found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record, index) => (
                    <TableRow key={`${record.entity_id}-${index}`}>
                      <TableCell className="font-medium text-sm">
                        {new Date(record.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {record.entity_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{record.action}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {record.model_name || '-'}
                      </TableCell>
                      <TableCell>
                        {record.confidence_score ? (
                          <span className={`text-sm font-medium ${
                            record.confidence_score >= 0.8 ? 'text-success' :
                            record.confidence_score >= 0.6 ? 'text-warning' :
                            'text-danger'
                          }`}>
                            {(record.confidence_score * 100).toFixed(0)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {record.success ? (
                          <Badge className="bg-success-light text-success-dark">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Success
                          </Badge>
                        ) : (
                          <Badge className="bg-danger-light text-danger-dark">
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-md truncate">
                        {record.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
