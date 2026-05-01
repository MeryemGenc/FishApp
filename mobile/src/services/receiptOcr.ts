export type ReceiptOcrResult = {
  rawText: string;
  provider: 'mock' | 'google-vision';
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

export async function extractReceiptText({ imageUri, imageUrl }: ReceiptOcrInput): Promise<ReceiptOcrResult> {
  if (!imageUri && !imageUrl) {
    throw new Error('OCR icin fotograf bulunamadi.');
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 900);
  });

  return {
    rawText: MOCK_RECEIPT_TEXT,
    provider: 'mock',
  };
}
