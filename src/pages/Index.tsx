import { useState } from "react";
import { TrustFlowHeader } from "@/components/TrustFlowHeader";
import { RoleSelector } from "@/components/RoleSelector";
import { DataIntakeForm } from "@/components/DataIntakeForm";
import { AdminDashboard } from "@/components/AdminDashboard";

const Index = () => {
  const [selectedRole, setSelectedRole] = useState<'attorney' | 'advisor' | 'officer' | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [trustId, setTrustId] = useState<string | null>(null);

  const handleRoleSelect = (role: 'attorney' | 'advisor' | 'officer') => {
    setSelectedRole(role);
  };

  const handleDataSubmit = (trustId: string) => {
    setTrustId(trustId);
    setShowDashboard(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <TrustFlowHeader />
      
      <main className="container mx-auto px-6 py-8">
        {!selectedRole ? (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Welcome to TrustFlow360
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              I'm your autonomous assistant for end-to-end ILIT administration. 
              To get started, please select your role and provide the required trust information.
            </p>
            <RoleSelector onRoleSelect={handleRoleSelect} />
          </div>
        ) : !showDashboard ? (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary mb-2">
                Hello! I'm TrustFlow360
              </h2>
              <p className="text-muted-foreground mb-8">
                To get started, please provide the grantor's name, trust date, policy numbers, 
                beneficiary details, and any existing CRM references.
              </p>
            </div>
            <DataIntakeForm onSubmit={handleDataSubmit} />
          </div>
        ) : (
          <AdminDashboard role={selectedRole} trustId={trustId} />
        )}
      </main>
    </div>
  );
};

export default Index;
