import React from 'react';

interface GiftScheduleDisplayProps {
  initialSeedGift?: string | null;
  annualGiftAmount?: string | null;
  perBeneficiaryAmount?: string | null;
  grantorNetWorth?: string | null;
  giftSchedule?: Array<{year: string, amount: string}>;
}

export const GiftScheduleDisplay: React.FC<GiftScheduleDisplayProps> = ({
  initialSeedGift,
  annualGiftAmount,
  perBeneficiaryAmount,
  grantorNetWorth,
  giftSchedule
}) => {
  const formatAmount = (amount?: string | null): string => {
    if (!amount) return '$0';
    // Remove $ and commas, then convert to number
    const cleanAmount = amount.toString().replace(/[$,]/g, '');
    const num = Number(cleanAmount);
    return isNaN(num) ? '$0' : `$${num.toLocaleString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="border-t pt-4">
        <h3 className="font-semibold text-lg mb-3">Gift Funding Structure</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Initial Seed Gift:</p>
            <p className="font-medium">{formatAmount(initialSeedGift)}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Annual Gift Amount:</p>
            <p className="font-medium">{formatAmount(annualGiftAmount)}</p>
          </div>
        </div>

        {giftSchedule && giftSchedule.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Multi-Year Schedule:</p>
            <div className="bg-gray-50 rounded p-3 space-y-1">
              {giftSchedule.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.year}:</span>
                  <span className="font-medium">{formatAmount(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
