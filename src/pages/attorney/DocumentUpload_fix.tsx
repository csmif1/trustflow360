// Add this to the extraction results display section
// This shows ALL the extracted data including trustee, beneficiaries, gift schedule

{extractedData.trusteeName && (
  <div>
    <Label className="text-sm text-slate-600">Trustee</Label>
    <p className="font-medium">{extractedData.trusteeName}</p>
  </div>
)}

{extractedData.beneficiaries && extractedData.beneficiaries.length > 0 && (
  <div>
    <Label className="text-sm text-slate-600">Beneficiaries</Label>
    <p className="font-medium">{extractedData.beneficiaries.join(', ')}</p>
  </div>
)}

{extractedData.initialSeedGift && (
  <div>
    <Label className="text-sm text-slate-600">Initial Seed Gift</Label>
    <p className="font-medium">${parseInt(extractedData.initialSeedGift).toLocaleString()}</p>
  </div>
)}

{extractedData.annualGiftAmount && (
  <div>
    <Label className="text-sm text-slate-600">Annual Gift Amount</Label>
    <p className="font-medium">${parseInt(extractedData.annualGiftAmount).toLocaleString()}</p>
  </div>
)}

{extractedData.giftSchedule && extractedData.giftSchedule.length > 0 && (
  <div className="col-span-2">
    <Label className="text-sm text-slate-600">Gift Schedule</Label>
    <div className="mt-2 space-y-1">
      {extractedData.giftSchedule.map((item, idx) => (
        <div key={idx} className="flex justify-between text-sm">
          <span>Year {item.year}:</span>
          <span className="font-medium">${parseInt(item.amount).toLocaleString()}</span>
        </div>
      ))}
    </div>
  </div>
)}
