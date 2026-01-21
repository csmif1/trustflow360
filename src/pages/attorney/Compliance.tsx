import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, FileText, Calendar, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Compliance() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Compliance Center</h1>
        <p className="text-muted-foreground">Track and manage all ILIT compliance requirements</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Crummey Notice Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Crummey Notices
            </CardTitle>
            <CardDescription>Current notice status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending Notices</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Awaiting Response</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed This Month</span>
                <span className="font-semibold text-green-600">0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Annual Exclusion Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Annual Exclusions
            </CardTitle>
            <CardDescription>Gift tax exclusion usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">2025 Limit</span>
                <span className="font-semibold">$18,000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Used</span>
                <span className="font-semibold">$0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Available</span>
                <span className="font-semibold text-green-600">$18,000</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filing Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filing Deadlines
            </CardTitle>
            <CardDescription>Upcoming compliance dates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Form 706</span>
                <span className="text-sm text-muted-foreground">No filings due</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Form 709</span>
                <span className="text-sm text-muted-foreground">April 15, 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">State Filings</span>
                <span className="text-sm text-muted-foreground">Check state rules</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Compliance Alerts</h2>
        <div className="space-y-3">
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              All Crummey notices are up to date. No action required.
            </AlertDescription>
          </Alert>
          
          <Alert>
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              Annual exclusion for 2025 is $18,000 per beneficiary. This is an increase from 2024's $17,000 limit.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Recent Compliance Activity</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent compliance activity</p>
              <p className="text-sm mt-1">Compliance events will appear here as they occur</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}