import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, TrendingUp, FileText } from "lucide-react";

interface RoleSelectorProps {
  onRoleSelect: (role: 'attorney' | 'advisor' | 'officer') => void;
}

export const RoleSelector = ({ onRoleSelect }: RoleSelectorProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      <Card className="bg-gradient-card shadow-card border-border hover:shadow-elevated transition-all duration-300">
        <CardHeader className="text-center">
          <Scale className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="text-lg">Estate Planning Attorney</CardTitle>
          <CardDescription>
            Trust summaries, IRS 1041 accountings, funding & distribution notices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => onRoleSelect('attorney')} 
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            Access Attorney Tools
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-card border-border hover:shadow-elevated transition-all duration-300">
        <CardHeader className="text-center">
          <TrendingUp className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="text-lg">Wealth Management Advisor</CardTitle>
          <CardDescription>
            CRM integration, giving-history scoring, portfolio reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => onRoleSelect('advisor')} 
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            Access Advisor Tools
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card shadow-card border-border hover:shadow-elevated transition-all duration-300">
        <CardHeader className="text-center">
          <FileText className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="text-lg">Trust Officer</CardTitle>
          <CardDescription>
            Audit-ready logs, secure beneficiary communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => onRoleSelect('officer')} 
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            Access Officer Tools
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};