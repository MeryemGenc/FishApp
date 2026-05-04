import { KNOWN_MERCHANTS } from './receiptMerchants';

export type ParsedReceipt = {
  merchant: string | null;
  totalAmount: number | null;
  taxAmount: number | null;
  taxRate: number | null;
  taxBreakdown: TaxBreakdownItem[];
  date: string | null;
  category: string | null;
  confidence: number | null;
  rawText: string;
};

export type TaxBreakdownItem = {
  rate: number;
  amount: number | null;
  totalWithTax: number | null;
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

function includesKeyword(value: string, keyword: string) {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^A-Z0-9])${escapedKeyword}([^A-Z0-9]|$)`).test(value);
}

function normalizeAmount(amountText: string) {
  const cleanedAmount = amountText.replace(/[*#\s]/g, '');

  if (!cleanedAmount.includes(',') && !cleanedAmount.includes('.')) {
    return Number(cleanedAmount);
  }

  const lastCommaIndex = cleanedAmount.lastIndexOf(',');
  const lastDotIndex = cleanedAmount.lastIndexOf('.');
  const decimalSeparator = lastCommaIndex > lastDotIndex ? ',' : '.';
  const decimalSeparatorIndex = cleanedAmount.lastIndexOf(decimalSeparator);
  const integerPart = cleanedAmount.slice(0, decimalSeparatorIndex).replace(/[.,]/g, '');
  const decimalPart = cleanedAmount.slice(decimalSeparatorIndex + 1);

  return Number(`${integerPart}.${decimalPart}`);
}

function isValidTaxRate(rate: number) {
  return [1, 8, 10, 18, 20].includes(rate);
}

function parseTaxRateText(rateText: string) {
  const normalizedRate = Number(rateText.replace(',', '.'));

  if (!Number.isFinite(normalizedRate)) {
    return null;
  }

  const roundedRate = Number(normalizedRate.toFixed(2));
  return isValidTaxRate(roundedRate) ? roundedRate : null;
}

function getTaxRatesFromLine(line: string) {
  const normalizedLine = normalizeText(line);

  if (/GUVEN|SKOR|Z\s*NO/.test(normalizedLine)) {
    return [];
  }

  return [...line.matchAll(/%\s*(\d{1,2}(?:[.,]\d{1,2})?)/g)]
    .map((match) => parseTaxRateText(match[1]))
    .filter((rate): rate is number => rate !== null);
}

function parseMerchant(rawText: string) {
  const normalizedText = normalizeText(rawText);
  const knownMerchant = KNOWN_MERCHANTS.find(({ keywords }) =>
    keywords.some((keyword) => includesKeyword(normalizedText, normalizeText(keyword))),
  );

  if (knownMerchant) {
    return knownMerchant.merchant;
  }

  const lines = getLines(rawText);
  const ignoredLinePattern = /^(fis|fiş|fatura|tarih|saat|tel|telefon|sube|şube|no|www|http|mersis|vergi|kasiyer|pos|kdv)\b/i;
  const merchantLine = lines.find((line) => line.length >= 3 && !ignoredLinePattern.test(line));

  return merchantLine ?? null;
}

function parseTaxAmount(rawText: string) {
  const amountPattern = /([*#]?\s*(?:\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|\d{1,6}[.,]\d{2}))/g;
  const lines = getLines(rawText);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalizedLine = normalizeText(line);
    const isTaxTotalLine = /TOPLAM\s+KDV|TOP\s*KDV|TOPKDV|KDV\s*TUTAR|^KDV[:\s]*$|^KDV[:\s]/.test(normalizedLine);
    const isTaxHeaderLine = /KDV\s+ORANI|KDV\s+DAHIL|KDV\s+MATRAH/.test(normalizedLine);

    if (!isTaxTotalLine || isTaxHeaderLine) {
      continue;
    }

    const sameLineAmountText = [...line.matchAll(amountPattern)].map((match) => match[1]).at(-1);
    const nextAmountLine = lines.slice(index + 1, index + 4).find((windowLine) => {
      const normalizedWindowLine = normalizeText(windowLine);
      return (
        !/KDV\s+ORANI|KDV\s+DAHIL|KDV\s+MATRAH/.test(normalizedWindowLine) &&
        [...windowLine.matchAll(amountPattern)].length > 0
      );
    });
    const amountText = sameLineAmountText ?? [...(nextAmountLine ?? '').matchAll(amountPattern)].map((match) => match[1]).at(-1);

    if (!amountText) {
      continue;
    }

    const amount = normalizeAmount(amountText);

    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  return null;
}

function parseTaxBreakdown(rawText: string, taxAmount: number | null): TaxBreakdownItem[] {
  const amountPattern = /([*#]?\s*(?:\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|\d{1,6}[.,]\d{2}))/g;
  const lines = getLines(rawText);
  const knownRates = new Set<number>();
  const breakdown: TaxBreakdownItem[] = [];

  lines.forEach((line) => {
    getTaxRatesFromLine(line).forEach((rate) => knownRates.add(rate));
  });

  lines.forEach((line, index) => {
    const normalizedLine = normalizeText(line);

    if (!/KDV\s+ORANI/.test(normalizedLine)) {
      return;
    }

    const rate = lines.slice(index, index + 4).flatMap(getTaxRatesFromLine)[0];
    const amountTexts = lines
      .slice(index, index + 8)
      .flatMap((windowLine) => [...windowLine.matchAll(amountPattern)].map((match) => match[1]));
    const amounts = amountTexts.map(normalizeAmount).filter((amount) => Number.isFinite(amount));

    if (rate) {
      breakdown.push({
        rate,
        totalWithTax: amounts[0] ?? null,
        amount: amounts.at(-1) ?? taxAmount,
      });
    }
  });

  if (breakdown.length > 0) {
    return breakdown;
  }

  if (knownRates.size === 1) {
    return [{ rate: [...knownRates][0], amount: taxAmount, totalWithTax: null }];
  }

  return [...knownRates].map((rate) => ({ rate, amount: null, totalWithTax: null }));
}

function parseTaxRate(taxBreakdown: TaxBreakdownItem[]) {
  if (taxBreakdown.length === 0) {
    return null;
  }

  const ratesWithKnownAmount = taxBreakdown.filter((item) => item.amount !== null);

  if (ratesWithKnownAmount.length === 1) {
    return ratesWithKnownAmount[0].rate;
  }

  const uniqueRates = new Set(taxBreakdown.map((item) => item.rate));
  return uniqueRates.size === 1 ? [...uniqueRates][0] : null;
}

function parseTotalAmount(rawText: string) {
  const amountPattern = /([*#]?\s*(?:\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|\d{1,6}[.,]\d{2}))/g;
  const lines = getLines(rawText);
  const candidates: Array<{ amount: number; score: number }> = [];

  lines.forEach((line, index) => {
    const normalizedLine = normalizeText(line);
    const isTaxLine = /KDV|TOPKDV/.test(normalizedLine);
    const isUnitPriceLine = /TL\s*\/\s*KG|TL\/KG/.test(normalizedLine);
    const isStrongTotalLine = /ODENECEK|ODEME|GENEL\s+TOPLAM|TOPLAM|NAKIT|KREDI\s+KARTI|TUTAR/.test(
      normalizedLine,
    );

    if (!isStrongTotalLine || isUnitPriceLine || (isTaxLine && !/ODENECEK/.test(normalizedLine))) {
      return;
    }

    const windowLines = lines.slice(index, index + 3);
    const windowAmounts = windowLines.flatMap((windowLine, windowIndex) =>
      [...windowLine.matchAll(amountPattern)].map((match) => ({
        amount: normalizeAmount(match[1]),
        windowIndex,
      })),
    );

    const validWindowAmounts = windowAmounts.filter(({ amount }) => Number.isFinite(amount));
    const bestWindowAmount = validWindowAmounts.sort(
      (left, right) => right.amount - left.amount || left.windowIndex - right.windowIndex,
    )[0];

    if (!bestWindowAmount) {
      return;
    }

    const labelScore = /ODENECEK|ODEME|GENEL\s+TOPLAM|TOPLAM/.test(normalizedLine) ? 100 : 80;
    candidates.push({
      amount: bestWindowAmount.amount,
      score: labelScore - bestWindowAmount.windowIndex * 4 + index / lines.length,
    });
  });

  const bestCandidate = candidates
    .sort((left, right) => right.score - left.score || right.amount - left.amount)
    .at(0);

  if (bestCandidate) {
    return bestCandidate.amount;
  }

  const totalLine = getLines(rawText)
    .reverse()
    .find((line) => /(?:GENEL\s+)?TOPLAM|ODENECEK|ÖDENECEK|TUTAR/i.test(line));
  const totalLineAmountMatch = totalLine?.match(amountPattern);
  const totalLineAmountText = totalLineAmountMatch?.at(-1);
  const totalInlineMatch = rawText.match(
    /(?:GENEL\s+)?TOPLAM[:\s]*(?:TL\s*)?([*#]?\s*(?:\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|\d{1,6}[.,]\d{2}))/i,
  );
  const fallbackAmountMatches = [
    ...rawText.matchAll(/([*#]?\s*(?:\d{1,3}(?:[.,]\d{3})+[.,]\d{2}|\d{1,6}[.,]\d{2}))\s*TL/gi),
  ];
  const amountText = totalLineAmountText ?? totalInlineMatch?.[1] ?? fallbackAmountMatches.at(-1)?.[1];

  if (!amountText) {
    return null;
  }

  const amount = normalizeAmount(amountText);
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
  const taxAmount = parseTaxAmount(rawText);
  const taxBreakdown = parseTaxBreakdown(rawText, taxAmount);

  return {
    merchant: parseMerchant(rawText),
    totalAmount: parseTotalAmount(rawText),
    taxAmount,
    taxRate: parseTaxRate(taxBreakdown),
    taxBreakdown,
    date: parseDate(rawText),
    category: null,
    confidence: null,
    rawText,
  };
}
