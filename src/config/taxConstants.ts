// Gift Tax Annual Exclusion Amounts
// These are the IRS annual gift tax exclusion limits per donor per beneficiary

export const ANNUAL_GIFT_EXCLUSION: Record<number, number> = {
  2023: 17000,
  2024: 18000,
  2025: 19000,
  2026: 19000, // projected
};

/**
 * Get the annual gift tax exclusion amount for a given year
 * @param year - The tax year
 * @returns The annual exclusion amount for that year, or 2024 default if year not found
 */
export const getAnnualExclusion = (year: number): number => {
  return ANNUAL_GIFT_EXCLUSION[year] || ANNUAL_GIFT_EXCLUSION[2024];
};
