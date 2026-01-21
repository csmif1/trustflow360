import jsPDF from 'jspdf';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentReceiptData {
  // Payment info
  paymentId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  checkNumber?: string;
  
  // Policy info
  policyNumber: string;
  carrier: string;
  premiumFrequency: string;
  
  // Trust info
  trustName: string;
  trusteeName: string;
  trusteeEmail?: string;
  
  // Optional
  notes?: string;
}

export function generatePaymentReceipt(data: PaymentReceiptData) {
  const doc = new jsPDF();
  
  // Colors
  const primaryColor = '#1e40af'; // Blue-800
  const textColor = '#111827'; // Gray-900
  const lightGray = '#9ca3af'; // Gray-400
  
  // Header
  doc.setFillColor(31, 64, 175); // Blue-800
  doc.rect(0, 0, 210, 40, 'F');
  
  // Logo/Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PREMIUM PAYMENT RECEIPT', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Irrevocable Life Insurance Trust Administration', 105, 30, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(textColor);
  
  // Receipt Number and Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt #: ${data.paymentId.slice(0, 8).toUpperCase()}`, 20, 55);
  doc.text(`Date Issued: ${formatDate(new Date().toISOString())}`, 140, 55);
  
  // Divider
  doc.setDrawColor(lightGray);
  doc.line(20, 60, 190, 60);
  
  // Trust Information Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('TRUST INFORMATION', 20, 75);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor);
  
  doc.text('Trust Name:', 20, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(data.trustName, 50, 85);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Trustee:', 20, 92);
  doc.setFont('helvetica', 'bold');
  doc.text(data.trusteeName, 50, 92);
  
  // Policy Information Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('POLICY INFORMATION', 20, 110);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor);
  
  doc.text('Insurance Carrier:', 20, 120);
  doc.setFont('helvetica', 'bold');
  doc.text(data.carrier, 60, 120);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Policy Number:', 20, 127);
  doc.setFont('helvetica', 'bold');
  doc.text(data.policyNumber, 60, 127);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Premium Frequency:', 20, 134);
  doc.setFont('helvetica', 'bold');
  doc.text(data.premiumFrequency.charAt(0).toUpperCase() + data.premiumFrequency.slice(1), 60, 134);
  
  // Payment Details Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('PAYMENT DETAILS', 20, 152);
  
  // Payment box
  doc.setFillColor(248, 250, 252); // Gray-50
  doc.rect(20, 158, 170, 40, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor);
  
  doc.text('Payment Date:', 30, 170);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(data.paymentDate), 70, 170);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Method:', 30, 178);
  doc.setFont('helvetica', 'bold');
  doc.text(data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1), 70, 178);
  
  if (data.checkNumber) {
    doc.setFont('helvetica', 'normal');
    doc.text('Check Number:', 30, 186);
    doc.setFont('helvetica', 'bold');
    doc.text(data.checkNumber, 70, 186);
  }
  
  // Amount
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid:', 120, 170);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text(formatCurrency(data.amount), 120, 180);
  
  // Notes section (if any)
  if (data.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor);
    doc.text('Notes:', 20, 210);
    doc.setFont('helvetica', 'italic');
    const lines = doc.splitTextToSize(data.notes, 170);
    doc.text(lines, 20, 217);
  }
  
  // Tax Notice
  const yPosition = data.notes ? 240 : 220;
  doc.setFillColor(255, 251, 235); // Yellow-50
  doc.rect(20, yPosition, 170, 25, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor);
  doc.text('TAX NOTICE:', 25, yPosition + 8);
  doc.setFont('helvetica', 'normal');
  doc.text('This receipt confirms payment of life insurance premiums for the trust-owned policy.', 25, yPosition + 15);
  doc.text('Consult your tax advisor regarding the tax treatment of premium payments.', 25, yPosition + 21);
  
  // Footer
  doc.setTextColor(lightGray);
  doc.setFontSize(8);
  doc.text('This is an electronically generated receipt.', 105, 280, { align: 'center' });
  doc.text('For questions, please contact your trust administrator.', 105, 285, { align: 'center' });
  
  // Return the PDF
  return doc;
}

// Helper function to download the PDF
export function downloadPaymentReceipt(data: PaymentReceiptData) {
  const doc = generatePaymentReceipt(data);
  const filename = `receipt-${data.policyNumber}-${data.paymentDate}.pdf`;
  doc.save(filename);
}

// Helper function to get PDF as blob (for emailing)
export function getPaymentReceiptBlob(data: PaymentReceiptData): Blob {
  const doc = generatePaymentReceipt(data);
  return doc.output('blob');
}

// Helper function to open PDF in new tab
export function openPaymentReceipt(data: PaymentReceiptData) {
  const doc = generatePaymentReceipt(data);
  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl, '_blank');
}