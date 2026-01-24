import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, DollarSign, Users, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { getAnnualExclusion } from '@/config/taxConstants';

const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface GiftSummaryRow {
  donor_name: string;
  donor_email: string | null;
  beneficiary_name: string;
  trust_name: string;
  tax_year: number;
  total_gifts: number;
  gift_count: number;
  exceeds_exclusion: boolean;
  excess_amount: number;
}

interface SummaryTotals {
  total_donors: number;
  total_beneficiaries: number;
  total_gift_amount: number;
  gifts_exceeding_exclusion: number;
}

interface Trust {
  id: string;
  trust_name: string;
}

const GiftTaxSummary: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedDonor, setSelectedDonor] = useState<string>('all');
  const [selectedTrust, setSelectedTrust] = useState<string>('all');
  const [summary, setSummary] = useState<GiftSummaryRow[]>([]);
  const [totals, setTotals] = useState<SummaryTotals>({
    total_donors: 0,
    total_beneficiaries: 0,
    total_gift_amount: 0,
    gifts_exceeding_exclusion: 0
  });
  const [annualExclusion, setAnnualExclusion] = useState<number>(0);
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [donors, setDonors] = useState<string[]>([]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchTrustsAndDonors();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [selectedYear, selectedDonor, selectedTrust]);

  const fetchTrustsAndDonors = async () => {
    try {
      // Fetch trusts
      const { data: trustsData } = await supabase
        .from('trusts')
        .select('id, trust_name')
        .order('trust_name');

      if (trustsData) {
        setTrusts(trustsData);
      }

      // Fetch unique donors
      const { data: giftsData } = await supabase
        .from('gifts')
        .select('donor_name')
        .order('donor_name');

      if (giftsData) {
        const uniqueDonors = Array.from(new Set(giftsData.map(g => g.donor_name)));
        setDonors(uniqueDonors);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedDonor !== 'all') params.append('donor', selectedDonor);
      if (selectedTrust !== 'all') params.append('trust_id', selectedTrust);

      const response = await fetch(
        `https://fnivqabphgbmkzpwowwg.supabase.co/functions/v1/gift-tax-summary/summary?${params.toString()}`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch gift tax summary');
      }

      const data = await response.json();
      setSummary(data.summary || []);
      setTotals(data.totals || {
        total_donors: 0,
        total_beneficiaries: 0,
        total_gift_amount: 0,
        gifts_exceeding_exclusion: 0
      });
      setAnnualExclusion(data.annual_exclusion || getAnnualExclusion(parseInt(selectedYear)));
    } catch (error) {
      console.error('Error fetching summary:', error);
      showToast('Failed to load gift tax summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedDonor !== 'all') params.append('donor', selectedDonor);
      if (selectedTrust !== 'all') params.append('trust_id', selectedTrust);

      const response = await fetch(
        `https://fnivqabphgbmkzpwowwg.supabase.co/functions/v1/gift-tax-summary/export?${params.toString()}`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export gift tax summary');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gift-tax-summary-${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Gift tax summary exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting summary:', error);
      showToast('Failed to export gift tax summary', 'error');
    } finally {
      setExporting(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toastEl = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    toastEl.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gift Tax Summary</h2>
          <p className="text-muted-foreground">
            Track annual gift exclusions and Form 709 filing requirements
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={exporting || summary.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter gift tax summary by year, donor, or trust</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tax Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Donor</label>
              <Select value={selectedDonor} onValueChange={setSelectedDonor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select donor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Donors</SelectItem>
                  {donors.map(donor => (
                    <SelectItem key={donor} value={donor}>
                      {donor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Trust</label>
              <Select value={selectedTrust} onValueChange={setSelectedTrust}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trust" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trusts</SelectItem>
                  {trusts.map(trust => (
                    <SelectItem key={trust.id} value={trust.id}>
                      {trust.trust_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gifts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.total_gift_amount)}</div>
            <p className="text-xs text-muted-foreground">
              For {selectedYear === 'all' ? 'all years' : selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gift Count</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.reduce((sum, s) => sum + s.gift_count, 0)}</div>
            <p className="text-xs text-muted-foreground">
              Individual gift transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Donors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total_donors}</div>
            <p className="text-xs text-muted-foreground">
              Making contributions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Exclusion</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.gifts_exceeding_exclusion}</div>
            <p className="text-xs text-muted-foreground">
              Require Form 709
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Gift Detail</CardTitle>
          <CardDescription>
            Annual exclusion for {selectedYear === 'all' ? '2024' : selectedYear}: {formatCurrency(annualExclusion)} per donor per beneficiary
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : summary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No gifts found for selected filters
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Trust</TableHead>
                    <TableHead className="text-right">Total Gifts</TableHead>
                    <TableHead className="text-center">Count</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div>{row.donor_name}</div>
                        {row.donor_email && (
                          <div className="text-xs text-muted-foreground">{row.donor_email}</div>
                        )}
                      </TableCell>
                      <TableCell>{row.beneficiary_name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.trust_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.total_gifts)}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {row.gift_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.exceeds_exclusion ? (
                          <div className="flex items-center justify-end gap-2">
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Form 709
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              +{formatCurrency(row.excess_amount)}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 border-green-500 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Under Limit
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">CPA Handoff</p>
              <p>
                This summary provides the data needed for Form 709 (Gift Tax Return) preparation.
                Export the CSV and provide it to your CPA or tax preparer along with supporting documentation.
                Gifts exceeding the annual exclusion do not necessarily trigger tax liability, but must be reported.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GiftTaxSummary;
