import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Eye, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const supabaseUrl = 'https://fnivqabphgbmkzpwowwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXZxYWJwaGdibWt6cHdvd3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1ODQzMDQsImV4cCI6MjA2ODE2MDMwNH0.0DkS5we5JJXWxQk3tFmOyTejsQay2nesQx407VAvO4w';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface EmailLog {
  id: string;
  notice_id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  html_content: string;
  sent_at: string;
  delivery_method: string;
}

export default function EmailLogs() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching emails:', error);
      } else {
        setEmails(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmails();
  };

  const getDeliveryMethodBadge = (method: string) => {
    const colors = {
      email: 'bg-blue-100 text-blue-800',
      portal: 'bg-green-100 text-green-800',
      manual: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[method as keyof typeof colors] || colors.manual}`}>
        {method}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Delivery Log
              </CardTitle>
              <CardDescription>
                All Crummey notices sent via email are logged here for compliance
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
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="text-gray-500">Loading email logs...</span>
              </div>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No emails sent yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Sent Crummey notices will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map((email) => (
                <div 
                  key={email.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">{email.recipient_name}</p>
                        <p className="text-sm text-gray-600">{email.recipient_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(email.sent_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {getDeliveryMethodBadge(email.delivery_method)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedEmail(email)}
                    className="ml-4"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">View</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      {selectedEmail && (
        <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Details</DialogTitle>
              <DialogDescription>
                Sent on {format(new Date(selectedEmail.sent_at), 'MMMM d, yyyy h:mm a')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">To:</p>
                  <p className="font-medium">{selectedEmail.recipient_name}</p>
                  <p className="text-sm text-gray-500">{selectedEmail.recipient_email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Delivery Method:</p>
                  <div>{getDeliveryMethodBadge(selectedEmail.delivery_method)}</div>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Subject:</p>
                <p className="font-medium">{selectedEmail.subject}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Email Content:</p>
                <div 
                  className="bg-gray-50 p-6 rounded-lg border border-gray-200 mt-2"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedEmail(null)}>
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