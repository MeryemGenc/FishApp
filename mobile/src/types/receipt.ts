export type Receipt = {
  id: string;
  user_id: string;
  image_url: string | null;
  raw_text: string | null;
  total_amount: number | null;
  tax_amount: number | null;
  tax_rate: number | null;
  tax_breakdown: Array<{
    rate: number;
    amount: number | null;
    totalWithTax: number | null;
  }> | null;
  date: string | null;
  merchant: string | null;
  category: string | null;
  confidence: number | null;
  created_at: string;
};
