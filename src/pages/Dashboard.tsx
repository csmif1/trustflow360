import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, DollarSign, CheckCircle, Calendar, AlertTriangle, Clock, Upload, Gift, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-600">TrustFlow360</h1>
        <p className="text-gray-600">Comprehensive trust administration with AI-powered compliance</p>
      </div>

      {/* 1. VERY TOP: The 4 stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="bg-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Active Trusts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">10</div>
            <p className="text-xs opacity-90">Managed ILITs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Notices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">6</div>
            <p className="text-xs text-gray-600">Awaiting delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              YTD Gifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$266k</div>
            <p className="text-xs text-gray-600">Total contributions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">100%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{width: '100%'}}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. The three workflow cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Upload className="h-8 w-8 text-blue-600" />
              <CardTitle className="text-lg">Upload Gift Letter</CardTitle>
            </div>
            <p className="text-sm text-gray-600">Process gift documentation with AI extraction</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p className="flex items-center gap-2">
                <span>⚡</span> AI-powered data extraction
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Automatic Crummey notice generation
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/documents'}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Upload Document
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <CardTitle className="text-lg">Record Gift Manually</CardTitle>
            </div>
            <p className="text-sm text-gray-600">Enter gift details directly</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                Quick entry form
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                Auto-calculate beneficiary shares
              </p>
            </div>
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Enter Gift Details
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-8 w-8 text-purple-600" />
              <CardTitle className="text-lg">Send Crummey Notices</CardTitle>
            </div>
            <p className="text-sm text-gray-600">8 notices pending</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                DocuSign & Adobe Sign ready
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                Physical mail tracking
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/crummey-notices'}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Review & Send
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 3. Quick Actions navigation bar */}
      <div className="bg-blue-600 text-white rounded-lg p-2 mb-8 flex gap-2">
        <button className="px-6 py-2 bg-white text-blue-600 rounded-lg font-medium">
          Quick Actions
        </button>
        <button onClick={() => window.location.href = '/'} className="px-6 py-2 hover:bg-blue-700 rounded-lg">
          Trusts
        </button>
        <button onClick={() => window.location.href = '/documents'} className="px-6 py-2 hover:bg-blue-700 rounded-lg">
          Documents
        </button>
        <button onClick={() => window.location.href = '/compliance'} className="px-6 py-2 hover:bg-blue-700 rounded-lg">
          Compliance
        </button>
        <button onClick={() => window.location.href = '/tax-reports'} className="px-6 py-2 hover:bg-blue-700 rounded-lg">
          Tax Reports
        </button>
        <button onClick={() => window.location.href = '/workflows'} className="px-6 py-2 hover:bg-blue-700 rounded-lg">
          Workflows
        </button>
        <button onClick={() => window.location.href = '/email-logs'} className="px-6 py-2 hover:bg-blue-700 rounded-lg">
          Email Logs
        </button>
      </div>

      {/* 4. All premium payment sections */}
      
      {/* Premium Overview Tabs */}
      <div className="bg-blue-600 rounded-lg p-1 mb-6 flex">
        <button className="flex-1 py-2 px-4 bg-white text-blue-600 rounded font-medium">
          Premium Overview
        </button>
        <button className="flex-1 py-2 px-4 text-white hover:bg-blue-700 rounded">
          Payment History
        </button>
        <button className="flex-1 py-2 px-4 text-white hover:bg-blue-700 rounded">
          Bulk Upload
        </button>
      </div>

      {/* Premium Metrics */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Policies in Grace Period</span>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Due This Month</span>
              <Calendar className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Monthly Premium Total</span>
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0.00</div>
          </CardContent>
        </Card>
      </div>

      {/* Fund Sufficiency Analysis */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fund Sufficiency Analysis
          </CardTitle>
          <p className="text-sm text-gray-600">Available funds vs. upcoming premium requirements</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8 mb-4">
            <div>
              <p className="text-sm text-gray-600">Available Funds</p>
              <p className="text-2xl font-bold">$0.00</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next 30 Days</p>
              <p className="text-2xl font-bold">$0.00</p>
              <p className="text-xs text-green-600">✓ Sufficient</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Next 90 Days</p>
              <p className="text-2xl font-bold">$0.00</p>
              <p className="text-xs text-green-600">✓ Sufficient</p>
            </div>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            <FileText className="h-4 w-4 mr-2" />
            Full Report
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming Premium Payments */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5" />
          <h2 className="text-xl font-bold">Upcoming Premium Payments</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Next 5 premium payments due</p>
        
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No upcoming premium payments scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alert */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <span className="font-semibold text-red-900">Compliance Alerts</span>
            <span className="ml-2 bg-red-600 text-white text-xs px-2 py-1 rounded">High</span>
            <p className="text-sm text-red-700">6 Crummey notices pending delivery</p>
          </div>
        </div>
      </div>
    </div>
  );
}