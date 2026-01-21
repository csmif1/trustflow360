import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FileText, Users, Calendar, Search, Building2 } from 'lucide-react';
import { GiftRecordingModal } from '@/components/GiftRecordingModal';
import { BeneficiaryManagementModal } from '@/components/BeneficiaryManagementModal';
import DocumentsModal from '@/components/DocumentsModal';

interface Trust {
  id: string;
  trust_name: string;
  trust_type: string;
  ein?: string;
  trust_date?: string;
  grantor_name?: string;
  status?: string;
  created_at: string;
}

export default function TrustsPage() {
  const navigate = useNavigate();
  const [trusts, setTrusts] = useState<Trust[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedTrustId, setSelectedTrustId] = useState<string>('');
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [selectedTrustForBeneficiary, setSelectedTrustForBeneficiary] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    fetchTrusts();
  }, []);

  const fetchTrusts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trusts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching trusts:', error);
        setError(error.message);
      } else {
        setTrusts(data || []);
      }
    } catch (err) {
      console.error('Error in fetchTrusts:', err);
      setError('Failed to load trusts');
    } finally {
      setLoading(false);
    }
  };

  const filteredTrusts = trusts.filter(trust => 
    trust.trust_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trust.ein?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trust.grantor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRecordGift = (trustId: string) => {
    setSelectedTrustId(trustId);
    setShowGiftModal(true);
  };

  const showTrustDetails = (trust: Trust) => {
    navigate(`/trust/${trust.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trusts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="text-center py-8">
          <p className="text-red-600 mb-4">Failed to load trusts: {error}</p>
          <Button onClick={fetchTrusts} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Trust Management</h2>
            <p className="text-gray-600 mt-1">Manage ILITs, beneficiaries, and record gifts</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {trusts.length} {trusts.length === 1 ? 'Trust' : 'Trusts'}
            </Badge>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by EIN, trust name, or trustee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredTrusts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'No trusts found' : 'No trusts yet'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Try adjusting your search criteria' 
                  : 'Create your first trust to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTrusts.map((trust) => (
              <Card key={trust.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        {trust.trust_name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {trust.trust_type || 'ILIT'} • EIN: {trust.ein || 'Not provided'}
                      </p>
                    </div>
                    <Badge variant={trust.status === 'active' ? 'default' : 'secondary'}>
                      {trust.status || 'Active'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Grantor:</span>
                      <span className="font-medium">{trust.grantor_name || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {new Date(trust.trust_date || trust.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => showTrustDetails(trust)}
                    >
                      View Details
                    </Button>
                    <DocumentsModal trustId={trust.id} trustName={trust.trust_name} />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedTrustForBeneficiary({ id: trust.id, name: trust.trust_name });
                        setShowBeneficiaryModal(true);
                      }}
                    >
                      Beneficiaries
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleRecordGift(trust.id)}
                    >
                      Record Gift
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <GiftRecordingModal
        open={showGiftModal}
        onOpenChange={setShowGiftModal}
        onSuccess={() => {
          setShowGiftModal(false);
          fetchTrusts();
        }}
      />
      
      {selectedTrustForBeneficiary && (
        <BeneficiaryManagementModal
          open={showBeneficiaryModal}
          onOpenChange={setShowBeneficiaryModal}
          trustId={selectedTrustForBeneficiary.id}
          trustName={selectedTrustForBeneficiary.name}
        />
      )}
    </>
  );
}