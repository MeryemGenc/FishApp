import { supabase } from '../lib/supabase';
import type { ParsedReceipt } from './receiptParser';

export type SavedReceipt = {
  id: string;
  image_url: string | null;
  merchant: string | null;
  total_amount: number | null;
  date: string | null;
  category: string | null;
  confidence: number | null;
  created_at: string;
};

export type ReceiptListItem = Pick<
  SavedReceipt,
  'id' | 'image_url' | 'merchant' | 'total_amount' | 'date' | 'category' | 'confidence' | 'created_at'
>;

type SaveReceiptInput = {
  userId: string;
  imageUrl: string | null;
  parsedReceipt: ParsedReceipt;
};

export async function saveReceipt({ userId, imageUrl, parsedReceipt }: SaveReceiptInput): Promise<SavedReceipt> {
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
      category: parsedReceipt.category,
      confidence: parsedReceipt.confidence,
    })
    .select('id, image_url, merchant, total_amount, date, category, confidence, created_at')
    .single<SavedReceipt>();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error('Fis kaydedildi ancak Supabase kayit ID degeri donmedi.');
  }

  return data;
}

export async function listReceipts(userId: string): Promise<ReceiptListItem[]> {
  if (!supabase) {
    throw new Error('Supabase env bilgileri eklenmeden fis listesi calismaz.');
  }

  const { data, error } = await supabase
    .from('receipts')
    .select('id, image_url, merchant, total_amount, date, category, confidence, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<ReceiptListItem[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}
