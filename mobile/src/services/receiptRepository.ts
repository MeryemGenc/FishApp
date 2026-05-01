import { supabase } from '../lib/supabase';
import type { ParsedReceipt } from './receiptParser';

export type SavedReceipt = {
  id: string;
  image_url: string | null;
  merchant: string | null;
  total_amount: number | null;
  date: string | null;
  created_at: string;
};

type SaveReceiptInput = {
  userId: string;
  imageUrl: string | null;
  parsedReceipt: ParsedReceipt;
};

export async function saveReceipt({ userId, imageUrl, parsedReceipt }: SaveReceiptInput) {
  if (!supabase) {
    throw new Error('Supabase env bilgileri eklenmeden DB kaydi calismaz.');
  }

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      image_url: imageUrl,
      raw_text: parsedReceipt.rawText,
      total_amount: parsedReceipt.totalAmount,
      date: parsedReceipt.date,
      merchant: parsedReceipt.merchant,
    })
    .select('id, image_url, merchant, total_amount, date, created_at')
    .single<SavedReceipt>();

  if (error) {
    throw error;
  }

  return data;
}
