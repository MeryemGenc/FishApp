import { supabase } from '../lib/supabase';

export type ReceiptOcrResult = {
  rawText: string;
  provider: 'mock' | 'edge-mock' | 'google-vision';
  reason?: string;
};

type ReceiptOcrInput = {
  imageUri: string;
  imageUrl?: string;
};

const MOCK_RECEIPT_TEXT = `SOK MARKET
TARIH: 12.04.2026
EKMEK 12.50 TL
SUT 38.75 TL
YUMURTA 78.90 TL
TOPLAM 130.15 TL`;

type EdgeOcrResponse = ReceiptOcrResult & {
  reason?: string;
};

async function extractReceiptTextWithEdgeFunction(imageUrl: string) {
  if (!supabase) {
    throw new Error('Supabase env bilgileri eklenmeden OCR function calismaz.');
  }

  const { data, error } = await supabase.functions.invoke<EdgeOcrResponse>('ocr-receipt', {
    body: { imageUrl },
  });

  if (error) {
    throw error;
  }

  if (!data?.rawText) {
    throw new Error('OCR function metin dondurmedi.');
  }

  return {
    rawText: data.rawText,
    provider: data.provider,
    reason: data.reason,
  };
}

export async function extractReceiptText({ imageUri, imageUrl }: ReceiptOcrInput): Promise<ReceiptOcrResult> {
  if (!imageUri && !imageUrl) {
    throw new Error('OCR icin fotograf bulunamadi.');
  }

  if (imageUrl) {
    try {
      return await extractReceiptTextWithEdgeFunction(imageUrl);
    } catch (error) {
      console.warn('OCR Edge Function failed. Falling back to mock OCR.', error);
    }
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 900);
  });

  return {
    rawText: MOCK_RECEIPT_TEXT,
    provider: 'mock',
  };
}
