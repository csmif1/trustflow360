import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BeneficiaryManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trustId: string;
  trustName: string;
}

interface Beneficiary {
  id?: string;
  name: string;
  email: string;
  withdrawal_percentage: number;
  phone?: string;
  address?: string;
}

export function BeneficiaryManagementModal({
  open,
  onOpenChange,
  trustId,
  trustName
}: BeneficiaryManagementModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);

  useEffect(() => {
    if (open && trustId) {
      fetchBeneficiaries();
    }
  }, [open, trustId]);

  useEffect(() => {
    const total = beneficiaries.reduce((sum, b) => sum + (b.withdrawal_percentage || 0), 0);
    setTotalPercentage(total);
  }, [beneficiaries]);

  const fetchBeneficiaries = async () => {
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

  const handleAddBeneficiary = () => {
    setBeneficiaries([...beneficiaries, {
      name: '',
      email: '',
      withdrawal_percentage: 0,
      phone: '',
      address: ''
    }]);
  };

  const handleRemoveBeneficiary = async (index: number) => {
    const beneficiary = beneficiaries[index];
    
    if (beneficiary.id) {
      // Delete from database
      try {
        const { error } = await supabase
          .from('beneficiaries')
          .delete()
          .eq('id', beneficiary.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Beneficiary removed",
        });
      } catch (error) {
        console.error('Error deleting beneficiary:', error);
        toast({
          title: "Error",
          description: "Failed to remove beneficiary",
          variant: "destructive",
        });
        return;
      }
    }

    const updated = beneficiaries.filter((_, i) => i !== index);
    setBeneficiaries(updated);
  };

  const handleBeneficiaryChange = (index: number, field: keyof Beneficiary, value: string | number) => {
    const updated = [...beneficiaries];
    updated[index] = { ...updated[index], [field]: value };
    setBeneficiaries(updated);
  };

  const handleSave = async () => {
    // Validation
    // Check for duplicate names
    const names = beneficiaries.map(b => b.name.toLowerCase().trim());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      toast({
        title: "Validation Error",
        description: "Duplicate beneficiary names found. Each beneficiary must have a unique name.",
        variant: "destructive",
      });
      return;
    }

    if (totalPercentage !== 100) {
      toast({
        title: "Validation Error",
        description: "Total withdrawal percentage must equal 100%",
        variant: "destructive",
      });
      return;
    }

    for (const beneficiary of beneficiaries) {
      if (!beneficiary.name || !beneficiary.email || !beneficiary.withdrawal_percentage) {
        toast({
          title: "Validation Error",
          description: "All beneficiaries must have name, email, and withdrawal percentage",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      for (const beneficiary of beneficiaries) {
        if (beneficiary.id) {
          // Update existing
          const { error } = await supabase
            .from('beneficiaries')
            .update({
              name: beneficiary.name,
              email: beneficiary.email,
              withdrawal_percentage: beneficiary.withdrawal_percentage,
              phone: beneficiary.phone || null,
              address: beneficiary.address || null
            })
            .eq('id', beneficiary.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('beneficiaries')
            .insert({
              trust_id: trustId,
              name: beneficiary.name,
              email: beneficiary.email,
              withdrawal_percentage: beneficiary.withdrawal_percentage,
              phone: beneficiary.phone || null,
              address: beneficiary.address || null
            });

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: "Beneficiaries updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving beneficiaries:', error);
      toast({
        title: "Error",
        description: "Failed to save beneficiaries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Beneficiaries</DialogTitle>
          <DialogDescription>
            {trustName} - Add or edit beneficiaries and their withdrawal percentages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {beneficiaries.map((beneficiary, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={beneficiary.name}
                      onChange={(e) => handleBeneficiaryChange(index, 'name', e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={beneficiary.email}
                      onChange={(e) => handleBeneficiaryChange(index, 'email', e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label>Withdrawal % *</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={beneficiary.withdrawal_percentage}
                      onChange={(e) => handleBeneficiaryChange(index, 'withdrawal_percentage', parseFloat(e.target.value) || 0)}
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={beneficiary.phone || ''}
                      onChange={(e) => handleBeneficiaryChange(index, 'phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveBeneficiary(index)}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddBeneficiary}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Beneficiary
          </Button>

          <Alert className={totalPercentage === 100 ? 'border-green-500' : 'border-orange-500'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Total withdrawal percentage: <strong>{totalPercentage}%</strong>
              {totalPercentage !== 100 && ' (must equal 100%)'}
            </AlertDescription>
          </Alert>
        </div>

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
            onClick={handleSave}
            disabled={loading || totalPercentage !== 100}
          >
            Save Beneficiaries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}