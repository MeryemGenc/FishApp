import type { ParsedReceipt } from './receiptParser';

type CategoryRule = {
  keywords: string[];
  category: string;
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    keywords: ['MIGROS', 'MIGROS TICARET'],
    category: 'Market',
  },
  {
    keywords: ['SOK', 'SOK MARKET'],
    category: 'Market',
  },
  {
    keywords: ['A101', 'A 101'],
    category: 'Market',
  },
  {
    keywords: ['STARBUCKS'],
    category: 'Food',
  },
  {
    keywords: ['UBER'],
    category: 'Transport',
  },
];

function normalizeText(value: string) {
  return value
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function categorizeReceipt(receipt: ParsedReceipt): ParsedReceipt {
  const normalizedMerchant = normalizeText(receipt.merchant ?? '');

  const match = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedMerchant.includes(normalizeText(keyword))),
  );

  if (!match) {
    return {
      ...receipt,
      category: 'Other',
      confidence: 0.4,
    };
  }

  return {
    ...receipt,
    category: match.category,
    confidence: 0.9,
  };
}
