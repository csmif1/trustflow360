import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, DollarSign, TrendingUp, Calendar } from 'lucide-react';

const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PaymentRecord {
  payment_id: string;
  payment_date: string;
  policy_number: string;
  trust_name: string;
  grantor_name: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
}

interface PaymentSummary {
  total_amount: number;
  payment_count: number;
  average_payment: number;
  date_range: {
    start: string;
    end: string;
  };
}

export default function PremiumPaymentSummary() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // Set default date range to current year
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    setStartDate(yearStart.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);

    // Load initial data
    fetchPaymentSummary();
  }, []);

  const fetchPaymentSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/premium-payment-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          export_format: 'json'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment summary');
      }

      const data = await response.json();
      setPayments(data.payments || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      // Show error toast
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/premium-payment-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          start_date: startDate || undefined,
          end_date: endDate || undefined,
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
      a.download = `premium-payments-${new Date().toISOString().split('T')[0]}.csv`;
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-gray-200 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                ${summary.total_amount.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {summary.payment_count} payments
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Average Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                ${summary.average_payment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Per transaction
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-gray-900">
                {summary.date_range.start === 'all time'
                  ? 'All Time'
                  : new Date(summary.date_range.start).toLocaleDateString()}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                to {summary.date_range.end === 'present'
                  ? 'Present'
                  : new Date(summary.date_range.end).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Export */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle>Premium Payment Summary</CardTitle>
          <CardDescription>
            Filter and export premium payment records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex items-end gap-2">
              <Button
                onClick={fetchPaymentSummary}
                disabled={loading}
                className="flex-1"
              >
                <Filter className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Apply Filters'}
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={exporting || payments.length === 0}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'CSV'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            {payments.length} payment{payments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Trust</TableHead>
                  <TableHead>Grantor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Loading payments...
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No payments found for the selected date range
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.payment_id}>
                      <TableCell className="font-medium">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{payment.policy_number}</TableCell>
                      <TableCell>{payment.trust_name}</TableCell>
                      <TableCell>{payment.grantor_name}</TableCell>
                      <TableCell className="font-semibold">
                        ${payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            payment.payment_status === 'completed'
                              ? 'bg-success-light text-success-dark'
                              : payment.payment_status === 'pending'
                              ? 'bg-warning-light text-warning-dark'
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {payment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {payment.notes || '-'}
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
