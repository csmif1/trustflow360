import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Trust {
  id: string;
  trust_name: string;
  trust_type: string;
  ein?: string;
}

export default function AnnualTaxReport() {
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [selectedTrustId, setSelectedTrustId] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrusts();
  }, []);

  const fetchTrusts = async () => {
    try {
      const { data, error } = await supabase
        .from('trusts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trusts:', error);
        setTrusts([]);
      } else {
        setTrusts(data || []);
      }
    } catch (err) {
      console.error('Error in fetchTrusts:', err);
      setTrusts([]);
    }
  };

  const generateReport = async () => {
    if (!selectedTrustId) return;

    setLoading(true);
    try {
      // Fetch trust details
      const { data: trust } = await supabase
        .from('trusts')
        .select('*')
        .eq('id', selectedTrustId)
        .single();

      // Fetch contributions (income)
      const { data: contributions } = await supabase
        .from('contributions')
        .select('*')
        .eq('trust_id', selectedTrustId)
        .gte('contribution_date', `${selectedYear}-01-01`)
        .lte('contribution_date', `${selectedYear}-12-31`);

      //// Fetch premium payments (expenses) - join through policies to get trust
const { data: payments } = await supabase
  .from('premium_payments')
  .select(`
    *,
    insurance_policies!inner(
      policy_number,
      carrier,
      trust_id
    )
  `)
  .eq('insurance_policies.trust_id', selectedTrustId)
  .gte('payment_date', `${selectedYear}-01-01`)
  .lte('payment_date', `${selectedYear}-12-31`);

      // Fetch beneficiaries for K-1 allocation
      const { data: beneficiaries } = await supabase
        .from('policy_beneficiaries')
        .select('*')
        .eq('trust_id', selectedTrustId);

      // Calculate totals
      const totalIncome = contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      const totalExpenses = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const netIncome = totalIncome - totalExpenses;

      setReportData({
        trust,
        contributions: contributions || [],
        payments: payments || [],
        beneficiaries: beneficiaries || [],
        totalIncome,
        totalExpenses,
        netIncome,
        year: selectedYear
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportTaxReport = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const { trust, year, totalIncome, totalExpenses, netIncome, beneficiaries } = reportData;

    // Header
    doc.setFontSize(20);
    doc.text('Annual Tax Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`${trust.trust_name}`, 14, 30);
    doc.text(`EIN: ${trust.ein || 'Not provided'}`, 14, 36);
    doc.text(`Tax Year: ${year}`, 14, 42);

    // Income Summary
    doc.setFontSize(14);
    doc.text('Income Summary', 14, 55);
    autoTable(doc, {
      startY: 60,
      head: [['Description', 'Amount']],
      body: [
        ['Total Contributions', `$${totalIncome.toLocaleString()}`],
        ['Other Income', '$0'],
        ['Total Income', `$${totalIncome.toLocaleString()}`]
      ]
    });

    // Expense Summary
    const expenseY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Expense Summary', 14, expenseY);
    autoTable(doc, {
      startY: expenseY + 5,
      head: [['Description', 'Amount']],
      body: [
        ['Insurance Premiums', `$${totalExpenses.toLocaleString()}`],
        ['Administrative Fees', '$0'],
        ['Other Expenses', '$0'],
        ['Total Expenses', `$${totalExpenses.toLocaleString()}`]
      ]
    });

    // Net Income
    const netIncomeY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text(`Net Income: $${netIncome.toLocaleString()}`, 14, netIncomeY);

    // K-1 Allocations
    if (beneficiaries.length > 0) {
      const k1Y = netIncomeY + 15;
      doc.setFontSize(14);
      doc.text('K-1 Beneficiary Allocations', 14, k1Y);
      
      const k1Data = beneficiaries.map((b: any) => [
        b.name,
        `${b.percentage}%`,
        `$${((netIncome * b.percentage) / 100).toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: k1Y + 5,
        head: [['Beneficiary', 'Percentage', 'Allocated Income']],
        body: k1Data
      });
    }

    // Form 1041 Worksheet
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Form 1041 Worksheet', 14, 20);
    doc.setFontSize(12);
    doc.text('U.S. Income Tax Return for Estates and Trusts', 14, 28);
    
    const form1041Data = [
      ['Line 1 - Interest Income', '$0'],
      ['Line 2 - Dividends', '$0'],
      ['Line 3 - Business Income', '$0'],
      ['Line 4 - Capital Gains', '$0'],
      ['Line 5 - Rents, Royalties', '$0'],
      ['Line 6 - Farm Income', '$0'],
      ['Line 7 - Ordinary Gain', '$0'],
      ['Line 8 - Other Income', `$${totalIncome.toLocaleString()}`],
      ['Line 9 - Total Income', `$${totalIncome.toLocaleString()}`],
      ['', ''],
      ['Line 10 - Interest', '$0'],
      ['Line 11 - Taxes', '$0'],
      ['Line 12 - Fiduciary Fees', '$0'],
      ['Line 13 - Charitable Deduction', '$0'],
      ['Line 14 - Attorney Fees', '$0'],
      ['Line 15a - Other Deductions', `$${totalExpenses.toLocaleString()}`],
      ['Line 16 - Total Deductions', `$${totalExpenses.toLocaleString()}`],
      ['', ''],
      ['Line 17 - Adjusted Total Income', `$${netIncome.toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: 35,
      head: [['Form 1041 Line Item', 'Amount']],
      body: form1041Data,
      theme: 'striped'
    });

    // Save the PDF
    doc.save(`${trust.trust_name.replace(/\s+/g, '_')}_${year}_Tax_Report.pdf`);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Annual Tax Reporting
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate tax reports and K-1 preparation worksheets
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Select Trust</label>
              <Select value={selectedTrustId} onValueChange={setSelectedTrustId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a trust" />
                </SelectTrigger>
                <SelectContent>
                  {trusts.map((trust) => (
                    <SelectItem key={trust.id} value={trust.id}>
                      {trust.trust_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tax Year</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={generateReport}
            disabled={!selectedTrustId || loading}
            className="w-full"
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Tax Report Summary - {reportData.year}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {reportData.trust.trust_name}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Income</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Contributions:</span>
                    <span>${reportData.totalIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total Income:</span>
                    <span>${reportData.totalIncome.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Expenses</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Insurance Premiums:</span>
                    <span>${reportData.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total Expenses:</span>
                    <span>${reportData.totalExpenses.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg font-semibold">
                <span>Net Income:</span>
                <span>${reportData.netIncome.toLocaleString()}</span>
              </div>
            </div>

            {reportData.beneficiaries.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">K-1 Allocations</h3>
                <div className="space-y-1 text-sm">
                  {reportData.beneficiaries.map((b: any) => (
                    <div key={b.id} className="flex justify-between">
                      <span>{b.name} ({b.percentage}%):</span>
                      <span>${((reportData.netIncome * b.percentage) / 100).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={exportTaxReport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Tax Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}