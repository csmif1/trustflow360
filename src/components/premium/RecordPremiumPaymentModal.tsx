import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarDays, DollarSign, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';

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
  
  // Form fields
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('check');
  const [checkNumber, setCheckNumber] = useState('');
  const [notes, setNotes] = useState('');

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
      const { data, error: fnError } = await supabase.functions.invoke('record-premium-payment', {
        body: {
          policy_id: premium.policy_id,
          payment_date: paymentDate,
          amount: paymentAmount,
          payment_method: paymentMethod,
          check_number: paymentMethod === 'check' ? checkNumber : null,
          notes: notes || null
        }
      });

      if (fnError) throw fnError;

      setSuccess(true);
      
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

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setPaymentMethod('check');
    setCheckNumber('');
    setNotes('');
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
            <p className="text-sm text-gray-500 mt-2">Next premium due: {formatDate(premium.next_premium_date)}</p>
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