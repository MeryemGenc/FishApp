export type ParsedReceipt = {
  merchant: string | null;
  totalAmount: number | null;
  date: string | null;
  rawText: string;
};

function getLines(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseMerchant(rawText: string) {
  return getLines(rawText)[0] ?? null;
}

function parseTotalAmount(rawText: string) {
  const totalLineMatch = rawText.match(/(?:GENEL\s+)?TOPLAM[:\s]*(?:TL\s*)?(\d+(?:[.,]\d{2})?)/i);
  const fallbackAmountMatches = [...rawText.matchAll(/(\d+(?:[.,]\d{2}))\s*TL/gi)];
  const amountText = totalLineMatch?.[1] ?? fallbackAmountMatches.at(-1)?.[1];

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
    rawText,
  };
}
