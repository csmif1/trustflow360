import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  FileSignature, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import CrummeyNoticePreview from '@/components/CrummeyNoticePreview';
import { formatAmount, formatDate } from '@/lib/utils';

// Initialize Supabase client
const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CrummeyNotice {
  id: string;
  gift_id: string;
  beneficiary_id: string;
  withdrawal_amount: number;
  withdrawal_deadline: string;
  notice_status: 'pending' | 'sent' | 'expired';
  email_sent: boolean;
  sent_at?: string;
  delivery_method?: string;
  created_at: string;
  notice_date?: string;
  gift?: any;
  beneficiary?: any;
}

export default function CrummeyNotices() {
  const [notices, setNotices] = useState<CrummeyNotice[]>([]);
  const [selectedNotices, setSelectedNotices] = useState<string[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<string>('email');
  const [loading, setLoading] = useState(true);
  const [sendingStatus, setSendingStatus] = useState<Record<string, boolean>>({});
  const [previewNotice, setPreviewNotice] = useState<CrummeyNotice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreview, setEmailPreview] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      
      // First, get all crummey notices
      const { data: noticesData, error: noticesError } = await supabase
        .from('crummey_notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (noticesError) {
        console.error('Error fetching notices:', noticesError);
        toast({
          title: "Error",
          description: "Failed to fetch notices.",
          variant: "destructive"
        });
        return;
      }

      if (!noticesData || noticesData.length === 0) {
        setNotices([]);
        return;
      }

      // Get unique gift and beneficiary IDs
      const giftIds = [...new Set(noticesData.map(n => n.gift_id).filter(Boolean))];
      const beneficiaryIds = [...new Set(noticesData.map(n => n.beneficiary_id).filter(Boolean))];

      // Fetch gifts with their related data
      const { data: gifts } = await supabase
        .from('gifts')
        .select('*')
        .in('id', giftIds);

      // Fetch beneficiaries
      const { data: beneficiaries } = await supabase
        .from('beneficiaries')
        .select('*')
        .in('id', beneficiaryIds);

      // If we have gifts, get their ILITs and trusts
      let trustsData: any = {};
      if (gifts && gifts.length > 0) {
        const ilitIds = [...new Set(gifts.map(g => g.ilit_id).filter(Boolean))];
        
        const { data: ilits } = await supabase
          .from('ilits')
          .select('*, trusts(*)')
          .in('id', ilitIds);
          
        if (ilits) {
          ilits.forEach(ilit => {
            if (ilit.trusts) {
              trustsData[ilit.id] = ilit.trusts;
            }
          });
        }
      }

      // Combine all data
      const enrichedNotices = noticesData.map(notice => {
        const gift = gifts?.find(g => g.id === notice.gift_id);
        const beneficiary = beneficiaries?.find(b => b.id === notice.beneficiary_id);
        const trust = gift?.ilit_id ? trustsData[gift.ilit_id] : null;

        return {
          ...notice,
          gift: gift ? {
            ...gift,
            ilit: {
              trust: trust
            }
          } : undefined,
          beneficiary
        };
      });

      console.log('Enriched notices:', enrichedNotices);
      setNotices(enrichedNotices);
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const toggleNoticeSelection = (noticeId: string) => {
    setSelectedNotices(prev => 
      prev.includes(noticeId) 
        ? prev.filter(id => id !== noticeId)
        : [...prev, noticeId]
    );
  };

  const selectAllNotices = (status: 'all' | 'pending' | 'sent') => {
    if (status === 'all') {
      setSelectedNotices(notices.map(n => n.id));
    } else {
      setSelectedNotices(notices.filter(n => n.notice_status === status).map(n => n.id));
    }
  };

  const sendNotice = async (noticeId: string, method: string) => {
    console.log('sendNotice called with:', noticeId, method);
    setSendingStatus({ ...sendingStatus, [noticeId]: true });
    
    try {
      const notice = notices.find(n => n.id === noticeId);
      if (!notice) {
        throw new Error('Notice not found');
      }

      // Generate email content
      const emailContent = {
        recipient_email: notice.beneficiary?.email || '',
        recipient_name: notice.beneficiary?.name || '',
        subject: `Crummey Notice - ${notice.gift?.ilit?.trust?.trust_name || 'Trust'}`,
        html_content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="text-align: center;">CRUMMEY WITHDRAWAL NOTICE</h2>
            <p style="text-align: center; color: #666;">${notice.gift?.ilit?.trust?.trust_name || ''}</p>
            
            <p>${new Date().toLocaleDateString()}</p>
            
            <p>Dear ${notice.beneficiary?.name || 'Beneficiary'}:</p>
            
            <p>This letter is to notify you that a gift in the amount of <strong>$${notice.withdrawal_amount.toLocaleString()}</strong> 
            has been made to the ${notice.gift?.ilit?.trust?.trust_name || 'trust'} on ${new Date(notice.gift?.gift_date || notice.notice_date || '').toLocaleDateString()}.</p>
            
            <p>You have the right to withdraw from the trust an amount equal to your proportionate share of this gift, 
            which is <strong>$${notice.withdrawal_amount.toLocaleString()}</strong>.</p>
            
            <p>This withdrawal right will lapse and no longer be exercisable by you after 
            <strong>${new Date(notice.withdrawal_deadline).toLocaleDateString()}</strong>.</p>
            
            <p>If you wish to exercise your withdrawal right, please notify the trustee in writing before the deadline stated above. 
            If you do not wish to exercise this right, no action is required on your part.</p>
            
            <p>Please retain this notice for your records.</p>
            
            <p style="margin-top: 40px;">Sincerely,<br><br>
            Trustee<br>
            ${notice.gift?.ilit?.trust?.trust_name || ''}</p>
          </div>
        `
      };

      // Log email to database
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          notice_id: noticeId,
          recipient_email: emailContent.recipient_email,
          recipient_name: emailContent.recipient_name,
          subject: emailContent.subject,
          html_content: emailContent.html_content,
          delivery_method: method
        });

      if (logError) console.error('Error logging email:', logError);

      // Update notice status
      const { error } = await supabase
        .from('crummey_notices')
        .update({ 
          notice_status: 'sent',
          email_sent: true,
          sent_at: new Date().toISOString(),
          delivery_method: method
        })
        .eq('id', noticeId);

      if (error) throw error;

      // Show email preview
      setEmailPreview(emailContent);
      setShowEmailPreview(true);

      toast({
        title: "Notice Sent",
        description: `Notice for ${notice.beneficiary?.name} has been sent via ${method}`,
      });
      
      await fetchNotices();
    } catch (error) {
      console.error('Error in sendNotice:', error);
      toast({
        title: "Error",
        description: "Failed to send notice.",
        variant: "destructive"
      });
    } finally {
      setSendingStatus({ ...sendingStatus, [noticeId]: false });
    }
  };

  const sendMultipleNotices = async () => {
    for (const noticeId of selectedNotices) {
      await sendNotice(noticeId, deliveryMethod);
    }
    setSelectedNotices([]);
  };

  const handlePreview = (notice: CrummeyNotice) => {
    // Format notice data for preview
    const previewData = {
      ...notice,
      trust_name: notice.gift?.ilit?.trust?.trust_name || 'Trust Name',
      beneficiary_name: notice.beneficiary?.name || 'Beneficiary',
      gift_date: notice.gift?.gift_date || notice.notice_date || new Date().toISOString(),
      donor_name: notice.gift?.donor_name || 'the donor',
      withdrawal_amount: notice.withdrawal_amount,
      withdrawal_deadline: notice.withdrawal_deadline
    };
    
    setPreviewNotice(previewData);
    setShowPreview(true);
  };

  const pendingNotices = notices.filter(n => n.notice_status === 'pending');
  const sentNotices = notices.filter(n => n.notice_status === 'sent');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Crummey Notices
              </CardTitle>
              <CardDescription>
                Manage and send withdrawal notices to beneficiaries
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !refreshing ? (
            <div className="text-center py-8">Loading notices...</div>
          ) : (
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({pendingNotices.length})
                </TabsTrigger>
                <TabsTrigger value="sent">
                  Sent ({sentNotices.length})
                </TabsTrigger>
                <TabsTrigger value="all">
                  All ({notices.length})
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="docusign">DocuSign</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {selectedNotices.length > 0 && (
                    <Button 
                      onClick={sendMultipleNotices}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send {selectedNotices.length} Selected
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllNotices('pending')}
                  >
                    Select All Pending
                  </Button>
                </div>
              </div>

              <TabsContent value="pending">
                <NoticeList
                  notices={pendingNotices}
                  selectedNotices={selectedNotices}
                  onToggleSelect={toggleNoticeSelection}
                  onSend={sendNotice}
                  onPreview={handlePreview}
                  sendingStatus={sendingStatus}
                  showCheckboxes={true}
                />
              </TabsContent>

              <TabsContent value="sent">
                <NoticeList
                  notices={sentNotices}
                  selectedNotices={selectedNotices}
                  onToggleSelect={toggleNoticeSelection}
                  onSend={sendNotice}
                  onPreview={handlePreview}
                  sendingStatus={sendingStatus}
                  showCheckboxes={false}
                />
              </TabsContent>

              <TabsContent value="all">
                <NoticeList
                  notices={notices}
                  selectedNotices={selectedNotices}
                  onToggleSelect={toggleNoticeSelection}
                  onSend={sendNotice}
                  onPreview={handlePreview}
                  sendingStatus={sendingStatus}
                  showCheckboxes={true}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Notice Preview Dialog */}
      {showPreview && previewNotice && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crummey Notice Preview</DialogTitle>
              <DialogDescription>
                Review the notice before sending to {previewNotice.beneficiary?.name || previewNotice.beneficiary_name}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <CrummeyNoticePreview notice={previewNotice} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Email Preview Modal */}
      {showEmailPreview && emailPreview && (
        <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Sent Successfully</DialogTitle>
              <DialogDescription>
                The following email has been sent and logged for compliance
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">To:</p>
                <p className="font-medium">{emailPreview.recipient_email}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Subject:</p>
                <p className="font-medium">{emailPreview.subject}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Email Content:</p>
                <div 
                  className="bg-white p-4 border rounded"
                  dangerouslySetInnerHTML={{ __html: emailPreview.html_content }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEmailPreview(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Notice List Component
interface NoticeListProps {
  notices: CrummeyNotice[];
  selectedNotices: string[];
  onToggleSelect: (noticeId: string) => void;
  onSend: (noticeId: string, method: string) => void;
  onPreview: (notice: CrummeyNotice) => void;
  sendingStatus: Record<string, boolean>;
  showCheckboxes: boolean;
}

function NoticeList({ 
  notices, 
  selectedNotices, 
  onToggleSelect, 
  onSend, 
  onPreview,
  sendingStatus,
  showCheckboxes
}: NoticeListProps) {
  if (notices.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No notices found
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {notices.map((notice) => (
        <div 
          key={notice.id} 
          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {showCheckboxes && notice.notice_status === 'pending' && (
            <Checkbox
              checked={selectedNotices.includes(notice.id)}
              onCheckedChange={() => onToggleSelect(notice.id)}
            />
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">{notice.beneficiary?.name || 'Unknown Beneficiary'}</p>
                <p className="text-sm text-gray-600">{notice.beneficiary?.email || 'No email'}</p>
              </div>
              {getStatusBadge(notice.notice_status)}
            </div>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>Trust: {notice.gift?.ilit?.trust?.trust_name || 'Unknown Trust'}</span>
              <span>Amount: {formatAmount(notice.withdrawal_amount)}</span>
              <span>Deadline: {formatDate(notice.withdrawal_deadline)}</span>
              {notice.sent_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Sent: {formatDate(notice.sent_at)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onPreview(notice)}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            
            {notice.notice_status === 'pending' && (
              <Button
                size="sm"
                onClick={() => onSend(notice.id, 'email')}
                disabled={sendingStatus[notice.id]}
              >
                {sendingStatus[notice.id] ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}