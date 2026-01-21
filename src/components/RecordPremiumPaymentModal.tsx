import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, DollarSign, FileText, CheckCircle2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { downloadPaymentReceipt } from './PaymentReceipt';

interface RecordPremiumPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  premium: {
    policy_id: string;
    policy_number: string;
    carrier: string;
    annual_premium: number;
    premium_frequency: string;
    next_premium_date: string;
    trust_name: string;
  };
  onPaymentRecorded: () => void;
}

export function RecordPremiumPaymentModal({ 
  isOpen, 
  onClose, 
  premium,
  onPaymentRecorded 
}: RecordPremiumPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  
  // Form fields
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [checkNumber, setCheckNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  // Calculate payment amount based on frequency
  const calculatePaymentAmount = () => {
    const divisor = premium.premium_frequency === 'monthly' ? 12 : 
                   premium.premium_frequency === 'quarterly' ? 4 : 
                   premium.premium_frequency === 'semi-annual' ? 2 : 1;
    return premium.annual_premium / divisor;
  };

  const paymentAmount = calculatePaymentAmount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get policy details first
      const { data: policy, error: policyError } = await supabase
        .from('insurance_policies')
        .select('premium_frequency, next_premium_date')
        .eq('id', premium.policy_id)
        .single();

      if (policyError) throw policyError;

      // Record the payment
      const { data: payment, error: paymentError } = await supabase
        .from('premium_payments')
        .insert({
          policy_id: premium.policy_id,
          payment_date: paymentDate,
          amount: paymentAmount,
          payment_method: paymentMethod,
          check_number: paymentMethod === 'check' ? checkNumber : null,
          status: 'completed',
          notes: notes || null,
          due_date: policy.next_premium_date,
          payment_source: 'manual'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Calculate next premium date
      const currentDate = new Date(policy.next_premium_date);
      let nextDate = new Date(currentDate);
      
      switch (premium.premium_frequency) {
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'semi-annual':
          nextDate.setMonth(nextDate.getMonth() + 6);
          break;
        case 'annual':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      // Update policy
      const { error: updateError } = await supabase
        .from('insurance_policies')
        .update({
          next_premium_date: nextDate.toISOString().split('T')[0],
          last_premium_paid: paymentDate,
          policy_status: 'active'
        })
        .eq('id', premium.policy_id);

      if (updateError) throw updateError;

      // Delete old reminders
      await supabase
        .from('premium_reminders')
        .delete()
        .eq('policy_id', premium.policy_id)
        .eq('reminder_status', 'pending');

      // Create new reminders
      const reminderDays = [30, 15, 7];
      for (const days of reminderDays) {
        const reminderDate = new Date(nextDate);
        reminderDate.setDate(reminderDate.getDate() - days);
        
        await supabase
          .from('premium_reminders')
          .insert({
            policy_id: premium.policy_id,
            reminder_date: reminderDate.toISOString().split('T')[0],
            reminder_type: `${days}_days`,
            reminder_status: 'pending'
          });
      }

      setSuccess(true);
      setPaymentData({
        paymentId: payment.id,
        paymentDate,
        amount: paymentAmount,
        paymentMethod,
        checkNumber,
        notes,
        nextPremiumDate: nextDate.toISOString().split('T')[0]
      });
      
      // Close modal and refresh after short delay
      setTimeout(() => {
        onPaymentRecorded();
        onClose();
        setSuccess(false);
      }, 1500);
      
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (paymentData) {
      downloadPaymentReceipt({
        paymentId: paymentData.paymentId,
        paymentDate: paymentData.paymentDate,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        checkNumber: paymentData.checkNumber,
        policyNumber: premium.policy_number,
        carrier: premium.carrier,
        premiumFrequency: premium.premium_frequency,
        trustName: premium.trust_name,
        trusteeName: 'Trust Administrator',
        notes: paymentData.notes
      });
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setPaymentMethod('check');
    setCheckNumber('');
    setNotes('');
    setPaymentData(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Premium Payment</DialogTitle>
          <DialogDescription>
            Record payment for {premium.carrier} policy #{premium.policy_number}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Payment Recorded Successfully!</p>
            <p className="text-sm text-gray-500 mt-2">Next premium due: {paymentData?.nextPremiumDate ? formatDate(paymentData.nextPremiumDate) : ''}</p>
            <Button 
              className="mt-4" 
              onClick={handleDownloadReceipt}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Policy Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Trust:</span>
                <span className="font-medium">{premium.trust_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Premium Amount:</span>
                <span className="font-medium">{formatCurrency(paymentAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Frequency:</span>
                <span className="font-medium capitalize">{premium.premium_frequency}</span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="payment-date">
                <CalendarDays className="h-4 w-4 inline mr-1" />
                Payment Date
              </Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="payment-method">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Payment Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="eft">EFT/Wire</SelectItem>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Check Number (conditional) */}
            {paymentMethod === 'check' && (
              <div className="space-y-2">
                <Label htmlFor="check-number">Check Number</Label>
                <Input
                  id="check-number"
                  type="text"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="e.g., 1234"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">
                <FileText className="h-4 w-4 inline mr-1" />
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about this payment..."
                rows={3}
              />
            </div>
{/* Email Confirmation */}
<div className="flex items-center space-x-2">
  <input
    type="checkbox"
    id="sendEmail"
    checked={sendEmail}
    onChange={(e) => setSendEmail(e.target.checked)}
    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
  />
  <label htmlFor="sendEmail" className="text-sm text-gray-700">
    Send confirmation email to trustee
  </label>
</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Recording...' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}