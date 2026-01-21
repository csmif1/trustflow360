import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { getPoliciesForTrust, Policy } from '@/lib/api/policyService';
import { getAttorneyTrusts, type Trust } from '@/lib/api/trustService';

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [selectedTrustId, setSelectedTrustId] = useState<string>('');
  const [loadingTrusts, setLoadingTrusts] = useState(true);

  useEffect(() => {
    const fetchTrusts = async () => {
      setLoadingTrusts(true);
      try {
        const response = await getAttorneyTrusts();
        if (response.success && response.data) {
          setTrusts(response.data);
          // Auto-select first trust if available
          if (response.data.length > 0) {
            setSelectedTrustId(response.data[0].id);
          }
        } else {
          setError(response.error || 'Failed to load trusts');
        }
      } catch (error) {
        console.error('Error fetching trusts:', error);
        setError('Failed to load trusts');
      } finally {
        setLoadingTrusts(false);
      }
    };

    fetchTrusts();
  }, []);

  useEffect(() => {
    if (selectedTrustId) {
      fetchPolicies();
    }
  }, [selectedTrustId]);

  const fetchPolicies = async () => {
    if (!selectedTrustId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getPoliciesForTrust(selectedTrustId);

      if (response.success && response.data) {
        setPolicies(response.data);
      } else {
        setError(response.error || 'Failed to fetch policies');
      }
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPolicies();
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status) return null;

    const statusLower = status.toLowerCase();
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';

    if (statusLower === 'active' || statusLower === 'in force') {
      variant = 'default';
    } else if (statusLower === 'pending') {
      variant = 'secondary';
    } else if (statusLower === 'lapsed' || statusLower === 'cancelled') {
      variant = 'destructive';
    } else {
      variant = 'outline';
    }

    return (
      <Badge variant={variant}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Trust Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Trust</CardTitle>
          <CardDescription>
            Choose which trust to view policies for
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTrusts ? (
            <div className="flex items-center gap-2 text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading trusts...</span>
            </div>
          ) : trusts.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Trusts Found</AlertTitle>
              <AlertDescription>
                You need to create a trust before viewing policies.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="trust-select">Trust</Label>
              <Select value={selectedTrustId} onValueChange={setSelectedTrustId}>
                <SelectTrigger id="trust-select" className="w-full">
                  <SelectValue placeholder="Select a trust" />
                </SelectTrigger>
                <SelectContent>
                  {trusts.map((trust) => (
                    <SelectItem key={trust.id} value={trust.id}>
                      {trust.trust_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policies List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Insurance Policies
              </CardTitle>
              <CardDescription>
                View and manage all insurance policies
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || !selectedTrustId}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !refreshing ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-gray-500">Loading policies...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-3" />
              <p className="text-red-600 font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No policies found</p>
              <p className="text-sm text-gray-400 mt-1">
                Insurance policies will appear here once they are added
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Number</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Insured Name</TableHead>
                    <TableHead className="text-right">Death Benefit</TableHead>
                    <TableHead className="text-right">Annual Premium</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">
                        {policy.policy_number}
                      </TableCell>
                      <TableCell>{policy.carrier}</TableCell>
                      <TableCell>{policy.insured_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(policy.death_benefit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(policy.annual_premium)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(policy.policy_status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
