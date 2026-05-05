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

export type UpdateReceiptInput = {
  id: string;
  userId: string;
  merchant: string | null;
  totalAmount: number;
  taxAmount: number | null;
  taxRate: number | null;
  date: string;
  category: string;
};

function normalizeOptionalText(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeRequiredText(value: string | null, fieldName: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new Error(`${fieldName} bos birakilamaz.`);
  }

  return trimmed;
}

function assertValidAmount(amount: number | null, fieldName: string) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldName} gecerli ve sifirdan buyuk olmali.`);
  }
}

function assertValidOptionalAmount(amount: number | null, fieldName: string) {
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
    throw new Error(`${fieldName} sifirdan kucuk olamaz.`);
  }
}

function assertValidOptionalRate(rate: number | null) {
  if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
    throw new Error('KDV orani 0 ile 100 arasinda olmali.');
  }
}

function normalizeTaxAmount(amount: number | null) {
  return amount ?? 0;
}

export async function saveReceipt({ userId, imageUrl, parsedReceipt }: SaveReceiptInput): Promise<SavedReceipt> {
  if (!supabase) {
    throw new Error('Supabase env bilgileri eklenmeden DB kaydi calismaz.');
  }

  assertValidAmount(parsedReceipt.totalAmount, 'Fis tutari');
  assertValidOptionalAmount(parsedReceipt.taxAmount, 'KDV tutari');
  assertValidOptionalRate(parsedReceipt.taxRate);

  const merchant = normalizeRequiredText(parsedReceipt.merchant, 'Magaza');
  const date = normalizeRequiredText(parsedReceipt.date, 'Tarih');
  const category = normalizeRequiredText(parsedReceipt.category, 'Kategori');

  if (!imageUrl && !parsedReceipt.rawText.trim()) {
    throw new Error('Bos fis kaydi olusturulamaz.');
  }

  const { data, error } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      image_url: imageUrl,
      raw_text: parsedReceipt.rawText,
      total_amount: parsedReceipt.totalAmount,
      tax_amount: normalizeTaxAmount(parsedReceipt.taxAmount),
      tax_rate: parsedReceipt.taxRate,
      tax_breakdown: parsedReceipt.taxBreakdown,
      date,
      merchant,
      category,
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

export async function updateReceipt(input: UpdateReceiptInput): Promise<SavedReceipt> {
  if (!supabase) {
    throw new Error('Supabase env bilgileri eklenmeden fis guncellenemez.');
  }

  assertValidAmount(input.totalAmount, 'Fis tutari');
  assertValidOptionalAmount(input.taxAmount, 'KDV tutari');
  assertValidOptionalRate(input.taxRate);

  const merchant = normalizeRequiredText(input.merchant, 'Magaza');
  const category = normalizeRequiredText(input.category, 'Kategori');
  const date = normalizeRequiredText(input.date, 'Tarih');

  const { data, error } = await supabase
    .from('receipts')
    .update({
      merchant,
      total_amount: input.totalAmount,
      tax_amount: normalizeTaxAmount(input.taxAmount),
      tax_rate: input.taxRate,
      date,
      category,
    })
    .eq('id', input.id)
    .eq('user_id', input.userId)
    .select('id, image_url, merchant, total_amount, tax_amount, tax_rate, tax_breakdown, date, category, confidence, created_at')
    .single<SavedReceipt>();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new Error('Fis guncellendi ancak Supabase kayit ID degeri donmedi.');
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
