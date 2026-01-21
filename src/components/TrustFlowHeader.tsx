import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Settings, User } from "lucide-react";

export const TrustFlowHeader = () => {
  return (
    <header className="bg-gradient-primary border-b shadow-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-accent" />
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">
                TrustFlow360
              </h1>
              <p className="text-sm text-primary-foreground/80">
                Autonomous ILIT Administration Platform
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              SOC 2 Compliant
            </Badge>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};