import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Mail, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function TrusteeLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // For demo purposes, check the credentials
      if (email === 'trustee@example.com' && accessCode === 'TRUST123') {
        // Get the Smith Family trust specifically
        const { data: trust } = await supabase
          .from('trusts')
          .select('id')
          .eq('trust_name', 'Smith Family Irrevocable Life Insurance Trust')
          .single();
        
        if (trust) {
          navigate(`/trustee/dashboard/${trust.id}`);
        } else {
          setError('No trusts found in the system.');
        }
      } else {
        setError('Invalid email or access code. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Trustee Portal</h1>
          <p className="text-gray-600 mt-2">Access your trust information securely</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Trustee Login</CardTitle>
            <CardDescription>
              Enter your email and access code to view your trust details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="trustee@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="accessCode"
                    type="password"
                    placeholder="Enter your access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Access Trust Information'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an access code?{' '}
                <a href="#" className="text-blue-600 hover:underline">
                  Contact your trust administrator
                </a>
              </p>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">Demo Credentials:</p>
              <p className="text-xs text-blue-700">Email: trustee@example.com</p>
              <p className="text-xs text-blue-700">Access Code: TRUST123</p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Attorney Login */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Attorney Login
          </Button>
        </div>
      </div>
    </div>
  );
}