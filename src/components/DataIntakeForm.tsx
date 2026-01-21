import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ILITData {
  grantorName: string;
  trustDate: string;
  policyNumbers: string;
  beneficiaries: string;
  crmReference: string;
  additionalNotes: string;
}

interface DataIntakeFormProps {
  onSubmit?: (trustId: string) => void;
}

export const DataIntakeForm = ({ onSubmit }: DataIntakeFormProps) => {
  const [formData, setFormData] = useState<ILITData>({
    grantorName: '',
    trustDate: '',
    policyNumbers: '',
    beneficiaries: '',
    crmReference: '',
    additionalNotes: ''
  });
  
  const { toast } = useToast();

  const handleInputChange = (field: keyof ILITData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create trust record
      const trustName = `${formData.grantorName} ILIT`;
      const { data: trustData, error: trustError } = await supabase
        .from('trusts')
        .insert([
          {
            grantor_name: formData.grantorName,
            trust_name: trustName,
            trust_date: formData.trustDate,
            crm_reference: formData.crmReference || null,
          }
        ])
        .select()
        .single();

      if (trustError) {
        throw trustError;
      }

      const trustId = trustData.id;

      // Create insurance policies
      const policyNumbers = formData.policyNumbers.split(',').map(p => p.trim()).filter(p => p);
      if (policyNumbers.length > 0) {
        const policyInserts = policyNumbers.map(policyNumber => ({
          trust_id: trustId,
          policy_number: policyNumber,
          insurance_company: 'TBD', // Will be updated later
        }));

        const { error: policyError } = await supabase
          .from('insurance_policies')
          .insert(policyInserts);

        if (policyError) {
          throw policyError;
        }
      }

      // Create beneficiaries
      const beneficiaryLines = formData.beneficiaries.split('\n').filter(line => line.trim());
      if (beneficiaryLines.length > 0) {
        const beneficiaryInserts = beneficiaryLines.map(line => ({
          trust_id: trustId,
          name: line.trim(),
          relationship: 'TBD', // Will be updated later
        }));

        const { error: beneficiaryError } = await supabase
          .from('beneficiaries')
          .insert(beneficiaryInserts);

        if (beneficiaryError) {
          throw beneficiaryError;
        }
      }

      // Create initial workflow tasks
      const initialTasks = [
        {
          trust_id: trustId,
          task_type: 'document_review',
          title: 'Review Trust Documents',
          description: 'Verify the terms and conditions outlined in the trust documents.',
          priority: 'high',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        },
        {
          trust_id: trustId,
          task_type: 'annual_report',
          title: 'Prepare Annual Report',
          description: 'Gather financial statements and insurance policy details for the annual report.',
          priority: 'medium',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        },
        {
          trust_id: trustId,
          task_type: 'beneficiary_notification',
          title: 'Notify Beneficiaries',
          description: 'Send notifications to beneficiaries about trust activities.',
          priority: 'medium',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
        },
      ];

      const { error: tasksError } = await supabase
        .from('workflow_tasks')
        .insert(initialTasks);

      if (tasksError) {
        throw tasksError;
      }

      // Add notes to communications if provided
      if (formData.additionalNotes) {
        const { error: notesError } = await supabase
          .from('communications')
          .insert([
            {
              trust_id: trustId,
              recipient_type: 'internal',
              subject: 'Initial Setup Notes',
              message: formData.additionalNotes,
              communication_type: 'note',
            }
          ]);

        if (notesError) {
          throw notesError;
        }
      }

      toast({
        title: "ILIT Data Submitted",
        description: "Your trust information has been securely processed and validated.",
      });

      // Navigate to dashboard after successful submission
      setTimeout(() => {
        onSubmit?.(trustId);
      }, 1000);

    } catch (error) {
      console.error('Error submitting ILIT data:', error);
      toast({
        title: "Error",
        description: "There was an error processing your trust information. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="text-xl text-primary">ILIT Data Intake</CardTitle>
        <CardDescription>
          Please provide the following information to begin trust administration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="grantorName" className="text-sm font-medium">
                Grantor Name *
              </Label>
              <Input
                id="grantorName"
                value={formData.grantorName}
                onChange={(e) => handleInputChange('grantorName', e.target.value)}
                className="mt-1"
                placeholder="Enter grantor's full name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="trustDate" className="text-sm font-medium">
                Trust Date *
              </Label>
              <Input
                id="trustDate"
                type="date"
                value={formData.trustDate}
                onChange={(e) => handleInputChange('trustDate', e.target.value)}
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="policyNumbers" className="text-sm font-medium">
              Policy Numbers *
            </Label>
            <Input
              id="policyNumbers"
              value={formData.policyNumbers}
              onChange={(e) => handleInputChange('policyNumbers', e.target.value)}
              className="mt-1"
              placeholder="Enter policy numbers (comma-separated)"
              required
            />
          </div>

          <div>
            <Label htmlFor="beneficiaries" className="text-sm font-medium">
              Beneficiary Details *
            </Label>
            <Textarea
              id="beneficiaries"
              value={formData.beneficiaries}
              onChange={(e) => handleInputChange('beneficiaries', e.target.value)}
              className="mt-1"
              placeholder="Enter beneficiary names and relationships"
              required
            />
          </div>

          <div>
            <Label htmlFor="crmReference" className="text-sm font-medium">
              CRM Reference
            </Label>
            <Input
              id="crmReference"
              value={formData.crmReference}
              onChange={(e) => handleInputChange('crmReference', e.target.value)}
              className="mt-1"
              placeholder="Salesforce/HubSpot account ID"
            />
          </div>

          <div>
            <Label htmlFor="additionalNotes" className="text-sm font-medium">
              Additional Notes
            </Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
              className="mt-1"
              placeholder="Any additional context or special instructions"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            Initialize Trust Administration
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};