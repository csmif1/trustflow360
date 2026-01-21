import { Resend } from 'resend';
import { supabase } from '@/integrations/supabase/client';

// Initialize Resend - we'll use Supabase Edge Function for the actual sending
// This is just the client-side interface

interface EmailData {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
  }>;
}

export const emailService = {
  async sendPaymentConfirmation(data: {
    trusteeEmail: string;
    trusteeName: string;
    trustName: string;
    policyNumber: string;
    carrier: string;
    paymentAmount: number;
    paymentDate: string;
    paymentMethod: string;
    checkNumber?: string;
    receiptPdf?: Blob;
  }) {
    // Convert PDF to base64 if provided
    let pdfBase64 = '';
    if (data.receiptPdf) {
      const reader = new FileReader();
      pdfBase64 = await new Promise((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.readAsDataURL(data.receiptPdf);
      });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; margin-top: 20px; }
            .payment-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .amount { font-size: 24px; color: #1e40af; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Premium Payment Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear ${data.trusteeName},</p>
              
              <p>This email confirms that a premium payment has been recorded for the ${data.trustName}.</p>
              
              <div class="payment-box">
                <h3>Payment Details:</h3>
                <p><strong>Policy:</strong> ${data.carrier} - ${data.policyNumber}</p>
                <p><strong>Payment Date:</strong> ${new Date(data.paymentDate).toLocaleDateString()}</p>
                <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
                ${data.checkNumber ? `<p><strong>Check Number:</strong> ${data.checkNumber}</p>` : ''}
                <p class="amount">Amount Paid: $${data.paymentAmount.toLocaleString()}</p>
              </div>
              
              <p>A receipt for this payment is attached to this email for your records.</p>
              
              <p>If you have any questions about this payment, please contact your trust administrator.</p>
              
              <p>Best regards,<br>Trust Administration Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Call Supabase Edge Function to send email
    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: data.trusteeEmail,
        subject: `Payment Confirmation - ${data.carrier} Policy ${data.policyNumber}`,
        html: emailHtml,
        attachments: pdfBase64 ? [{
          filename: `receipt-${data.policyNumber}-${data.paymentDate}.pdf`,
          content: pdfBase64
        }] : undefined
      }
    });

    if (error) throw error;
    return result;
  },

  async sendPremiumReminder(data: {
    trusteeEmail: string;
    trusteeName: string;
    trustName: string;
    policies: Array<{
      policyNumber: string;
      carrier: string;
      dueDate: string;
      amount: number;
    }>;
  }) {
    const totalAmount = data.policies.reduce((sum, p) => sum + p.amount, 0);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; margin-top: 20px; }
            .policy-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .policy-table th, .policy-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .policy-table th { background-color: #f3f4f6; font-weight: bold; }
            .total { font-size: 20px; color: #1e40af; font-weight: bold; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Premium Payment Reminder</h1>
            </div>
            <div class="content">
              <p>Dear ${data.trusteeName},</p>
              
              <p>This is a reminder that the following premium payments are due for the ${data.trustName}:</p>
              
              <table class="policy-table">
                <thead>
                  <tr>
                    <th>Carrier</th>
                    <th>Policy Number</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.policies.map(p => `
                    <tr>
                      <td>${p.carrier}</td>
                      <td>${p.policyNumber}</td>
                      <td>${new Date(p.dueDate).toLocaleDateString()}</td>
                      <td>$${p.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <p class="total">Total Due: $${totalAmount.toLocaleString()}</p>
              
              <p>Please ensure these premiums are paid on time to maintain the policies in good standing.</p>
              
              <p>If you have any questions, please contact your trust administrator.</p>
              
              <p>Best regards,<br>Trust Administration Team</p>
            </div>
            <div class="footer">
              <p>This is an automated reminder. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: result, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: data.trusteeEmail,
        subject: `Premium Payment Reminder - ${data.trustName}`,
        html: emailHtml
      }
    });

    if (error) throw error;
    return result;
  }
};