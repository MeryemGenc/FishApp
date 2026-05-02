export type Receipt = {
  id: string;
  user_id: string;
  image_url: string | null;
  raw_text: string | null;
  total_amount: number | null;
  date: string | null;
  merchant: string | null;
  category: string | null;
  confidence: number | null;
  created_at: string;
};
