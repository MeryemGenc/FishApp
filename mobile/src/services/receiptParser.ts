export type ParsedReceipt = {
  merchant: string | null;
  totalAmount: number | null;
  date: string | null;
  category: string | null;
  confidence: number | null;
  rawText: string;
};

function getLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeText(value: string) {
  return value
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseMerchant(rawText: string) {
  const normalizedText = normalizeText(rawText);
  const knownMerchants = [
    { keyword: 'MIGROS', merchant: 'MIGROS' },
    { keyword: 'SOK', merchant: 'SOK MARKET' },
    { keyword: 'A101', merchant: 'A101' },
    { keyword: 'STARBUCKS', merchant: 'STARBUCKS' },
    { keyword: 'UBER', merchant: 'UBER' },
  ];
  const knownMerchant = knownMerchants.find(({ keyword }) => normalizedText.includes(keyword));

  if (knownMerchant) {
    return knownMerchant.merchant;
  }

  const lines = getLines(rawText);
  const ignoredLinePattern = /^(fis|fiş|fatura|tarih|saat|tel|telefon|sube|şube|no|www|http|mersis|vergi|kasiyer|pos|kdv)\b/i;
  const merchantLine = lines.find((line) => line.length >= 3 && !ignoredLinePattern.test(line));

  return merchantLine ?? null;
}

function parseTotalAmount(rawText: string) {
  const totalLine = getLines(rawText)
    .reverse()
    .find((line) => /(?:GENEL\s+)?TOPLAM|ODENECEK|ÖDENECEK|TUTAR/i.test(line));
  const totalLineAmountMatch = totalLine?.match(/(\d{1,6}(?:[.,]\d{2}))/g);
  const totalLineAmountText = totalLineAmountMatch?.at(-1);
  const totalInlineMatch = rawText.match(/(?:GENEL\s+)?TOPLAM[:\s]*(?:TL\s*)?(\d+(?:[.,]\d{2})?)/i);
  const fallbackAmountMatches = [...rawText.matchAll(/(\d{1,6}(?:[.,]\d{2}))\s*TL/gi)];
  const amountText = totalLineAmountText ?? totalInlineMatch?.[1] ?? fallbackAmountMatches.at(-1)?.[1];

  if (!amountText) {
    return null;
  }

  const amount = Number(amountText.replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
}

function parseDate(rawText: string) {
  const dateMatch = rawText.match(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/);

  if (!dateMatch) {
    return null;
  }

  const [, day, month, year] = dateMatch;
  return `${year}-${month}-${day}`;
}

export function parseReceipt(rawText: string): ParsedReceipt {
  return {
    merchant: parseMerchant(rawText),
    totalAmount: parseTotalAmount(rawText),
    date: parseDate(rawText),
    category: null,
    confidence: null,
    rawText,
  };
}
