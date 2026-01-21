import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import jsPDF from 'jspdf';

interface CrummeyNoticePreviewProps {
  notice: any;
  onClose?: () => void;
}

export function CrummeyNoticePreview({ notice, onClose }: CrummeyNoticePreviewProps) {
  if (!notice) return null;

  // Safe date formatting
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return '';
    }
  };

  // Safe amount formatting
  const formatAmount = (amount: number) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const generatePDF = () => {
    const pdf = new jsPDF();
    const margin = 20;
    const lineHeight = 10;
    let y = margin;

    // Title
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    const title = 'CRUMMEY WITHDRAWAL NOTICE';
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pdf.internal.pageSize.width - titleWidth) / 2, y);
    y += lineHeight;

    // Trust name
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    const trustName = notice.trust_name || '';
    const trustWidth = pdf.getTextWidth(trustName);
    pdf.text(trustName, (pdf.internal.pageSize.width - trustWidth) / 2, y);
    y += lineHeight * 2;

    // Date
    pdf.text(formatDate(notice.gift_date), margin, y);
    y += lineHeight * 2;

    // Body
    pdf.text(`Dear ${notice.beneficiary_name || 'Beneficiary'}:`, margin, y);
    y += lineHeight * 2;

    const bodyText = `This letter is to notify you that a gift in the amount of ${formatAmount(notice.withdrawal_amount)} has been made to the ${trustName} by ${notice.donor_name || 'the donor'} on ${formatDate(notice.gift_date)}.`;
    const splitText = pdf.splitTextToSize(bodyText, pdf.internal.pageSize.width - (margin * 2));
    splitText.forEach((line: string) => {
      pdf.text(line, margin, y);
      y += lineHeight;
    });
    y += lineHeight;

    const withdrawText = `You have the right to withdraw from the trust an amount equal to your proportionate share of this gift, which is ${formatAmount(notice.withdrawal_amount)}.`;
    const splitWithdraw = pdf.splitTextToSize(withdrawText, pdf.internal.pageSize.width - (margin * 2));
    splitWithdraw.forEach((line: string) => {
      pdf.text(line, margin, y);
      y += lineHeight;
    });
    y += lineHeight;

    const deadlineText = `This withdrawal right will lapse and no longer be exercisable by you after ${formatDate(notice.withdrawal_deadline)}.`;
    const splitDeadline = pdf.splitTextToSize(deadlineText, pdf.internal.pageSize.width - (margin * 2));
    splitDeadline.forEach((line: string) => {
      pdf.text(line, margin, y);
      y += lineHeight;
    });
    y += lineHeight;

    const instructionText = 'If you wish to exercise your withdrawal right, please notify the trustee in writing before the deadline stated above. If you do not wish to exercise this right, no action is required on your part.';
    const splitInstruction = pdf.splitTextToSize(instructionText, pdf.internal.pageSize.width - (margin * 2));
    splitInstruction.forEach((line: string) => {
      pdf.text(line, margin, y);
      y += lineHeight;
    });
    y += lineHeight;

    pdf.text('Please retain this notice for your records.', margin, y);
    y += lineHeight * 3;

    pdf.text('Sincerely,', margin, y);
    y += lineHeight * 3;

    // Signature line
    pdf.line(margin, y, margin + 60, y);
    y += lineHeight;
    pdf.text('Trustee', margin, y);
    y += lineHeight;
    pdf.text(trustName, margin, y);

    pdf.save(`crummey-notice-${notice.beneficiary_name?.replace(/\s+/g, '-') || 'notice'}-${notice.id?.slice(0, 8) || 'draft'}.pdf`);
  };

  return (
    <>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">Notice Preview</h3>
        <Button onClick={generatePDF} size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="text-base font-semibold">CRUMMEY WITHDRAWAL NOTICE</h4>
          <p className="text-sm text-gray-600">{notice.trust_name || ''}</p>
        </div>
        
        <div className="space-y-4 text-sm">
          <p className="text-gray-600">{formatDate(notice.gift_date)}</p>
          
          <p>Dear {notice.beneficiary_name || 'Beneficiary'}:</p>
          
          <p>
            This letter is to notify you that a gift in the amount of <strong>{formatAmount(notice.withdrawal_amount)}</strong> has been made to the {notice.trust_name || ''} by {notice.donor_name || 'the donor'} on {formatDate(notice.gift_date)}.
          </p>
          
          <p>
            You have the right to withdraw from the trust an amount equal to your proportionate share of this gift, which is <strong>{formatAmount(notice.withdrawal_amount)}</strong>.
          </p>
          
          <p>
            This withdrawal right will lapse and no longer be exercisable by you after <strong>{formatDate(notice.withdrawal_deadline)}</strong>.
          </p>
          
          <p>
            If you wish to exercise your withdrawal right, please notify the trustee in writing before the deadline stated above. If you do not wish to exercise this right, no action is required on your part.
          </p>
          
          <p>Please retain this notice for your records.</p>
          
          <div className="mt-8">
            <p>Sincerely,</p>
            <div className="mt-8">
              <div className="w-48 border-b border-gray-400 mb-1"></div>
              <p>Trustee</p>
              <p className="text-gray-600">{notice.trust_name || ''}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default CrummeyNoticePreview;