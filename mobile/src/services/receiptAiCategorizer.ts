import { supabase } from '../lib/supabase';
import type { ParsedReceipt } from './receiptParser';

type AiCategoryResponse = {
  category?: string;
  confidence?: number;
  provider?: string;
  reason?: string;
};

const AI_FALLBACK_CONFIDENCE = 0.4;

export async function categorizeReceiptWithAiFallback(receipt: ParsedReceipt): Promise<ParsedReceipt> {
  if (!supabase) {
    return receipt;
  }

  try {
    const { data, error } = await supabase.functions.invoke<AiCategoryResponse>('categorize-receipt', {
      body: {
        merchant: receipt.merchant,
        rawText: receipt.rawText,
      },
    });

    if (error) {
      console.warn('AI category fallback failed.', error);
      return receipt;
    }

    const category = data?.category?.trim();

    if (!category) {
      return receipt;
    }

    return {
      ...receipt,
      category,
      confidence:
        typeof data?.confidence === 'number' && Number.isFinite(data.confidence)
          ? data.confidence
          : AI_FALLBACK_CONFIDENCE,
    };
  } catch (error) {
    console.warn('AI category fallback failed.', error);
    return receipt;
  }
}
