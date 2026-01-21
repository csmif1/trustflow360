import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GiftRecordingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Trust {
  id: string;
  trust_name: string;
  ilits?: {
    id: string;
    ein: string;
  }[];
}

interface Beneficiary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship?: string;
  withdrawal_percentage: number;
}

export function GiftRecordingModal({
  open,
  onOpenChange,
  onSuccess,
}: GiftRecordingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  
  // Form fields
  const [amount, setAmount] = useState('');
  const [trustId, setTrustId] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorSsnMasked, setDonorSsnMasked] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [giftDate, setGiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Fetch trusts on component mount
  useEffect(() => {
    const fetchTrusts = async () => {
      try {
        const { data, error } = await supabase
          .from('trusts')
          .select(`
            id, 
            trust_name,
            ilits!inner(
              id,
              ein
            )
          `)
          .order('trust_name');

        if (error) throw error;
        setTrusts(data || []);
      } catch (error) {
        console.error('Error fetching trusts:', error);
        toast({
          title: "Error",
          description: "Failed to load trusts",
          variant: "destructive",
        });
      }
    };

    if (open) {
      fetchTrusts();
    }
  }, [open, toast]);

  // Fetch beneficiaries when trust is selected
  useEffect(() => {
    const fetchBeneficiaries = async () => {
      if (!trustId) {
        setBeneficiaries([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('beneficiaries')
          .select('*')
          .eq('trust_id', trustId)
          .order('name');

        if (error) throw error;
        setBeneficiaries(data || []);
      } catch (error) {
        console.error('Error fetching beneficiaries:', error);
        toast({
          title: "Error",
          description: "Failed to load beneficiaries",
          variant: "destructive",
        });
      }
    };

    fetchBeneficiaries();
  }, [trustId, toast]);

  const calculateWithdrawalDeadline = (noticeDate: string) => {
    const date = new Date(noticeDate);
    date.setDate(date.getDate() + 30); // 30 days for withdrawal right
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trustId || !amount || !donorName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Get the ILIT record for the trust
      const { data: ilit, error: ilitError } = await supabase
        .from('ilits')
        .select('id')
        .eq('trust_id', trustId)
        .single();

      if (ilitError) throw ilitError;

      // 2. Create the gift record
      const { data: gift, error: giftError } = await supabase
        .from('gifts')
        .insert({
          ilit_id: ilit.id,
          gift_date: giftDate,
          gift_type: 'cash', // Default to cash, you can make this selectable
          amount: parseFloat(amount),
          description: description || null,
          donor_name: donorName,
          donor_ssn_masked: donorSsnMasked || null,
          donor_email: donorEmail || null,
          metadata: {
            recorded_by: 'attorney',
            entry_method: 'manual'
          }
        })
        .select()
        .single();

      if (giftError) throw giftError;

      // 3. Create Crummey notices for each beneficiary
      if (beneficiaries.length > 0) {
        const noticeDate = new Date().toISOString().split('T')[0];
        const withdrawalDeadline = calculateWithdrawalDeadline(noticeDate);
        
        const crummeyNotices = beneficiaries.map(beneficiary => ({
          gift_id: gift.id,
          beneficiary_id: beneficiary.id,
          notice_date: noticeDate,
          withdrawal_deadline: withdrawalDeadline,
          withdrawal_amount: (parseFloat(amount) * beneficiary.withdrawal_percentage) / 100,
          notice_status: 'pending',
          delivery_method: 'email',
          email_sent: false,
          metadata: {
            gift_amount: parseFloat(amount),
            beneficiary_percentage: beneficiary.withdrawal_percentage
          }
        }));

        const { error: noticesError } = await supabase
          .from('crummey_notices')
          .insert(crummeyNotices);

        if (noticesError) throw noticesError;
      }

      toast({
        title: "Success",
        description: `Gift of $${amount} recorded successfully. ${beneficiaries.length} Crummey notices created.`,
      });

      // Reset form
      setAmount('');
      setTrustId('');
      setDonorName('');
      setDonorSsnMasked('');
      setDonorEmail('');
      setDescription('');
      setGiftDate(new Date().toISOString().split('T')[0]);

      onOpenChange(false);
      onSuccess?.();
      
    } catch (error) {
      console.error('Error recording gift:', error);
      toast({
        title: "Error",
        description: "Failed to record gift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const annualExclusion = 18000; // 2024 annual exclusion amount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Record Gift to ILIT</DialogTitle>
          <DialogDescription>
            Record a new gift and automatically generate Crummey notices for beneficiaries.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="trust">Trust *</Label>
              <Select value={trustId} onValueChange={setTrustId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trust" />
                </SelectTrigger>
                <SelectContent>
                  {trusts.map((trust) => (
                    <SelectItem key={trust.id} value={trust.id}>
                      {trust.trust_name} {trust.ilits?.[0]?.ein ? `(EIN: ${trust.ilits[0].ein})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Gift Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {amount && parseFloat(amount) > annualExclusion && (
                <p className="text-sm text-amber-600 mt-1">
                  Amount exceeds {new Date().getFullYear()} annual exclusion of ${annualExclusion.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="giftDate">Gift Date *</Label>
              <Input
                id="giftDate"
                type="date"
                value={giftDate}
                onChange={(e) => setGiftDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="donorName">Donor Name *</Label>
              <Input
                id="donorName"
                placeholder="John Smith"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="donorSsn">Donor SSN (Last 4)</Label>
              <Input
                id="donorSsn"
                placeholder="****"
                maxLength={4}
                value={donorSsnMasked}
                onChange={(e) => setDonorSsnMasked(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="donorEmail">Donor Email</Label>
              <Input
                id="donorEmail"
                type="email"
                placeholder="donor@example.com"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Annual gift contribution"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {trustId && beneficiaries.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This gift will generate {beneficiaries.length} Crummey notice{beneficiaries.length > 1 ? 's' : ''} for:
                <ul className="mt-2 ml-4 text-sm">
                  {beneficiaries.map(b => (
                    <li key={b.id}>
                      • {b.name} ({b.withdrawal_percentage}% - ${((parseFloat(amount || '0') * b.withdrawal_percentage) / 100).toFixed(2)})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {trustId && beneficiaries.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No beneficiaries found for this trust. Please add beneficiaries before recording gifts.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (trustId && beneficiaries.length === 0)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Gift
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}