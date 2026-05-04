import { supabase } from '../lib/supabase';
import type { ParsedReceipt } from './receiptParser';

export type SavedReceipt = {
  id: string;
  image_url: string | null;
  merchant: string | null;
  total_amount: number | null;
  tax_amount: number | null;
  tax_rate: number | null;
  tax_breakdown: ParsedReceipt['taxBreakdown'] | null;
  date: string | null;
  category: string | null;
  confidence: number | null;
  created_at: string;
};

export type ReceiptListItem = Pick<
  SavedReceipt,
  | 'id'
  | 'image_url'
  | 'merchant'
  | 'total_amount'
  | 'tax_amount'
  | 'tax_rate'
  | 'tax_breakdown'
  | 'date'
  | 'category'
  | 'confidence'
  | 'created_at'
>;

export type SpendingTotals = Record<string, number>;
export type SpendingCounts = Record<string, number>;

export type MonthlySpendingSummary = {
  user_id: string;
  year: number;
  month: number;
  total_amount: number;
  receipt_count: number;
  category_totals: SpendingTotals;
  category_counts: SpendingCounts;
  updated_at: string;
};

export type YearlySpendingSummary = {
  user_id: string;
  year: number;
  total_amount: number;
  receipt_count: number;
  category_totals: SpendingTotals;
  category_counts: SpendingCounts;
  monthly_totals: SpendingTotals;
  updated_at: string;
};

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
      tax_amount: parsedReceipt.taxAmount,
      tax_rate: parsedReceipt.taxRate,
      tax_breakdown: parsedReceipt.taxBreakdown,
      date: parsedReceipt.date,
      merchant: parsedReceipt.merchant,
      category: parsedReceipt.category,
      confidence: parsedReceipt.confidence,
    })
    .select('id, image_url, merchant, total_amount, tax_amount, tax_rate, tax_breakdown, date, category, confidence, created_at')
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
    .select('id, image_url, merchant, total_amount, tax_amount, tax_rate, tax_breakdown, date, category, confidence, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<ReceiptListItem[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMonthlySpendingSummary(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlySpendingSummary | null> {
  if (!supabase) {
    throw new Error('Supabase env bilgileri eklenmeden aylik analiz calismaz.');
  }

  const { data, error } = await supabase
    .from('monthly_summaries')
    .select('user_id, year, month, total_amount, receipt_count, category_totals, category_counts, updated_at')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle<MonthlySpendingSummary>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function getYearlySpendingSummary(
  userId: string,
  year: number,
): Promise<YearlySpendingSummary | null> {
  if (!supabase) {
    throw new Error('Supabase env bilgileri eklenmeden yillik analiz calismaz.');
  }

  const { data, error } = await supabase
    .from('yearly_summaries')
    .select('user_id, year, total_amount, receipt_count, category_totals, category_counts, monthly_totals, updated_at')
    .eq('user_id', userId)
    .eq('year', year)
    .maybeSingle<YearlySpendingSummary>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function refreshSpendingSummaries(userId: string, receiptDate: string | null): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase env bilgileri eklenmeden analiz guncellenemez.');
  }

  const summaryDate = receiptDate ? new Date(`${receiptDate}T00:00:00`) : new Date();
  const year = summaryDate.getFullYear();
  const month = summaryDate.getMonth() + 1;

  const { error } = await supabase.rpc('refresh_spending_summaries', {
    p_user_id: userId,
    p_year: year,
    p_month: month,
  });

  if (error) {
    throw error;
  }
}
